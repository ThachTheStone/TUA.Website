import type { OrderStatus } from "@/types/db";

// SRS §5. The only place that defines which status changes are allowed.

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
