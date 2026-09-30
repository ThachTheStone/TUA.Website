import "server-only";
import { after } from "next/server";
import { auth, sheets as sheetsApi, type sheets_v4 } from "@googleapis/sheets";
import { TYPE_LABEL } from "@/components/cart/catalog";
import { siteUrl } from "@/lib/email";
import { colorLabel, formatDate } from "@/lib/format";
import { APPROVAL_LABEL, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/orders/state-machine";
import { getSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import type { ApprovalStatus, DonationStatus, ItemType, Order, RefundStatus } from "@/types/db";

// FR23: Google Sheets is a read-only mirror of the database. Every sync rewrites the three
// tabs from scratch (simple and idempotent at this size). Hard rule 7: a failed sync is logged
// and never fails the action that triggered it.

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
/** Supabase returns at most 1000 rows per request. */
const PAGE = 1000;

const REFUND_LABEL: Record<RefundStatus, string> = { NONE: "", REQUIRED: "Cần hoàn tiền", DONE: "Đã hoàn tiền" };
const DONATION_LABEL: Record<DonationStatus, string> = { PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", CANCELLED: "Đã hủy" };

type Cell = string | number;
type Tab = { name: string; header: string[]; rows: Cell[][] };

export function isSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  );
}

function client(): sheets_v4.Sheets {
  const jwt = new auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // .env files keep the key on one line with literal "\n".
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });
  return sheetsApi({ version: "v4", auth: jwt });
}

