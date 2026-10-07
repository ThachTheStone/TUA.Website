import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmActionButton } from "@/components/admin/form-kit";
import { OrderStatusBadge, PaymentBadge } from "@/components/admin/orders/badges";
import { ItemCard } from "@/components/admin/orders/item-card";
import {
  AdjustPaidForm,
  CancelForm,
  DepositForm,
  EditableCard,
  FullPaymentForm,
  OrderInfoForm,
} from "@/components/admin/orders/order-forms";
import { OrderTimeline } from "@/components/admin/orders/timeline";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  adjustPaid,
  advanceOrder,
  cancelOrder,
  editOrderInfo,
  markRefunded,
  recordDeposit,
  recordFullPayment,
} from "@/lib/admin/order-actions";
import { formatDate, formatVND } from "@/lib/format";
import { getAdminOrder } from "@/lib/orders/admin-queries";
import { minConfirmAmount } from "@/lib/orders/pricing";
import { ALLOWED, CLOSED_STATUSES, PAID_ADJUSTABLE } from "@/lib/orders/state-machine";
import { requireRole } from "@/lib/supabase/auth";
import { transferContent } from "@/lib/vietqr";
import type { OrderStatus } from "@/types/db";

export const metadata: Metadata = { title: "Chi tiết đơn", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

/** Production buttons (§5.1). Payment, cancel and "chưa thấy tiền" have their own controls. */
const STEP_BUTTON: Partial<Record<OrderStatus, string>> = {
  PRINTING: "Bắt đầu in",
  QC: "Chuyển kiểm tra chất lượng",
  READY: "Sẵn sàng giao/nhận",
  DELIVERED: "Đã giao",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/** FR14/FR15/FR29: everything staff needs to process one order. */
export default async function AdminOrderPage({ params }: Props) {
  const staff = await requireRole();
  const { code } = await params;
  const order = await getAdminOrder(code);
  if (!order) notFound();

  const closed = CLOSED_STATUSES.includes(order.status);
  const remaining = Math.max(0, order.subtotal - order.paid_amount);
  const customItems = order.items.filter((i) => i.type === "CUSTOM");
  const unapproved = customItems.filter((i) => i.approvalStatus !== "APPROVED").length;
  const next = ALLOWED[order.status];
  const steps = next.filter((s) => STEP_BUTTON[s]);
  // "Sửa số tiền đã nhận" is Admin only; the action checks the role again (hard rule 8).
  const canAdjustPaid = staff.profile.role === "ADMIN" && PAID_ADJUSTABLE.includes(order.status);
  const bind = <A extends unknown[], R>(fn: (id: string, code: string, ...rest: A) => R) => fn.bind(null, order.id, order.code);

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <Link href="/admin/don-hang" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Danh sách đơn
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Đơn {order.code}</h1>
        <OrderStatusBadge status={order.status} />
        <PaymentBadge status={order.status} paymentStatus={order.payment_status} />
        <span className="text-sm text-muted-foreground">
          {order.source === "WEB" ? "Website" : `Workshop${order.createdByName ? ` · ${order.createdByName}` : ""}`} · {formatDate(order.created_at)}
        </span>
      </div>

      {order.status === "CANCELLED" && order.cancel_reason && (
        <Alert variant="destructive">
          <AlertDescription>Đã hủy: {order.cancel_reason}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <EditableCard
              title="Khách hàng"
              editLabel="Sửa"
              form={
                !closed && (
                  <OrderInfoForm
                    action={bind(editOrderInfo)}
                    values={{
                      customer_name: order.customer_name,
                      phone: order.phone,
                      email: order.email,
                      fulfillment: order.fulfillment,
                      address: order.address,
                      preferred_time: order.preferred_time,
                      pickup_location: order.pickup_location,
                      note: order.note,
                    }}
                  />
                )
              }
            >
              <Row label="Họ tên" value={order.customer_name} />
              <Row label="SĐT" value={<a href={`tel:${order.phone}`}>{order.phone}</a>} />
              <Row label="Email" value={order.email || "—"} />
              <Row label="Nhận hàng" value={order.fulfillment === "PICKUP" ? "Nhận tại campus" : "Giao hàng"} />
              {order.address && <Row label="Địa chỉ" value={order.address} />}
              {order.pickup_location && <Row label="Địa điểm hẹn" value={order.pickup_location} />}
              {order.preferred_time && <Row label="Thời gian" value={order.preferred_time} />}
              {order.note && <Row label="Ghi chú" value={order.note} />}
            </EditableCard>

            <EditableCard
              title="Tiền"
              editLabel="Sửa số tiền đã nhận"
              keepContent
              form={
                canAdjustPaid && (
                  <AdjustPaidForm
                    action={bind(adjustPaid)}
                    paidAmount={order.paid_amount}
                    subtotal={order.subtotal}
                    minDeposit={minConfirmAmount(order.subtotal)}
                  />
                )
              }
            >
              {order.discount_amount > 0 && (
                <>
                  <Row label="Tiền hàng" value={formatVND(order.items_total)} />
                  <Row label={`Ưu đãi${order.discount_note ? ` (${order.discount_note})` : ""}`} value={`−${formatVND(order.discount_amount)}`} />
                </>
              )}
              <Row label="Tổng đơn" value={formatVND(order.subtotal)} />
              <Row label={`Khách chọn trả trước (${order.prepay_percent}%)`} value={formatVND(order.prepay_amount)} />
              <Row label="Đã nhận" value={formatVND(order.paid_amount)} />
              <Row label="Còn lại" value={formatVND(remaining)} />
              <Row label="Nội dung chuyển khoản" value={<code>{transferContent(order.code)}</code>} />
              {order.status === "PENDING_PAYMENT" && order.expires_at && (
                <Row label="Hạn thanh toán" value={formatDate(order.expires_at)} />
              )}
              {order.refund_status !== "NONE" && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    {order.refund_status === "REQUIRED" ? "Cần hoàn tiền cho khách" : "Đã hoàn tiền"}
                  </span>
                  {order.refund_status === "REQUIRED" && (
                    <ConfirmActionButton
                      action={bind(markRefunded)}
                      confirmText="Xác nhận đã hoàn tiền cho khách?"
                      successMessage="Đã đánh dấu hoàn tiền"
                      variant="outline"
                    >
                      Đã hoàn tiền
                    </ConfirmActionButton>
                  )}
                </div>
              )}
            </EditableCard>
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">
              Sản phẩm ({order.items.reduce((n, i) => n + i.quantity, 0)})
              {customItems.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {unapproved ? `${unapproved}/${customItems.length} thiết kế chưa duyệt` : "Mọi thiết kế đã duyệt"}
                </span>
              )}
            </h2>
            {order.items.map((item) => (
              <ItemCard key={item.id} item={item} code={order.code} locked={closed} />
            ))}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          {!closed && order.payment_status !== "FULLY_PAID" && (
            <Card title="Xác nhận thanh toán">
              {order.status === "PENDING_PAYMENT" && (
                <p className="text-sm text-muted-foreground">Khách chưa bấm &quot;Tôi đã chuyển khoản&quot;. Vẫn xác nhận được nếu sao kê đã có tiền.</p>
              )}
              {order.paymentPath && (
                <a href={order.paymentPath} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-4">
                  Mở trang QR thanh toán cho khách ↗
                </a>
              )}
              {order.payment_status === "UNPAID" && (
                <DepositForm
                  action={bind(recordDeposit)}
                  defaultAmount={Math.min(order.prepay_amount, order.subtotal - 1000)}
                  min={minConfirmAmount(order.subtotal)}
                  subtotal={order.subtotal}
                />
              )}
              <div className={order.payment_status === "UNPAID" ? "border-t pt-3" : undefined}>
                <FullPaymentForm action={bind(recordFullPayment)} remaining={remaining} />
              </div>
              {order.status === "PAYMENT_REVIEW" && (
                <div className="border-t pt-3">
                  <ConfirmActionButton
                    action={advanceOrder.bind(null, order.id, order.code, "PENDING_PAYMENT")}
                    confirmText="Chưa thấy tiền trong sao kê? Đơn quay về Chờ thanh toán."
                    successMessage="Đã trả về Chờ thanh toán"
                    variant="outline"
                  >
                    Chưa thấy tiền
                  </ConfirmActionButton>
                </div>
              )}
            </Card>
          )}

          {steps.length > 0 && (
            <Card title="Tiến độ">
              {next.includes("PRINTING") && unapproved > 0 && (
                <p className="text-sm text-amber-700 dark:text-amber-400">Duyệt hết {unapproved} thiết kế trước khi in (BR12).</p>
              )}
              <div className="flex flex-wrap gap-2">
                {steps.map((s) => (
                  <ConfirmActionButton
                    key={s}
                    action={advanceOrder.bind(null, order.id, order.code, s)}
                    confirmText={
                      s === "DELIVERED" && remaining > 0
                        ? `Khách còn nợ ${formatVND(remaining)}. Vẫn đánh dấu Đã giao? Đơn sẽ hiện "Còn nợ" đến khi bấm "Đã thanh toán 100%".`
                        : s === "DELIVERED"
                          ? "Xác nhận đã giao đơn này?"
                          : undefined
                    }
                    successMessage="Đã cập nhật trạng thái"
                    variant={s === "PRINTING" && order.status === "QC" ? "outline" : "default"}
                  >
                    {s === "PRINTING" && order.status === "QC" ? "In lại" : STEP_BUTTON[s]}
                  </ConfirmActionButton>
                ))}
              </div>
            </Card>
          )}

          <Card title="Lịch sử">
            <OrderTimeline entries={order.timeline} />
          </Card>

          {next.includes("CANCELLED") && (
            <Card title="Hủy đơn">
              <CancelForm action={bind(cancelOrder)} paidAmount={order.paid_amount} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
