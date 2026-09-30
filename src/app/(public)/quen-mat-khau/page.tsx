import { Phone, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPhone, telUrl, zaloUrl } from "@/lib/contact";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Quên mật khẩu" };
export const dynamic = "force-dynamic";

/**
 * FR26 "Quên mật khẩu". Email sending (SMTP) is down, so the reset form (ForgotPasswordForm) is
 * replaced by a notice with the organizer's phone from settings. Put the form back once email works.
 */
export default async function ForgotPasswordPage() {
  const { contact } = await getSettings();
  const phone = contact.phone;
  const zalo = phone ? zaloUrl(phone) : null;

  return (
    <div className="flex justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Quên mật khẩu</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div role="status" className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>
              Hệ thống gửi email đang gặp trục trặc nên hiện <strong>chưa thể gửi liên kết đặt lại mật khẩu</strong> về email của
              bạn. Mong bạn thông cảm.
            </p>
          </div>

          {phone ? (
            <>
              <p className="text-sm">
                Vui lòng liên hệ Ban tổ chức qua số <strong className="whitespace-nowrap">{formatPhone(phone)}</strong> (gọi hoặc nhắn
                Zalo) để được hỗ trợ đặt hàng.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="cta" className="sm:flex-1">
                  <a href={telUrl(phone)}>
                    <Phone /> Gọi {formatPhone(phone)}
                  </a>
                </Button>
                {zalo && (
                  <Button asChild size="cta" variant="brand-outline" className="sm:flex-1">
                    <a href={zalo} target="_blank" rel="noopener noreferrer">
                      Nhắn Zalo
                    </a>
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm">
              Vui lòng{" "}
              <Link href="/lien-he" className="font-medium text-primary underline underline-offset-4">
                liên hệ Ban tổ chức
              </Link>{" "}
              để được hỗ trợ đặt hàng.
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Nhớ ra mật khẩu?{" "}
            <Link href="/dang-nhap" className="font-medium text-foreground underline underline-offset-4">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