/** Every row of a table, page by page. */
async function selectAll<T>(table: string, columns: string, orderBy: string): Promise<T[]> {
  const db = createServiceClient();
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .order(orderBy)
      .range(from, from + PAGE - 1)
      .returns<T[]>();
    if (error) throw new Error(`Không đọc được ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

type OrderRow = Pick<
  Order,
  | "code" | "source" | "customer_name" | "phone" | "email" | "fulfillment" | "address" | "pickup_location" | "preferred_time"
  | "items_total" | "discount_amount" | "discount_note" | "subtotal" | "prepay_percent" | "paid_amount" | "status" | "payment_status" | "refund_status" | "created_at"
>;

type ItemRow = {
  id: string;
  type: ItemType;
  color: string;
  size: string;
  quantity: number;
  unit_price: number;
  approval_status: ApprovalStatus | null;
  orders: { code: string } | null;
  prototypes: { name: string } | null;
};

type DonationRow = {
  code: string;
  display_name: string;
  contact: string | null;
  amount: number;
  message: string | null;
  is_public: boolean;
  is_hidden: boolean;
  status: DonationStatus;
  created_at: string;
};

async function buildTabs(): Promise<Tab[]> {
  const [settings, orders, items, donations] = await Promise.all([
    getSettings(),
    selectAll<OrderRow>(
      "orders",
      "code, source, customer_name, phone, email, fulfillment, address, pickup_location, preferred_time, items_total, discount_amount, discount_note, subtotal, prepay_percent, paid_amount, status, payment_status, refund_status, created_at",
      "created_at",
    ),
    selectAll<ItemRow>(
      "order_items",
      "id, type, color, size, quantity, unit_price, approval_status, orders(code), prototypes(name)",
      "id",
    ),
    selectAll<DonationRow>("donations", "code, display_name, contact, amount, message, is_public, is_hidden, status, created_at", "created_at"),
  ]);

  // Items in order-code order so each order's shirts sit together.
  items.sort((a, b) => (a.orders?.code ?? "").localeCompare(b.orders?.code ?? ""));

  return [
    {
      name: "Orders",
      header: [
        "Mã đơn", "Nguồn", "Tên", "SĐT", "Email", "Hình thức nhận", "Địa chỉ/Địa điểm", "Thời gian", "Tiền hàng", "Giảm giá", "Ưu đãi", "Tổng tiền",
        "% trả trước", "Đã trả", "Còn lại", "Trạng thái", "Thanh toán", "Hoàn tiền", "Ngày tạo",
      ],
      rows: orders.map((o) => [
        o.code,
        o.source === "WEB" ? "Website" : "Workshop",
        o.customer_name,
        o.phone,
        o.email ?? "",
        o.fulfillment === "PICKUP" ? "Nhận tại campus" : "Giao hàng",
        (o.fulfillment === "PICKUP" ? o.pickup_location : o.address) ?? "",
        o.preferred_time ?? "",
        o.items_total,
        o.discount_amount,
        o.discount_note ?? "",
        o.subtotal,
        o.prepay_percent,
        o.paid_amount,
        Math.max(0, o.subtotal - o.paid_amount),
        STATUS_LABEL[o.status],
        PAYMENT_LABEL[o.payment_status],
        REFUND_LABEL[o.refund_status],
        formatDate(o.created_at),
      ]),
    },
    {
      name: "OrderItems",
      header: ["Mã đơn", "Loại", "Áo mẫu", "Màu", "Size", "SL", "Đơn giá", "Thành tiền", "Duyệt thiết kế", "Link thiết kế"],
      rows: items.map((i) => {
        const code = i.orders?.code ?? "";
        return [
          code,
          TYPE_LABEL[i.type],
          i.prototypes?.name ?? "",
          i.type === "BLINDBOX" ? "" : colorLabel(settings.colors, i.color),
          i.size,
          i.quantity,
          i.unit_price,
          i.unit_price * i.quantity,
          i.approval_status ? APPROVAL_LABEL[i.approval_status] : "",
          // Admin page (staff login required), never a raw storage URL.
          i.type === "PLAIN" || i.type === "BLINDBOX" || !code ? "" : siteUrl(`/admin/don-hang/${code}`),
        ];
      }),
    },
    {
      name: "Donations",
      header: ["Mã", "Tên hiển thị", "Liên hệ", "Số tiền", "Lời nhắn", "Công khai", "Ẩn khỏi vinh danh", "Trạng thái", "Ngày"],
      rows: donations.map((d) => [
        d.code,
        d.display_name,
        d.contact ?? "",
        d.amount,
        d.message ?? "",
        d.is_public ? "Có" : "Ẩn danh",
        d.is_hidden ? "Ẩn" : "",
        DONATION_LABEL[d.status],
        formatDate(d.created_at),
      ]),
    },
  ];
}

/** Adds any of the tabs the spreadsheet doesn't have yet. */
async function ensureTabs(api: sheets_v4.Sheets, spreadsheetId: string, names: string[]) {
  const { data } = await api.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" });
  const existing = new Set((data.sheets ?? []).map((s) => s.properties?.title));
  const missing = names.filter((n) => !existing.has(n));
  if (!missing.length) return;
  await api.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) },
  });
}

/** Rewrites the Orders, OrderItems and Donations tabs from the database. Throws on failure. */
export async function syncAll(): Promise<{ orders: number; items: number; donations: number }> {
  if (!isSheetsConfigured()) throw new Error("Chưa cấu hình Google Sheets (GOOGLE_SHEETS_ID, tài khoản dịch vụ)");
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;
  const api = client();
  const tabs = await buildTabs();

  await ensureTabs(api, spreadsheetId, tabs.map((t) => t.name));
  await api.spreadsheets.values.batchClear({ spreadsheetId, requestBody: { ranges: tabs.map((t) => `'${t.name}'`) } });
  await api.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      // RAW: a name like "=HYPERLINK(…)" stays text instead of becoming a formula.
      valueInputOption: "RAW",
      data: tabs.map((t) => ({ range: `'${t.name}'!A1`, values: [t.header, ...t.rows] })),
    },
  });
  const [orders, items, donations] = tabs.map((t) => t.rows.length);
  return { orders, items, donations };
}

// Coalescing: while a sync runs, further requests only mark "run once more", so a burst of
// changes (or the expiry job moving many orders) costs at most two syncs per server instance.
let running: Promise<void> | null = null;
let again = false;

/** Runs syncAll (coalesced) and never throws. */
export function requestSheetSync(): Promise<void> {
  if (!isSheetsConfigured()) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await syncAll();
      } while (again);
    } catch (err) {
      console.error("[sheets] sync failed", err);
    } finally {
      running = null;
    }
  })();
  return running;
}

/**
 * Call after any change to orders, payments or donations: syncs once the response is sent.
 * Outside a request (scripts) it just starts the sync.
 */
export function syncSheetsLater(): void {
  try {
    after(requestSheetSync);
  } catch {
    void requestSheetSync();
  }
}
