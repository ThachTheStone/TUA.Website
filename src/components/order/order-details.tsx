import { Badge } from "@/components/ui/badge";
import { TYPE_LABEL } from "@/components/cart/catalog";
import { formatDate, formatVND } from "@/lib/format";
import type { OrderView } from "@/lib/orders/queries";

/** Status, items, amounts and status history for customers (FR11). No personal data. */
export function OrderDetails({ order }: { order: OrderView }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">Đơn {order.code}</h2>
        <Badge variant={order.status === "CANCELLED" || order.status === "EXPIRED" || order.overdue ? "destructive" : "secondary"}>
          {order.statusLabel}
        </Badge>
        <span className="text-sm text-muted-foreground">Đặt lúc {formatDate(order.createdAt)}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Sản phẩm</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  {TYPE_LABEL[item.type]} · {item.colorLabel} · {item.size} × {item.quantity}
                </span>
                <span className="tabular-nums">{formatVND(item.unitPrice * item.quantity)}</span>
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
