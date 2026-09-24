import "server-only";
import { APPROVAL_LABEL, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/orders/state-machine";
import { getSettings, type Settings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import { transferContent, vietQrUrl } from "@/lib/vietqr";
import type { ApprovalStatus, FulfillmentType, ItemType, Order, OrderStatus, PaymentStatus } from "@/types/db";

// Customer-facing order reads. Access needs code + phone (NFR03) or code + access token
// (payment link). The view never includes the customer's personal details.

export type PaymentInfo = {
  qrUrl: string;
  bankId: string;
  accountNo: string;
  accountName: string;
  amount: number;
  content: string;
  expiresAt: string | null;
};

export type OrderView = {
  code: string;
  accessToken: string;
  status: OrderStatus;
  statusLabel: string;
  paymentStatus: PaymentStatus;
  paymentLabel: string;
  createdAt: string;
  fulfillment: FulfillmentType;
  subtotal: number;
  prepayAmount: number;
  paidAmount: number;
  remaining: number;
  /** PENDING_PAYMENT whose deadline passed but the expiry job hasn't run yet. */
  overdue: boolean;
  items: {
    id: string;
    type: ItemType;
    colorLabel: string;
    size: string;
    quantity: number;
    unitPrice: number;
    /** FR29: custom shirts only. */
    approvalStatus: ApprovalStatus | null;
    approvalLabel: string | null;
    rejectReason: string | null;
  }[];
  history: { status: OrderStatus; label: string; at: string }[];
  /** Only while the order is waiting for the customer's transfer. */
  payment: PaymentInfo | null;
};

const ORDER_FIELDS =
  "id, code, access_token, status, payment_status, created_at, fulfillment, subtotal, prepay_amount, paid_amount, expires_at";

type OrderRow = Pick<
  Order,
  "id" | "code" | "access_token" | "status" | "payment_status" | "created_at" | "fulfillment" | "subtotal" | "prepay_amount" | "paid_amount" | "expires_at"
>;

export function isOverdue(order: Pick<Order, "status" | "expires_at">): boolean {
  return order.status === "PENDING_PAYMENT" && !!order.expires_at && new Date(order.expires_at).getTime() < Date.now();
}

export function paymentInfo(settings: Settings, code: string, amount: number, expiresAt: string | null): PaymentInfo {
  const bank = settings.bank_sales;
  return {
    qrUrl: vietQrUrl(bank, amount, code),
    bankId: bank.bankId,
    accountNo: bank.accountNo,
    accountName: bank.accountName,
    amount,
    content: transferContent(code),
    expiresAt,
  };
}

async function buildView(order: OrderRow): Promise<OrderView> {
  const db = createServiceClient();
  const [settings, items, history] = await Promise.all([
    getSettings(),
    db.from("order_items").select("id, type, color, size, quantity, unit_price, approval_status, reject_reason").eq("order_id", order.id).order("id"),
    db
      .from("order_status_history")
      .select("to_status, changed_at")
      .eq("order_id", order.id)
      .order("changed_at", { ascending: true }),
  ]);
  const colorLabel = (key: string) => settings.colors.find((c) => c.key === key)?.label ?? key;
  const overdue = isOverdue(order);

  return {
    code: order.code,
    accessToken: order.access_token,
    status: order.status,
    statusLabel: overdue ? "Quá hạn thanh toán" : STATUS_LABEL[order.status],
    paymentStatus: order.payment_status,
    paymentLabel: order.status === "DELIVERED" && order.payment_status === "DEPOSIT_PAID" ? "Còn nợ" : PAYMENT_LABEL[order.payment_status],
    createdAt: order.created_at,
    fulfillment: order.fulfillment,
    subtotal: order.subtotal,
    prepayAmount: order.prepay_amount,
    paidAmount: order.paid_amount,
    remaining: Math.max(0, order.subtotal - order.paid_amount),
    overdue,
    items: (items.data ?? []).map((i) => ({
      id: i.id,
      type: i.type,
      colorLabel: colorLabel(i.color),
      size: i.size,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      approvalStatus: i.approval_status,
      approvalLabel: i.approval_status ? APPROVAL_LABEL[i.approval_status as ApprovalStatus] : null,
      rejectReason: i.approval_status === "REJECTED" ? i.reject_reason : null,
    })),
    history: (history.data ?? []).map((h) => ({
      status: h.to_status,
      label: STATUS_LABEL[h.to_status as OrderStatus],
      at: h.changed_at,
    })),
    payment:
      order.status === "PENDING_PAYMENT" && !overdue
        ? paymentInfo(settings, order.code, order.prepay_amount, order.expires_at)
        : null,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Payment page: code + access token from the link. */
export async function getOrderByToken(code: string, token: string): Promise<OrderView | null> {
  if (!UUID_RE.test(token)) return null;
  const { data } = await createServiceClient()
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("code", code.toUpperCase())
    .eq("access_token", token)
    .maybeSingle();
  return data ? buildView(data as OrderRow) : null;
}

/** FR11 lookup: both the code and the (normalized) phone must match. */
export async function lookupOrder(code: string, phone: string): Promise<OrderView | null> {
  const { data } = await createServiceClient()
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("code", code)
    .eq("phone", phone)
    .maybeSingle();
  return data ? buildView(data as OrderRow) : null;
}

/** Internal id + status for the "Tôi đã chuyển khoản" action. */
export async function findOrderIdByToken(code: string, token: string) {
  if (!UUID_RE.test(token)) return null;
  const { data } = await createServiceClient()
    .from("orders")
    .select("id, status, expires_at")
    .eq("code", code.toUpperCase())
    .eq("access_token", token)
    .maybeSingle();
  return data as Pick<Order, "id" | "status" | "expires_at"> | null;
}

// ─── FR26: the signed-in buyer's own orders ────────────────────────────────

export type CustomerOrderSummary = {
  code: string;
  status: OrderStatus;
  statusLabel: string;
  paymentLabel: string;
  overdue: boolean;
  /** Custom shirts waiting for the buyer after a rejection (FR29). */
  rejectedDesigns: number;
  createdAt: string;
  subtotal: number;
  paidAmount: number;
};

export async function listCustomerOrders(customerId: string): Promise<CustomerOrderSummary[]> {
  const { data, error } = await createServiceClient()
    .from("orders")
    .select("code, status, payment_status, created_at, subtotal, paid_amount, expires_at, order_items(approval_status)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`listCustomerOrders: ${error.message}`);

  return (data ?? []).map((o) => {
    const overdue = isOverdue(o);
    return {
      code: o.code,
      status: o.status,
      statusLabel: overdue ? "Quá hạn thanh toán" : STATUS_LABEL[o.status as OrderStatus],
      paymentLabel:
        o.status === "DELIVERED" && o.payment_status === "DEPOSIT_PAID" ? "Còn nợ" : PAYMENT_LABEL[o.payment_status as PaymentStatus],
      overdue,
      rejectedDesigns: (o.order_items ?? []).filter((i: { approval_status: string | null }) => i.approval_status === "REJECTED").length,
      createdAt: o.created_at,
      subtotal: o.subtotal,
      paidAmount: o.paid_amount,
    };
  });
}

/** One order, only if it belongs to the buyer. */
export async function getCustomerOrder(customerId: string, code: string): Promise<OrderView | null> {
  const { data } = await createServiceClient()
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("code", code.toUpperCase())
    .eq("customer_id", customerId)
    .maybeSingle();
  return data ? buildView(data as OrderRow) : null;
}
