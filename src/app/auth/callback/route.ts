import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { ensureCustomer, safeNext } from "@/lib/customers/session";
import { createSessionClient } from "@/lib/supabase/auth";

// FR26: landing point for the sign-up confirmation email and Google sign-in.
// Two link styles are accepted:
// - `token_hash` + `type` (email template "{{ .SiteURL }}/auth/callback?token_hash=…"): works in any
//   browser or device. This is the recommended template.
// - `code` (Supabase's default template, PKCE): only works in the browser that signed up, because
//   the code verifier is a cookie there. Supabase has already confirmed the email at that point, so
//   a missing verifier just means "log in".
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  // "Quên mật khẩu" links come back here too (type=recovery, next=/dat-lai-mat-khau); a broken
  // one should offer a new link rather than a sign-in message.
  const recovery = params.get("type") === "recovery" || next.startsWith("/dat-lai-mat-khau");
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(recovery ? "/quen-mat-khau?loi=het-han" : `/dang-nhap?loi=${reason}`, request.url));

  if (params.get("error")) {
    console.error("[auth/callback]", params.get("error_code"), params.get("error_description"));
    return fail(params.get("error_code") === "otp_expired" ? "het-han" : "xac-thuc");
  }

  const supabase = await createSessionClient();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const { data, error } = tokenHash
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: (params.get("type") ?? "email") as EmailOtpType })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { data: { user: null }, error: new Error("missing code") };

  if (error || !data.user) {
    const errorCode = error && "code" in error ? String(error.code) : undefined;
    console.error("[auth/callback]", errorCode, error?.message);
    if (errorCode === "pkce_code_verifier_not_found") return fail("da-xac-thuc");
    if (errorCode === "otp_expired") return fail("het-han");
    return fail("xac-thuc");
  }

  try {
    await ensureCustomer(data.user);
  } catch (err) {
    console.error("[auth/callback]", err);
    await supabase.auth.signOut();
    return fail("tai-khoan");
  }
  return NextResponse.redirect(new URL(next, request.url));
}
