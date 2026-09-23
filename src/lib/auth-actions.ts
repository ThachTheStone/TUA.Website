"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient, requireRole } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";

const loginSchema = z.object({
  email: z.email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

/** FR12: email/password login. Disabled or profile-less accounts are signed straight back out. */
export async function login(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { ok: false, error: "Email hoặc mật khẩu không đúng" };

  const { data: profile } = await createServiceClient()
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { ok: false, error: "Tài khoản không có quyền truy cập trang quản trị" };
  }
  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { ok: false, error: "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ Admin" };
  }

  redirect("/admin");
}

export async function logout() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
  });

/** FR12: change own password after re-checking the current one. */
export async function changePassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const staff = await requireRole();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createSessionClient();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: staff.email,
    password: parsed.data.currentPassword,
  });
  if (authError) return { ok: false, error: "Mật khẩu hiện tại không đúng" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) return { ok: false, error: "Không đổi được mật khẩu. Vui lòng thử lại" };

  return { ok: true, data: undefined };
}
