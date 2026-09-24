import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GoogleButton, OrDivider, SignInForm } from "@/components/account/auth-forms";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomer, safeNext } from "@/lib/customers/session";

export const metadata: Metadata = { title: "Đăng nhập" };

const ERRORS: Record<string, string> = {
  "xac-thuc": "Liên kết xác thực không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
  google: "Không kết nối được với Google. Vui lòng thử lại.",
  "tai-khoan": "Không tạo được tài khoản. Vui lòng thử lại.",
};

type Props = { searchParams: Promise<{ next?: string; loi?: string }> };

/** FR26 buyer sign-in: Google or email + password. */
export default async function SignInPage({ searchParams }: Props) {
  const { next: rawNext, loi } = await searchParams;
  const next = safeNext(rawNext);
  if (await getCustomer()) redirect(next);

  return (
    <div className="flex justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Đăng nhập</CardTitle>
          <CardDescription>Đăng nhập để đặt hàng và theo dõi đơn của bạn.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {loi && ERRORS[loi] && (
            <Alert variant="destructive">
              <AlertDescription>{ERRORS[loi]}</AlertDescription>
            </Alert>
          )}
          <GoogleButton next={next} />
          <OrDivider />
          <SignInForm next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
