import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDetails } from "@/components/order/order-details";
import { PaymentStatus } from "@/components/order/payment-status";
import { requireCustomer } from "@/lib/customers/session";
import { getCustomerOrder } from "@/lib/orders/queries";

export const metadata: Metadata = { title: "Chi tiết đơn hàng", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

/** FR26: status tracking for one of the buyer's own orders (QR again while unpaid). */
export default async function AccountOrderPage({ params }: Props) {
  const { code } = await params;
  const { userId } = await requireCustomer(`/tai-khoan/don-hang/${code}`);
  const order = await getCustomerOrder(userId, code);
  if (!order) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <Link href="/tai-khoan" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Đơn hàng của tôi
      </Link>
      <PaymentStatus order={order} />
      <OrderDetails order={order} />
    </div>
  );
}
