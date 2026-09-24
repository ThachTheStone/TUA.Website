"use server";

import { revalidatePath } from "next/cache";
import { OK, fail } from "@/lib/admin/form";
import { sendEmail } from "@/lib/email";
import { EMAIL_KEYS, TEMPLATES, renderEmail, sampleBlock, sampleVars, validateTemplate, type EmailKey } from "@/lib/email/templates";
import { getSettings } from "@/lib/settings";
import { requireRole } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isBankConfigured, vietQrUrl } from "@/lib/vietqr";
import type { ActionResult } from "@/types/action";

// FR30: email templates. Admin only (hard rule 8, SRS §10 #17).

const isKey = (key: string): key is EmailKey => (EMAIL_KEYS as readonly string[]).includes(key);

function refresh(key: EmailKey) {
  revalidatePath("/admin/mau-email");
  revalidatePath(`/admin/mau-email/${key}`);
}

function readTemplate(formData: FormData) {
  const text = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v.replace(/\r\n/g, "\n") : "";
  };
  return { subject: text("subject").trim(), body: text("body").trim(), is_enabled: formData.get("is_enabled") === "on" };
}

export async function saveEmailTemplate(key: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  if (!isKey(key)) return fail("Mẫu email không tồn tại");
  const t = readTemplate(formData);
  const problem = validateTemplate(key, t.subject, t.body);
  if (problem) return fail(problem);

  const { error } = await createServiceClient()
    .from("email_templates")
    .upsert({ key, ...t, updated_by: admin.userId, updated_at: new Date().toISOString() });
  if (error) {
    console.error("[email-templates] save", error.message);
    return fail("Không lưu được mẫu email. Vui lòng thử lại");
  }
  refresh(key);
  return OK;
}

/** Back to the text in code: the row is removed. */
export async function resetEmailTemplate(key: string): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  if (!isKey(key)) return fail("Mẫu email không tồn tại");
  const { error } = await createServiceClient().from("email_templates").delete().eq("key", key);
  if (error) return fail("Không khôi phục được mẫu mặc định");
  refresh(key);
  return OK;
}

/** Sends the text currently in the editor (saved or not), with sample data, to the admin. */
export async function sendTestEmail(key: string, input: { subject: string; body: string }): Promise<ActionResult<{ to: string }>> {
  const admin = await requireRole(["ADMIN"]);
  if (!isKey(key)) return fail("Mẫu email không tồn tại");
  const subject = String(input.subject ?? "").trim();
  const body = String(input.body ?? "").replace(/\r\n/g, "\n").trim();
  const problem = validateTemplate(key, subject, body);
  if (problem) return fail(problem);
  if (!admin.email) return fail("Tài khoản của bạn chưa có email");

  const settings = await getSettings();
  const vars = sampleVars();
  const qr = isBankConfigured(settings.bank_sales) ? vietQrUrl(settings.bank_sales, 129000, vars.ma_don!) : null;
  const email = renderEmail({ subject, body }, vars, sampleBlock(TEMPLATES[key].block, settings.bank_sales, qr));
  const sent = await sendEmail(admin.email, `[Gửi thử] ${email.subject}`, email.html);
  return sent ? { ok: true, data: { to: admin.email } } : fail("Không gửi được email. Kiểm tra GMAIL_USER và GMAIL_APP_PASSWORD");
}
