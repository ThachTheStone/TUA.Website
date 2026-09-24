import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { ensureCustomer, safeNext } from "@/lib/customers/session";
import { createSessionClient } from "@/lib/supabase/auth";

// FR26: landing point for the sign-up confirmation email and Google sign-in.
// Exchanges the one-time code for a session cookie, creates the customer row, then
// continues to `next`.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const fail = (reason: string) => NextResponse.redirect(new URL(`/dang-nhap?loi=${reason}`, request.url));

  if (params.get("error")) return fail("xac-thuc");

  const supabase = await createSessionClient();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: (params.get("type") ?? "email") as EmailOtpType })
      : { data: { user: null }, error: new Error("missing code") };

  if (error || !data.user) {
    console.error("[auth/callback]", error?.message);
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
