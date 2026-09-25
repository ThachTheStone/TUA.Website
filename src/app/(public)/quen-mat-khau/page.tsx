import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/account/auth-forms";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Quên mật khẩu" };

type Props = { searchParams: Promise<{ loi?: string }> };

/** FR26: buyer asks for a password reset link. */
export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { loi } = await searchParams;
  return (
    <div className="flex justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Quên mật khẩu</CardTitle>
          <CardDescription>Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi liên kết để đặt mật khẩu mới.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {loi === "het-han" && (
            <Alert variant="destructive">
              <AlertDescription>Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.</AlertDescription>
            </Alert>
          )}
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
