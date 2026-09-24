import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TYPE_LABEL } from "@/components/cart/catalog";
import { formatDate, formatVND } from "@/lib/format";
import type { OrderView } from "@/lib/orders/queries";

/**
 * Status, items, amounts and status history for customers (FR11). No personal data.
 * `editHref` (account page only): link to fix a rejected custom shirt (FR29).
 */
export function OrderDetails({ order, editHref }: { order: OrderView; editHref?: (itemId: string) => string }) {
  const closed = order.status === "CANCELLED" || order.status === "EXPIRED";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">Đơn {order.code}</h2>
        <Badge variant={order.status === "CANCELLED" || order.status === "EXPIRED" || order.overdue ? "destructive" : "secondary"}>
          {order.statusLabel}
        </Badge>
        <Badge variant={order.paymentStatus === "UNPAID" ? "outline" : "secondary"}>{order.paymentLabel}</Badge>
        <span className="text-sm text-muted-foreground">Đặt lúc {formatDate(order.createdAt)}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Sản phẩm</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {order.items.map((item, i) => (
              <li key={i} className="flex flex-col gap-1">
                <div className="flex justify-between gap-2">
                  <span>
                    {TYPE_LABEL[item.type]} · {item.colorLabel} · {item.size} × {item.quantity}
                    {item.approvalLabel && (
                      <Badge variant={item.approvalStatus === "REJECTED" ? "destructive" : "outline"} className="ml-2">
                        {item.approvalLabel}
                      </Badge>
                    )}
                  </span>
                  <span className="tabular-nums">{formatVND(item.unitPrice * item.quantity)}</span>
                </div>
                {item.rejectReason && (
                  <p className="rounded-md bg-red-50 p-2 text-xs text-red-900 dark:bg-red-950 dark:text-red-200">
                    Thiết kế chưa được duyệt: {item.rejectReason}. Ban tổ chức sẽ liên hệ với bạn.
                  </p>
                )}
                {editHref && item.approvalStatus === "REJECTED" && !closed && (
                  <Button asChild size="sm" variant="outline" className="self-start">
                    <Link href={editHref(item.id)}>Sửa và gửi lại thiết kế</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <dl className="mt-2 flex flex-col gap-1 border-t pt-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tổng đơn</dt>
              <dd className="font-semibold tabular-nums">{formatVND(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Đã thanh toán</dt>
              <dd className="tabular-nums">{formatVND(order.paidAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Còn lại</dt>
              <dd className="font-semibold tabular-nums">{formatVND(order.remaining)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Hình thức nhận</dt>
              <dd>{order.fulfillment === "DELIVERY" ? "Giao hàng" : "Nhận tại campus"}</dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Lịch sử trạng thái</h3>
          <ol className="flex flex-col gap-2 border-l pl-4 text-sm">
            {order.history.map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary" />
                <p className="font-medium">{h.label}</p>
                <p className="text-muted-foreground">{formatDate(h.at)}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
