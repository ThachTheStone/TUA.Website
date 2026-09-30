import type { ApprovalStatus, OrderStatus, PaymentStatus } from "@/types/db";

// SRS §5. The only place that defines which status changes are allowed:
// order status (§5.1), payment status (§5.2) and design approval (§5.3).

export const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAYMENT_REVIEW", "EXPIRED", "CANCELLED"],
  PAYMENT_REVIEW: ["CONFIRMED", "PENDING_PAYMENT", "CANCELLED"],
  CONFIRMED: ["PRINTING", "CANCELLED"],
  PRINTING: ["QC"],
  QC: ["READY", "PRINTING"],
  READY: ["DELIVERED"],
  DELIVERED: [],
  EXPIRED: [],
  CANCELLED: [],
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PAYMENT_REVIEW: "Chờ xác nhận thanh toán",
  CONFIRMED: "Đã xác nhận",
  PRINTING: "Đang in",
  QC: "Kiểm tra chất lượng",
  READY: "Sẵn sàng giao/nhận",
  DELIVERED: "Đã giao",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã hủy",
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from].includes(to);
}

/** §5.2: set only by the staff buttons "Đã cọc" / "Đã thanh toán 100%". */
export const PAYMENT_ALLOWED: Record<PaymentStatus, PaymentStatus[]> = {
  UNPAID: ["DEPOSIT_PAID", "FULLY_PAID"],
  DEPOSIT_PAID: ["FULLY_PAID"],
  FULLY_PAID: [],
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Chưa thanh toán",
  DEPOSIT_PAID: "Đã cọc",
  FULLY_PAID: "Đã thanh toán 100%",
};

/** Order statuses in which money can no longer be confirmed. */
export const CLOSED_STATUSES: OrderStatus[] = ["EXPIRED", "CANCELLED"];

/** §5.3: review steps for one custom shirt. REJECTED → PENDING_APPROVAL is the buyer resubmitting. */
export const APPROVAL_ALLOWED: Record<ApprovalStatus, ApprovalStatus[]> = {
  PENDING_APPROVAL: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "PENDING_APPROVAL"],
  REJECTED: ["PENDING_APPROVAL"],
  APPROVED: [],
};

export const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  PENDING_APPROVAL: "Chờ duyệt",
  UNDER_REVIEW: "Đang xem xét",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};

/** A delivered order that still owes the remainder ("Còn nợ", BR11). */
export function isDebt(order: { status: OrderStatus; payment_status: PaymentStatus }): boolean {
  return order.status === "DELIVERED" && order.payment_status === "DEPOSIT_PAID";
}

export type StatusTone = "danger" | "warning" | "success" | "neutral";

/**
 * FR26 (S17): the one status a buyer sees per order in "Đơn hàng của tôi", picking what matters
 * most to them: closed → overdue → a design to fix → payment → production progress.
 */
export function buyerStatus(order: {
  status: OrderStatus;
  payment_status: PaymentStatus;
  overdue: boolean;
  rejectedDesigns: number;
}): { label: string; tone: StatusTone } {
  const { status } = order;
  if (status === "CANCELLED" || status === "EXPIRED") return { label: STATUS_LABEL[status], tone: "danger" };
  if (order.overdue) return { label: "Quá hạn thanh toán", tone: "danger" };
  if (order.rejectedDesigns > 0) return { label: "Cần sửa thiết kế", tone: "warning" };
  if (status === "PENDING_PAYMENT") return { label: STATUS_LABEL[status], tone: "warning" };
  if (isDebt(order)) return { label: "Đã giao, còn nợ", tone: "warning" };
  if (status === "DELIVERED" || status === "READY") return { label: STATUS_LABEL[status], tone: "success" };
  return { label: STATUS_LABEL[status], tone: "neutral" };
}
