import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/account/logout-button";
import { ProfileForm } from "@/components/account/profile-form";
import { StatusPill } from "@/components/order/status-pill";
import { PageHeader } from "@/components/public/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireCustomer } from "@/lib/customers/session";
import { formatDate, formatVND } from "@/lib/format";
import { listCustomerOrders } from "@/lib/orders/queries";

export const metadata: Metadata = { title: "Tài khoản", robots: { index: false } };
export const dynamic = "force-dynamic";

/** FR26: profile and order history of the signed-in buyer. */
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mk?: string }> }) {
  const { userId, email, customer } = await requireCustomer("/tai-khoan");
  const { mk } = await searchParams;
  const orders = await listCustomerOrders(userId);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <PageHeader title={`Xin chào, ${customer.full_name}`}>
        <LogoutButton />
      </PageHeader>
      {mk === "moi" && (
        <Alert>
          <AlertDescription>Đã đặt mật khẩu mới. Lần sau hãy đăng nhập bằng mật khẩu này.</AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Đơn hàng của tôi</h2>
        {orders.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-6">
            <p className="text-muted-foreground">Bạn chưa có đơn hàng nào.</p>
            <Button asChild>
              <Link href="/cua-hang">Đến cửa hàng</Link>
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
            {orders.map((o) => (
              <li key={o.code}>
                <Link
                  href={`/tai-khoan/don-hang/${o.code}`}
                  className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 hover:bg-primary/5 sm:grid-cols-[8rem_1fr_auto_auto]"
                >
                  <span className="flex flex-col">
                    <span className="font-semibold text-primary">{o.code}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</span>
                  </span>
                  {/* S17: exactly one status per order. */}
                  <span className="order-last col-span-2 sm:order-none sm:col-span-1">
                    <StatusPill {...o.status} />
                  </span>
                  <span className="text-right text-sm tabular-nums">
                    <span className="font-semibold">{formatVND(o.subtotal)}</span>
                    <span className="block text-xs text-muted-foreground">Đã trả {formatVND(o.paidAmount)}</span>
                  </span>
                  <ChevronRight className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden />
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
