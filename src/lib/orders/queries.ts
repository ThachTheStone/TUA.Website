import "server-only";
import { colorLabel } from "@/lib/format";
import { APPROVAL_LABEL, STATUS_LABEL, buyerStatus, type StatusTone } from "@/lib/orders/state-machine";
import { getSettings, type Settings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import { transferContent, vietQrUrl } from "@/lib/vietqr";
import type { ApprovalStatus, CustomKind, FulfillmentType, ItemType, Order, OrderStatus, PaymentStatus } from "@/types/db";

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
  paymentStatus: PaymentStatus;
  createdAt: string;
  fulfillment: FulfillmentType;
  /** FR31: before discount, the discount, and what was applied. */
  itemsTotal: number;
  discountAmount: number;
  discountNote: string | null;
  subtotal: number;
  prepayAmount: number;
  paidAmount: number;
  remaining: number;
  /** PENDING_PAYMENT whose deadline passed but the expiry job hasn't run yet. */
  overdue: boolean;
  /** The one status the buyer sees (S17), see buyerStatus(). */
  buyerStatus: { label: string; tone: StatusTone };
  items: {
    id: string;
    type: ItemType;
    /** FR27: the prototype's name for "Áo mẫu" lines. */
    prototypeName: string | null;
    colorLabel: string;
    size: string;
    quantity: number;
    unitPrice: number;
    /** FR29: custom shirts only. */
    approvalStatus: ApprovalStatus | null;
    approvalLabel: string | null;
    rejectReason: string | null;
    /** FR29: only "Tự thiết kế" shirts can be fixed on the website; others are fixed with TỰA. */
    customKind: CustomKind | null;
  }[];
  history: { status: OrderStatus; label: string; at: string }[];
  /** Only while the order is waiting for the customer's transfer. */
  payment: PaymentInfo | null;
};

const ORDER_FIELDS =
  "id, code, access_token, status, payment_status, created_at, fulfillment, items_total, discount_amount, discount_note, subtotal, prepay_amount, paid_amount, expires_at";

type OrderRow = Pick<
  Order,
  "id" | "code" | "access_token" | "status" | "payment_status" | "created_at" | "fulfillment" | "items_total" | "discount_amount" | "discount_note" | "subtotal" | "prepay_amount" | "paid_amount" | "expires_at"
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
    db
      .from("order_items")
      .select("id, type, color, size, quantity, unit_price, approval_status, reject_reason, custom_kind, prototypes(name)")
      .eq("order_id", order.id)
      .order("id"),
    db
      .from("order_status_history")
      .select("from_status, to_status, changed_at")
      .eq("order_id", order.id)
      .order("changed_at", { ascending: true }),
  ]);
  const overdue = isOverdue(order);
  const rejectedDesigns = (items.data ?? []).filter((i) => i.approval_status === "REJECTED").length;

  return {
    code: order.code,
    accessToken: order.access_token,
    status: order.status,
    paymentStatus: order.payment_status,
    createdAt: order.created_at,
    fulfillment: order.fulfillment,
    itemsTotal: order.items_total,
    discountAmount: order.discount_amount,
    discountNote: order.discount_note,
    subtotal: order.subtotal,
    prepayAmount: order.prepay_amount,
    paidAmount: order.paid_amount,
    remaining: Math.max(0, order.subtotal - order.paid_amount),
    overdue,
    buyerStatus: buyerStatus({ status: order.status, payment_status: order.payment_status, overdue, rejectedDesigns }),
    items: (items.data ?? []).map((i) => ({
      id: i.id,
      type: i.type,
      prototypeName: (i.prototypes as unknown as { name: string } | null)?.name ?? null,
      colorLabel: colorLabel(settings.colors, i.color),
      size: i.size,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      approvalStatus: i.approval_status,
      approvalLabel: i.approval_status ? APPROVAL_LABEL[i.approval_status as ApprovalStatus] : null,
      rejectReason: i.approval_status === "REJECTED" ? i.reject_reason : null,
      customKind: (i.custom_kind as CustomKind | null) ?? null,
    })),
    // Staff edits (from = to) are internal; the buyer sees status changes only.
    history: (history.data ?? []).filter((h) => h.from_status !== h.to_status).map((h) => ({
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
  /** One status per order (S17), see buyerStatus(). */
  status: { label: string; tone: StatusTone };
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
    const rejectedDesigns = (o.order_items ?? []).filter((i: { approval_status: string | null }) => i.approval_status === "REJECTED").length;
    return {
      code: o.code,
      status: buyerStatus({
        status: o.status as OrderStatus,
        payment_status: o.payment_status as PaymentStatus,
        overdue: isOverdue(o),
        rejectedDesigns,
      }),
      rejectedDesigns,
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
