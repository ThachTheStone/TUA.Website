import { Badge } from "@/components/ui/badge";
import { APPROVAL_LABEL, PAYMENT_LABEL, STATUS_LABEL, isDebt } from "@/lib/orders/state-machine";
import { cn } from "@/lib/utils";
import type { ApprovalStatus, OrderStatus, PaymentStatus } from "@/types/db";

// Status chips for the admin order pages (SRS §5). Colors: amber = waiting on someone,
// green = done/ok, red = stopped or a problem.

const tone = {
  wait: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  bad: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  neutral: "",
};

const STATUS_TONE: Record<OrderStatus, keyof typeof tone> = {
  PENDING_PAYMENT: "wait",
  PAYMENT_REVIEW: "wait",
  CONFIRMED: "neutral",
  PRINTING: "neutral",
  QC: "neutral",
  READY: "neutral",
  DELIVERED: "ok",
  EXPIRED: "bad",
  CANCELLED: "bad",
};

const PAYMENT_TONE: Record<PaymentStatus, keyof typeof tone> = { UNPAID: "wait", DEPOSIT_PAID: "neutral", FULLY_PAID: "ok" };

const APPROVAL_TONE: Record<ApprovalStatus, keyof typeof tone> = {
  PENDING_APPROVAL: "wait",
  UNDER_REVIEW: "wait",
  APPROVED: "ok",
  REJECTED: "bad",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={cn(tone[STATUS_TONE[status]])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function PaymentBadge({ status, paymentStatus }: { status: OrderStatus; paymentStatus: PaymentStatus }) {
  if (isDebt({ status, payment_status: paymentStatus })) {
    return (
      <Badge variant="outline" className={tone.bad}>
        Còn nợ
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn(tone[PAYMENT_TONE[paymentStatus]])}>
      {PAYMENT_LABEL[paymentStatus]}
    </Badge>
  );
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  return (
    <Badge variant="outline" className={cn(tone[APPROVAL_TONE[status]])}>
      {APPROVAL_LABEL[status]}
    </Badge>
  );
}
