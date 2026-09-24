import "server-only";
import { z } from "zod";
import { getSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  ApprovalStatus,
  DesignSource,
  FulfillmentType,
  Order,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/types/db";

// Staff-side order reads (FR13, FR14, FR29). Callers must have passed requireRole().

export const PAGE_SIZE = 30;
const SIGNED_URL_SECONDS = 60 * 60;

const ORDER_STATUSES = [
  "PENDING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED", "PRINTING", "QC", "READY", "DELIVERED", "EXPIRED", "CANCELLED",
] as const;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** URL search params of /admin/don-hang. Anything invalid is simply ignored. */
export const orderFiltersSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional().catch(undefined),
  payment: z.enum(["UNPAID", "DEPOSIT_PAID", "FULLY_PAID", "DEBT"]).optional().catch(undefined),
  design: z.enum(["PENDING", "REJECTED"]).optional().catch(undefined),
  source: z.enum(["WEB", "WORKSHOP"]).optional().catch(undefined),
  fulfillment: z.enum(["DELIVERY", "PICKUP"]).optional().catch(undefined),
  from: z.string().regex(DAY_RE).optional().catch(undefined),
  to: z.string().regex(DAY_RE).optional().catch(undefined),
  q: z.string().trim().max(50).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
});
export type OrderFilters = z.infer<typeof orderFiltersSchema>;

export type OrderListRow = {
  id: string;
  code: string;
  source: OrderSource;
  customer_name: string;
  phone: string;
  fulfillment: FulfillmentType;
  subtotal: number;
  paid_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
  pending_designs: number;
  rejected_designs: number;
};

/** Start of a Vietnam calendar day as an ISO timestamp. */
const vnDayStart = (day: string) => new Date(`${day}T00:00:00+07:00`).toISOString();
const nextDay = (day: string) => new Date(new Date(`${day}T00:00:00+07:00`).getTime() + 86_400_000).toISOString();

