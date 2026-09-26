import "server-only";
import { sendTemplate } from "@/lib/email";
import { formatVND } from "@/lib/format";
import { donationFormSchema, normalizeContact, type DonationFormInput } from "@/lib/donations/schema";
import { getSettings } from "@/lib/settings";
import { syncSheetsLater } from "@/lib/sheets";
import { createServiceClient } from "@/lib/supabase/server";
import { isBankConfigured } from "@/lib/vietqr";
import type { ActionResult } from "@/types/action";
import type { Donation, DonationStatus } from "@/types/db";

// FR08 donations and FR18 staff handling. Status: PENDING → CONFIRMED | CANCELLED (SRS §5).
// Every write here syncs Google Sheets afterwards (FR23).

/** FR08: saves a PENDING donation. The amount minimum comes from settings (BR08). */
export async function createDonation(input: DonationFormInput): Promise<ActionResult<{ code: string; token: string }>> {
  const settings = await getSettings();
  if (!isBankConfigured(settings.bank_fund)) {
    return { ok: false, error: "Ban tổ chức chưa mở tài khoản nhận quyên góp. Vui lòng quay lại sau." };
  }
  const parsed = donationFormSchema(settings.donation_min).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { display_name, contact, amount, message, is_public } = parsed.data;

  const { data, error } = await createServiceClient()
    .from("donations")
    .insert({ display_name, contact, amount, message, is_public })
    .select("code, access_token")
    .single<Pick<Donation, "code" | "access_token">>();
  if (error || !data) {
    console.error("[donations] insert failed", error?.message);
    return { ok: false, error: "Không tạo được khoản quyên góp. Vui lòng thử lại." };
  }
  syncSheetsLater();
  return { ok: true, data: { code: data.code, token: data.access_token } };
}

/** Staff "Đã nhận tiền" / "Hủy". Only a PENDING donation can change (checked in the update). */
export async function decideDonation(
  id: string,
  to: Exclude<DonationStatus, "PENDING">,
  userId: string,
): Promise<ActionResult<{ code: string }>> {
  const patch =
    to === "CONFIRMED"
      ? { status: to, confirmed_by: userId, confirmed_at: new Date().toISOString() }
      : { status: to };
  const { data, error } = await createServiceClient()
    .from("donations")
    .update(patch)
    .eq("id", id)
    .eq("status", "PENDING")
    .select("code");
  if (error) {
    console.error("[donations] update status", error.message);
    return { ok: false, error: "Không cập nhật được khoản quyên góp" };
  }
  if (!data?.length) return { ok: false, error: "Khoản quyên góp không còn ở trạng thái chờ xác nhận. Vui lòng tải lại trang." };
  syncSheetsLater();
  return { ok: true, data: { code: data[0].code } };
}

/** FR18: Admin hides/shows one donation on the donor wall. Its money still counts in the total. */
export async function setDonationHidden(id: string, hidden: boolean): Promise<ActionResult> {
  const { data, error } = await createServiceClient().from("donations").update({ is_hidden: hidden }).eq("id", id).select("id");
  if (error) {
    console.error("[donations] update hidden", error.message);
    return { ok: false, error: "Không cập nhật được khoản quyên góp" };
  }
  if (!data?.length) return { ok: false, error: "Không tìm thấy khoản quyên góp" };
  syncSheetsLater();
  return { ok: true, data: undefined };
}

/** FR24 DONATION_CONFIRMED. Donors who left a phone number instead of an email get no email. Never throws. */
export async function notifyDonationConfirmed(id: string): Promise<void> {
  try {
    const { data } = await createServiceClient()
      .from("donations")
      .select("code, display_name, contact, amount")
      .eq("id", id)
      .maybeSingle<Pick<Donation, "code" | "display_name" | "contact" | "amount">>();
    const contact = data && normalizeContact(data.contact);
    if (!data || contact?.kind !== "email") return;
    const amount = formatVND(data.amount);
    await sendTemplate(
      "DONATION_CONFIRMED",
      contact.value,
      { ten_nguoi_quyen_gop: data.display_name, so_tien_quyen_gop: amount, ma_quyen_gop: data.code },
      { kind: "donation", code: data.code, amount },
    );
  } catch (err) {
    console.error("[donations] confirmation email failed", err);
  }
}
