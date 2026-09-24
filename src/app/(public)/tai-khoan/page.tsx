import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/account/logout-button";
import { ProfileForm } from "@/components/account/profile-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireCustomer } from "@/lib/customers/session";
import { formatDate, formatVND } from "@/lib/format";
import { listCustomerOrders } from "@/lib/orders/queries";

export const metadata: Metadata = { title: "Tài khoản", robots: { index: false } };
export const dynamic = "force-dynamic";

/** FR26: profile and order history of the signed-in buyer. */
export default async function AccountPage() {
  const { userId, email, customer } = await requireCustomer("/tai-khoan");
  const orders = await listCustomerOrders(userId);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Xin chào, {customer.full_name}</h1>
        <LogoutButton />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Đơn hàng của tôi</h2>
        {orders.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border p-6">
            <p className="text-muted-foreground">Bạn chưa có đơn hàng nào.</p>
            <Button asChild>
              <Link href="/thiet-ke">Tự thiết kế áo</Link>
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border">
            {orders.map((o) => (
              <li key={o.code}>
                <Link
                  href={`/tai-khoan/don-hang/${o.code}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:bg-muted/50"
                >
                  <span className="font-semibold">{o.code}</span>
                  <Badge variant={o.status === "CANCELLED" || o.status === "EXPIRED" || o.overdue ? "destructive" : "secondary"}>
                    {o.statusLabel}
                  </Badge>
                  <Badge variant="outline">{o.paymentLabel}</Badge>
                  {o.rejectedDesigns > 0 && <Badge variant="destructive">{o.rejectedDesigns} thiết kế bị từ chối</Badge>}
                  <span className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</span>
                  <span className="ml-auto text-right text-sm tabular-nums">
                    <span className="font-semibold">{formatVND(o.subtotal)}</span>
                    <span className="block text-muted-foreground">Đã trả {formatVND(o.paidAmount)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex max-w-md flex-col gap-4">
        <h2 className="text-xl font-semibold">Thông tin tài khoản</h2>
        <ProfileForm fullName={customer.full_name} phone={customer.phone ?? ""} email={email} />
      </section>
    </div>
  );
}