export async function listAdminOrders(f: OrderFilters): Promise<{ rows: OrderListRow[]; total: number }> {
  const page = f.page ?? 1;
  let query = createServiceClient()
    .from("order_overview")
    .select(
      "id, code, source, customer_name, phone, fulfillment, subtotal, paid_amount, status, payment_status, created_at, pending_designs, rejected_designs",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (f.status) query = query.eq("status", f.status);
  if (f.payment === "DEBT") query = query.eq("status", "DELIVERED").eq("payment_status", "DEPOSIT_PAID");
  else if (f.payment) query = query.eq("payment_status", f.payment);
  if (f.design === "PENDING") query = query.gt("pending_designs", 0).not("status", "in", "(CANCELLED,EXPIRED)");
  if (f.design === "REJECTED") query = query.gt("rejected_designs", 0);
  if (f.source) query = query.eq("source", f.source);
  if (f.fulfillment) query = query.eq("fulfillment", f.fulfillment);
  if (f.from) query = query.gte("created_at", vnDayStart(f.from));
  if (f.to) query = query.lt("created_at", nextDay(f.to));
  if (f.q) {
    // Letters, digits and spaces only: the value goes into a PostgREST `or` filter.
    const text = f.q.replace(/[^\p{L}\p{N} ]/gu, "").trim();
    const digits = f.q.replace(/\D/g, "");
    const parts = text ? [`code.ilike.*${text}*`, `customer_name.ilike.*${text}*`] : [];
    if (digits.length >= 3) parts.push(`phone.ilike.*${digits}*`);
    if (parts.length) query = query.or(parts.join(","));
  }

  const { data, count, error } = await query;
  if (error) throw new Error(`listAdminOrders: ${error.message}`);
  return { rows: (data ?? []) as OrderListRow[], total: count ?? 0 };
}

export type OrderCounts = { byStatus: Partial<Record<OrderStatus, number>>; pendingDesigns: number; debts: number };

export async function getOrderCounts(): Promise<OrderCounts> {
  const { data, error } = await createServiceClient().rpc("order_counts");
  if (error) throw new Error(`order_counts: ${error.message}`);
  const d = data as { by_status: Record<string, number>; pending_designs: number; debts: number };
  return { byStatus: d.by_status ?? {}, pendingDesigns: d.pending_designs ?? 0, debts: d.debts ?? 0 };
}

// ─── Order detail ──────────────────────────────────────────────────────────

export type DesignFileView = { area: string; areaLabel: string; downloadUrl: string | null; widthPx: number | null; heightPx: number | null };

export type AdminOrderItem = {
  id: string;
  index: number;
  type: "PLAIN" | "CUSTOM";
  colorLabel: string;
  size: string;
  quantity: number;
  unitPrice: number;
  approvalStatus: ApprovalStatus | null;
  rejectReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  designSource: DesignSource | null;
  previewUrl: string | null;
  files: DesignFileView[];
};

export type TimelineEntry =
  | { kind: "status"; at: string; by: string | null; to: OrderStatus; note: string | null }
  | { kind: "payment"; at: string; by: string | null; amount: number; method: PaymentMethod; note: string | null }
  | { kind: "design"; at: string; by: string | null; item: number; to: ApprovalStatus; reason: string | null };

export type AdminOrder = Omit<Order, "access_token"> & {
  items: AdminOrderItem[];
  timeline: TimelineEntry[];
  createdByName: string | null;
  /** Buyer payment page (QR), only while the order waits for a transfer. */
  paymentPath: string | null;
};

type ItemRow = {
  id: string;
  type: "PLAIN" | "CUSTOM";
  color: string;
  size: string;
  quantity: number;
  unit_price: number;
  approval_status: ApprovalStatus | null;
  reject_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  designs: { source: DesignSource; preview_url: string | null; design_files: { area: string; file_path: string; width_px: number | null; height_px: number | null }[] } | null;
};

const bucketFor = (source: DesignSource) => (source === "SCAN" ? "scans" : "designs");

async function signedUrl(bucket: string, path: string, download?: string): Promise<string | null> {
  const { data, error } = await createServiceClient()
    .storage.from(bucket)
    .createSignedUrl(path, SIGNED_URL_SECONDS, download ? { download } : undefined);
  if (error) console.error("[admin-orders] signed url", bucket, path, error.message);
  return data?.signedUrl ?? null;
}

export async function getAdminOrder(code: string): Promise<AdminOrder | null> {
  const db = createServiceClient();
  const { data: order, error } = await db.from("orders").select("*").eq("code", code.toUpperCase()).maybeSingle<Order>();
  if (error) throw new Error(`getAdminOrder: ${error.message}`);
  if (!order) return null;

  const [settings, items, history, payments] = await Promise.all([
    getSettings(),
    db
      .from("order_items")
      .select(
        "id, type, color, size, quantity, unit_price, approval_status, reject_reason, reviewed_by, reviewed_at, designs(source, preview_url, design_files(area, file_path, width_px, height_px))",
      )
      .eq("order_id", order.id)
      .order("id"),
    db.from("order_status_history").select("from_status, to_status, note, changed_by, changed_at").eq("order_id", order.id),
    db.from("payments").select("amount, method, note, recorded_by, recorded_at").eq("order_id", order.id),
  ]);
  const itemRows = (items.data ?? []) as unknown as ItemRow[];
  const reviews = itemRows.length
    ? await db
        .from("design_reviews")
        .select("order_item_id, to_status, reason, changed_by, changed_at")
        .in("order_item_id", itemRows.map((i) => i.id))
    : { data: [] as { order_item_id: string; to_status: ApprovalStatus; reason: string | null; changed_by: string | null; changed_at: string }[] };

  // Staff names for everyone who touched the order.
  const staffIds = new Set<string>();
  const addId = (id: string | null | undefined) => id && staffIds.add(id);
  addId(order.created_by);
  itemRows.forEach((i) => addId(i.reviewed_by));
  (history.data ?? []).forEach((h) => addId(h.changed_by));
  (payments.data ?? []).forEach((p) => addId(p.recorded_by));
  (reviews.data ?? []).forEach((r) => addId(r.changed_by));
  const { data: profiles } = staffIds.size
    ? await db.from("profiles").select("id, full_name").in("id", [...staffIds])
    : { data: [] as { id: string; full_name: string }[] };
  const nameOf = (id: string | null) => (id ? (profiles ?? []).find((p) => p.id === id)?.full_name ?? "Staff" : null);

  const colorLabel = (key: string) => settings.colors.find((c) => c.key === key)?.label ?? key;
  const areaLabel = (key: string) => settings.print_areas.find((a) => a.key === key)?.label ?? key;
  const itemIndex = new Map(itemRows.map((i, n) => [i.id, n + 1]));

  const viewItems: AdminOrderItem[] = await Promise.all(
    itemRows.map(async (i, n) => {
      const design = i.designs;
      const bucket = design ? bucketFor(design.source) : "designs";
      return {
        id: i.id,
        index: n + 1,
        type: i.type,
        colorLabel: colorLabel(i.color),
        size: i.size,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        approvalStatus: i.approval_status,
        rejectReason: i.reject_reason,
        reviewedBy: nameOf(i.reviewed_by),
        reviewedAt: i.reviewed_at,
        designSource: design?.source ?? null,
        previewUrl: design?.preview_url ? await signedUrl(bucket, design.preview_url) : null,
        files: design
          ? await Promise.all(
              design.design_files.map(async (f) => ({
                area: f.area,
                areaLabel: areaLabel(f.area),
                downloadUrl: await signedUrl(bucket, f.file_path, `${order.code}-ao${n + 1}-${f.area}.${f.file_path.split(".").pop()}`),
                widthPx: f.width_px,
                heightPx: f.height_px,
              })),
            )
          : [],
      };
    }),
  );

  const timeline: TimelineEntry[] = [
    ...(history.data ?? []).map((h): TimelineEntry => ({
      kind: "status",
      at: h.changed_at,
      by: nameOf(h.changed_by),
      to: h.to_status as OrderStatus,
      note: h.note,
    })),
    ...(payments.data ?? []).map((p): TimelineEntry => ({
      kind: "payment",
      at: p.recorded_at,
      by: nameOf(p.recorded_by),
      amount: p.amount,
      method: p.method as PaymentMethod,
      note: p.note,
    })),
    ...(reviews.data ?? []).map((r): TimelineEntry => ({
      kind: "design",
      at: r.changed_at,
      by: r.changed_by ? nameOf(r.changed_by) : "Khách gửi lại",
      item: itemIndex.get(r.order_item_id) ?? 0,
      to: r.to_status,
      reason: r.reason,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  // The payment-link secret is only exposed as paymentPath below.
  const { access_token, ...rest } = order;
  const paymentPath = order.status === "PENDING_PAYMENT" ? `/thanh-toan/${order.code}?t=${access_token}` : null;
  return { ...rest, items: viewItems, timeline, createdByName: nameOf(order.created_by), paymentPath };
}
