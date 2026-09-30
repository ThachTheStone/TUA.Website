"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { OK, fail } from "@/lib/admin/form";
import { decideDonation, notifyDonationConfirmed, setDonationHidden } from "@/lib/donations/service";
import { isSheetsConfigured, syncAll } from "@/lib/sheets";
import { requireRole } from "@/lib/supabase/auth";
import type { ActionResult } from "@/types/action";

// FR18 staff actions on donations, FR23 manual resync. Every action checks the role (hard rule 8).

const idSchema = z.uuid();

function refresh() {
  revalidatePath("/admin/quyen-gop");
  revalidatePath("/admin");
  revalidatePath("/quyen-gop");
  revalidatePath("/");
}

/** "Đã nhận tiền": PENDING → CONFIRMED, then the thank-you email (FR08, FR24). */
export async function confirmDonation(id: string): Promise<ActionResult> {
  const staff = await requireRole();
  if (!idSchema.safeParse(id).success) return fail("Khoản quyên góp không hợp lệ");
  const result = await decideDonation(id, "CONFIRMED", staff.userId);
  if (!result.ok) return result;
  after(() => notifyDonationConfirmed(id));
  refresh();
  return OK;
}

/** "Hủy": PENDING → CANCELLED (money never arrived). */
export async function cancelDonation(id: string): Promise<ActionResult> {
  const staff = await requireRole();
  if (!idSchema.safeParse(id).success) return fail("Khoản quyên góp không hợp lệ");
  const result = await decideDonation(id, "CANCELLED", staff.userId);
  if (!result.ok) return result;
  refresh();
  return OK;
}

/** FR18: only Admin hides an entry from the donor wall (or shows it again). */
export async function setDonationVisibility(id: string, hidden: boolean): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  if (!idSchema.safeParse(id).success || typeof hidden !== "boolean") return fail("Thao tác không hợp lệ");
  const result = await setDonationHidden(id, hidden);
  if (!result.ok) return result;
  refresh();
  return OK;
}

/** FR23 "Đồng bộ lại toàn bộ": runs the full Sheets sync now and reports the result. */
export async function resyncSheets(): Promise<ActionResult<{ orders: number; items: number; donations: number }>> {
  await requireRole();
  if (!isSheetsConfigured()) return fail("Chưa cấu hình Google Sheets. Xem GOOGLE_SHEETS_ID và tài khoản dịch vụ trong biến môi trường.");
  try {
    return { ok: true, data: await syncAll() };
  } catch (err) {
    console.error("[sheets] manual resync failed", err);
    return fail("Đồng bộ Google Sheets thất bại. Kiểm tra quyền chia sẻ bảng tính cho tài khoản dịch vụ rồi thử lại.");
  }
}
