import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GoogleButton, OrDivider, SignUpForm } from "@/components/account/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomer, googleLoginEnabled, safeNext } from "@/lib/customers/session";

export const metadata: Metadata = { title: "Đăng ký" };

type Props = { searchParams: Promise<{ next?: string }> };

/** FR26 buyer sign-up: Google, or email + password confirmed by email. */
export default async function SignUpPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next);
  if (await getCustomer()) redirect(next);

  return (
    <div className="flex justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Tạo tài khoản</CardTitle>
          <CardDescription>Để đặt áo, lưu giỏ hàng và theo dõi trạng thái đơn.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {googleLoginEnabled() && (
            <>
              <GoogleButton next={next} />
              <OrDivider />
            </>
          )}
          <SignUpForm next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
