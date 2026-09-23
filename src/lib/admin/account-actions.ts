"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { OK, fail, readForm, requiredText } from "@/lib/admin/form";
import type { ActionResult } from "@/types/action";
import type { UserRole } from "@/types/db";

// FR20: account management (Admin only). An admin cannot demote or disable themselves,
// so there is always at least one active admin.

const roleSchema = z.enum(["ADMIN", "STAFF"], { error: "Vai trò không hợp lệ" });
const passwordSchema = z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự").max(72, "Mật khẩu tối đa 72 ký tự");

const createSchema = z.object({
  email: z.email("Email không hợp lệ").transform((v) => v.trim().toLowerCase()),
  full_name: requiredText(100, "Họ tên"),
  role: roleSchema,
  password: passwordSchema,
});

function refresh() {
  revalidatePath("/admin/tai-khoan");
}

export async function createAccount(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = createSchema.safeParse(readForm(formData, ["email", "full_name", "role", "password"]));
  if (!parsed.success) return fail(parsed.error);
  const { email, full_name, role, password } = parsed.data;

  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    const taken = error?.code === "email_exists" || /already/i.test(error?.message ?? "");
    return fail(taken ? "Email này đã có tài khoản" : "Không tạo được tài khoản. Vui lòng thử lại");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: data.user.id, full_name, role, is_active: true });
  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    return fail("Không tạo được tài khoản. Vui lòng thử lại");
  }

  refresh();
  return OK;
}

export async function updateAccountRole(id: string, role: UserRole): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return fail(parsed.error);
  if (id === admin.userId) return fail("Bạn không thể tự đổi vai trò của mình");

  const { error } = await createServiceClient().from("profiles").update({ role: parsed.data }).eq("id", id);
  if (error) return fail("Không đổi được vai trò. Vui lòng thử lại");

  refresh();
  return OK;
}

/** Disabled accounts are rejected at login and by requireRole() on every request. */
export async function setAccountActive(id: string, isActive: boolean): Promise<ActionResult> {
  const admin = await requireRole(["ADMIN"]);
  if (id === admin.userId) return fail("Bạn không thể tự vô hiệu hóa tài khoản của mình");

  const { error } = await createServiceClient()
    .from("profiles")
    .update({ is_active: isActive === true })
    .eq("id", id);
  if (error) return fail("Không cập nhật được tài khoản. Vui lòng thử lại");

  refresh();
  return OK;
}

export async function resetAccountPassword(
  id: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return fail(parsed.error);

  const { error } = await createServiceClient().auth.admin.updateUserById(id, { password: parsed.data });
  if (error) return fail("Không đặt lại được mật khẩu. Vui lòng thử lại");

  return OK;
}
