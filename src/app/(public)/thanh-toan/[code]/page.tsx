import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDetails } from "@/components/order/order-details";
import { PaymentPanel } from "@/components/order/payment-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getOrderByToken } from "@/lib/orders/queries";

export const metadata: Metadata = { title: "Thanh toán", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ t?: string }> };

/** FR07 payment page. Reached only through the link with the order's access token. */
export default async function PaymentPage({ params, searchParams }: Props) {
  const [{ code }, { t }] = await Promise.all([params, searchParams]);
  const order = typeof t === "string" ? await getOrderByToken(code, t) : null;
  if (!order) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Thanh toán đơn {order.code}</h1>
        <p className="text-muted-foreground">
          Lưu lại mã đơn <strong className="text-foreground">{order.code}</strong> để{" "}
          <Link href="/tra-cuu" className="underline underline-offset-4">
            tra cứu
          </Link>{" "}
          bằng số điện thoại bạn đã nhập. Thông tin thanh toán cũng đã được gửi vào email của bạn.
        </p>
      </div>

      {order.payment ? (
        <PaymentPanel payment={order.payment} code={order.code} token={order.accessToken} />
      ) : order.status === "PAYMENT_REVIEW" ? (
        <Alert>
          <AlertDescription>
            Cảm ơn bạn! Ban tổ chức đang đối soát khoản chuyển khoản và sẽ gửi email khi đơn được xác nhận.
          </AlertDescription>
        </Alert>
      ) : order.overdue ? (
        <Alert variant="destructive">
          <AlertDescription>
            Đơn đã quá hạn thanh toán. Nếu bạn đã chuyển khoản, vui lòng liên hệ Ban tổ chức kèm mã đơn {order.code}.
          </AlertDescription>
        </Alert>
      ) : null}

      <OrderDetails order={order} />
    </div>
  );
}
