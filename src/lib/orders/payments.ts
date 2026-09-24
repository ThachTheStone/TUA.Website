import "server-only";
import { formatVND } from "@/lib/format";
import { minConfirmAmount } from "@/lib/orders/pricing";
import { CLOSED_STATUSES, PAYMENT_ALLOWED, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/orders/state-machine";
import { transitionOrder } from "@/lib/orders/transition";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/types/db";

// SRS §5.2, FR14/FR15: the "Đã cọc" and "Đã thanh toán 100%" buttons.
// The server decides every amount (hard rule 4): "Đã cọc" takes the amount staff counted,
// "Đã thanh toán 100%" always records exactly what is still owed.

export type PaymentKind = "DEPOSIT" | "FULL";

export type ConfirmPaymentInput = {
  kind: PaymentKind;
  /** DEPOSIT only: the amount actually received. */
  amount?: number;
  method: PaymentMethod;
  note?: string | null;
  userId: string;
};

export type ConfirmedPayment = { amount: number; paymentStatus: PaymentStatus; statusChanged: boolean };

export async function confirmPayment(orderId: string, input: ConfirmPaymentInput): Promise<ActionResult<ConfirmedPayment>> {
  const db = createServiceClient();
  const { data: order, error } = await db
    .from("orders")
    .select("id, status, payment_status, subtotal, paid_amount")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return { ok: false, error: "Không đọc được đơn hàng" };
  if (!order) return { ok: false, error: "Không tìm thấy đơn hàng" };

  let status = order.status as OrderStatus;
  const from = order.payment_status as PaymentStatus;
  const to: PaymentStatus = input.kind === "DEPOSIT" ? "DEPOSIT_PAID" : "FULLY_PAID";

  if (CLOSED_STATUSES.includes(status)) {
    return { ok: false, error: `Đơn đang ở trạng thái "${STATUS_LABEL[status]}", không ghi nhận thanh toán được` };
  }
  if (!PAYMENT_ALLOWED[from].includes(to)) {
    return { ok: false, error: `Không thể chuyển thanh toán từ "${PAYMENT_LABEL[from]}" sang "${PAYMENT_LABEL[to]}"` };
  }

  let amount: number;
  if (input.kind === "DEPOSIT") {
    amount = Math.round(input.amount ?? 0);
    const paid = order.paid_amount + amount;
    const min = minConfirmAmount(order.subtotal);
    if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "Vui lòng nhập số tiền đã nhận" };
    if (paid < min) return { ok: false, error: `Tiền cọc tối thiểu là ${formatVND(min)} (50% tổng đơn, BR02)` };
    if (paid >= order.subtotal) {
      return { ok: false, error: 'Số tiền bằng hoặc hơn tổng đơn. Hãy dùng nút "Đã thanh toán 100%".' };
    }
  } else {
    amount = order.subtotal - order.paid_amount;
    if (amount <= 0) return { ok: false, error: "Đơn đã được thanh toán đủ" };
  }

  // The buyer may transfer without pressing "Tôi đã chuyển khoản": pass through PAYMENT_REVIEW.
  if (status === "PENDING_PAYMENT") {
    const moved = await transitionOrder(orderId, "PAYMENT_REVIEW", {
      note: "Staff xác nhận đã nhận tiền",
      userId: input.userId,
    });
    if (!moved.ok) return moved;
    status = "PAYMENT_REVIEW";
  }
  const nextStatus: OrderStatus = status === "PAYMENT_REVIEW" ? "CONFIRMED" : status;
  const label = input.kind === "DEPOSIT" ? "Đã cọc" : "Đã thanh toán 100%";
  const note = [`${label}: ${formatVND(amount)}`, input.note?.trim()].filter(Boolean).join(" · ");

  const { data: changed, error: rpcError } = await db.rpc("confirm_payment", {
    p_order_id: orderId,
    p_from_status: status,
    p_to_status: nextStatus,
    p_from_payment: from,
    p_to_payment: to,
    p_expected_paid: order.paid_amount,
    p_amount: amount,
    p_method: input.method,
    p_note: note,
    p_user: input.userId,
  });
  if (rpcError) {
    console.error("[payments] confirm_payment", rpcError.message);
    return { ok: false, error: "Không ghi nhận được thanh toán. Vui lòng thử lại." };
  }
  if (!changed) return { ok: false, error: "Đơn hàng vừa được cập nhật bởi người khác. Vui lòng tải lại trang." };

  return { ok: true, data: { amount, paymentStatus: to, statusChanged: nextStatus !== status } };
}
