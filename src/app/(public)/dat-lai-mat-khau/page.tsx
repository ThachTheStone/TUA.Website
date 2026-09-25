import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/account/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSessionClient } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Đặt lại mật khẩu", robots: { index: false } };
export const dynamic = "force-dynamic";

/** FR26: reached from the reset email via /auth/callback, which signed the buyer in. */
export default async function ResetPasswordPage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/quen-mat-khau?loi=het-han");

  return (
    <div className="flex justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Đặt mật khẩu mới</CardTitle>
          <CardDescription>Tài khoản: {user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
