"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { siteUrl } from "@/lib/email";
import { phoneSchema } from "@/lib/orders/checkout-schema";
import { ensureCustomer, getCustomer, safeNext } from "@/lib/customers/session";
import { createSessionClient } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";

// FR26: buyer sign-up, sign-in (email/password or Google), sign-out and profile.

const callbackUrl = (next: string) => siteUrl(`/auth/callback?next=${encodeURIComponent(next)}`);

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Vui lòng nhập email")
  .max(200, "Email tối đa 200 ký tự")
  .pipe(z.email("Email không hợp lệ"));

const nameSchema = z.string().trim().min(2, "Vui lòng nhập họ tên").max(100, "Họ tên tối đa 100 ký tự");

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error?.code === "email_not_confirmed") {
    return { ok: false, error: "Email chưa được xác thực. Vui lòng bấm liên kết trong email chúng tôi đã gửi." };
  }
  if (error || !data.user) return { ok: false, error: "Email hoặc mật khẩu không đúng" };

  try {
    await ensureCustomer(data.user);
  } catch (err) {
    console.error("[customers] signIn", err);
    await supabase.auth.signOut();
    return { ok: false, error: "Không đăng nhập được. Vui lòng thử lại." };
  }
  redirect(safeNext(formData.get("next")));
}

const signUpSchema = z
  .object({
    full_name: nameSchema,
    phone: phoneSchema,
    email: emailSchema,
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự").max(72, "Mật khẩu tối đa 72 ký tự"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Mật khẩu xác nhận không khớp" });

export type SignUpResult = ActionResult<{ email: string }>;

/** Email sign-up. The account works only after the link in the confirmation email is clicked. */
export async function signUp(_prev: SignUpResult | null, formData: FormData): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { email, password, full_name, phone } = parsed.data;

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl(safeNext(formData.get("next"))),
      data: { full_name, phone },
    },
  });
  if (error) {
    console.error("[customers] signUp", error.code, error.message);
    if (error.code === "over_email_send_rate_limit") {
      return { ok: false, error: "Hệ thống đang gửi quá nhiều email. Vui lòng thử lại sau ít phút." };
    }
    if (error.code === "weak_password") return { ok: false, error: "Mật khẩu quá yếu. Vui lòng chọn mật khẩu khác." };
    return { ok: false, error: "Không đăng ký được. Vui lòng thử lại." };
  }
  // Supabase hides existing accounts by returning a user without identities.
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, error: "Email này đã được đăng ký. Vui lòng đăng nhập." };
  }
  return { ok: true, data: { email } };
}

/** Starts Google OAuth; Supabase sends the user back to /auth/callback. */
export async function signInWithGoogle(formData: FormData) {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(safeNext(formData.get("next"))) },
  });
  if (error || !data.url) {
    console.error("[customers] google", error?.message);
    redirect("/dang-nhap?loi=google");
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/");
}

const profileSchema = z.object({ full_name: nameSchema, phone: phoneSchema });

export async function updateProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await getCustomer();
  if (!session) return { ok: false, error: "Vui lòng đăng nhập lại" };
  const parsed = profileSchema.safeParse({ full_name: formData.get("full_name"), phone: formData.get("phone") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await createServiceClient().from("customers").update(parsed.data).eq("id", session.userId);
  if (error) {
    console.error("[customers] updateProfile", error.message);
    return { ok: false, error: "Không lưu được thông tin. Vui lòng thử lại." };
  }
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
