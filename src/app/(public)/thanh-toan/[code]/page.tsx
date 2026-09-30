import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDetails } from "@/components/order/order-details";
import { PaymentStatus } from "@/components/order/payment-status";
import { PageHeader } from "@/components/public/page-header";
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
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <PageHeader
        title={`Thanh toán đơn ${order.code}`}
        description={
          <>
            Bạn có thể theo dõi đơn <strong className="text-foreground">{order.code}</strong> trong{" "}
            <Link href="/tai-khoan" className="underline underline-offset-4">
              tài khoản
            </Link>
            . Thông tin thanh toán cũng đã được gửi vào email của bạn.
          </>
        }
      />

      <PaymentStatus order={order} />

      <OrderDetails order={order} />
    </div>
  );
}
