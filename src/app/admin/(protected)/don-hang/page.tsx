import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge, PaymentBadge } from "@/components/admin/orders/badges";
import { OrderFiltersForm } from "@/components/admin/orders/order-filters";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatVND } from "@/lib/format";
import {
  PAGE_SIZE,
  getOrderCounts,
  listAdminOrders,
  orderFiltersSchema,
  type OrderFilters,
} from "@/lib/orders/admin-queries";
import { STATUS_LABEL } from "@/lib/orders/state-machine";
import { requireRole } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/db";

export const metadata: Metadata = { title: "Đơn hàng" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Keeps the current filters and changes some of them. */
function hrefWith(filters: OrderFilters, change: Partial<Record<keyof OrderFilters, string | number | undefined>>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filters, page: undefined, ...change })) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `/admin/don-hang?${qs}` : "/admin/don-hang";
}

const COUNTER_STATUSES: OrderStatus[] = ["PAYMENT_REVIEW", "PENDING_PAYMENT", "CONFIRMED", "PRINTING", "QC", "READY"];

/** FR13: every order (web and workshop) with counters, filters and search. */
export default async function OrdersPage({ searchParams }: Props) {
  await requireRole();
  const raw = await searchParams;
  const filters = orderFiltersSchema.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined])),
  );
  const [{ rows, total }, counts] = await Promise.all([listAdminOrders(filters), getOrderCounts()]);
  const page = filters.page ?? 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const counters = [
    { label: "Thiết kế cần duyệt", n: counts.pendingDesigns, href: hrefWith({}, { design: "PENDING" }), active: filters.design === "PENDING", urgent: true },
    ...COUNTER_STATUSES.map((s) => ({
      label: STATUS_LABEL[s],
      n: counts.byStatus[s] ?? 0,
      href: hrefWith({}, { status: s }),
      active: filters.status === s && !filters.design,
      urgent: s === "PAYMENT_REVIEW",
    })),
    { label: "Còn nợ", n: counts.debts, href: hrefWith({}, { payment: "DEBT" }), active: filters.payment === "DEBT", urgent: false },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Đơn hàng</h1>
        <Link href="/admin/workshop" className="text-sm underline underline-offset-4">
          + Tạo đơn Workshop
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {counters.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted",
              c.active && "border-primary bg-muted font-medium",
            )}
          >
            {c.label}
            <span
              className={cn(
                "rounded-full px-2 text-xs font-semibold tabular-nums",
                c.urgent && c.n > 0 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground",
              )}
            >
              {c.n}
            </span>
          </Link>
        ))}
      </div>

      <OrderFiltersForm filters={filters} />

      <p className="text-sm text-muted-foreground">{total} đơn</p>

      {rows.length === 0 ? (
        <p className="rounded-xl border p-8 text-center text-muted-foreground">Không có đơn nào khớp bộ lọc.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                {["Mã đơn", "Nguồn", "Khách", "SĐT", "Tổng", "Đã trả", "Còn lại", "Nhận hàng", "Trạng thái", "Thanh toán", "Ngày tạo"].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link href={`/admin/don-hang/${o.code}`} className="font-semibold underline-offset-4 hover:underline">
                      {o.code}
                    </Link>
                    {o.pending_designs > 0 && !["CANCELLED", "EXPIRED"].includes(o.status) && (
                      <Badge variant="outline" className="ml-2 border-amber-300 text-amber-800 dark:text-amber-300">
                        {o.pending_designs} chờ duyệt
                      </Badge>
                    )}
                    {o.rejected_designs > 0 && (
                      <Badge variant="outline" className="ml-2 border-red-300 text-red-800 dark:text-red-300">
                        {o.rejected_designs} bị từ chối
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">{o.source === "WEB" ? "Website" : "Workshop"}</td>
                  <td className="max-w-40 truncate px-3 py-2">{o.customer_name}</td>
                  <td className="px-3 py-2 tabular-nums">{o.phone}</td>
                  <td className="px-3 py-2 tabular-nums">{formatVND(o.subtotal)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatVND(o.paid_amount)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatVND(Math.max(0, o.subtotal - o.paid_amount))}</td>
                  <td className="px-3 py-2">{o.fulfillment === "PICKUP" ? "Tại campus" : "Giao hàng"}</td>
                  <td className="px-3 py-2">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-3 py-2">
                    <PaymentBadge status={o.status} paymentStatus={o.payment_status} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-4 text-sm">
          {page > 1 ? <Link href={hrefWith(filters, { page: page - 1 })}>← Trước</Link> : <span className="text-muted-foreground">← Trước</span>}
          <span>
            Trang {page}/{pages}
          </span>
          {page < pages ? <Link href={hrefWith(filters, { page: page + 1 })}>Sau →</Link> : <span className="text-muted-foreground">Sau →</span>}
        </nav>
      )}
    </div>
  );
}
