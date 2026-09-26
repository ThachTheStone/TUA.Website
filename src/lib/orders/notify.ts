import "server-only";
import { sendTemplate, siteUrl } from "@/lib/email";
import type { EmailKey, EmailVars } from "@/lib/email/templates";
import { colorLabel, formatDate, formatVND } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import { isBankConfigured, vietQrUrl } from "@/lib/vietqr";
import type { Order } from "@/types/db";

// Every customer email about an order (FR24), texts from the admin templates (FR30).
// Run inside after(): never throws and never blocks the action (hard rule 7).

export type OrderEvent =
  | { kind: "CREATED" | "DEPOSIT_PAID" | "FULLY_PAID" | "READY" | "DELIVERED" | "EXPIRED" }
  | { kind: "CANCELLED"; reason: string | null }
  | { kind: "DESIGN_REJECTED"; itemId: string; reason: string };

const TEMPLATE_FOR: Record<OrderEvent["kind"], EmailKey> = {
  CREATED: "ORDER_CREATED",
  DEPOSIT_PAID: "DEPOSIT_CONFIRMED",
  FULLY_PAID: "FULLY_PAID",
  READY: "ORDER_READY",
  DELIVERED: "ORDER_DELIVERED",
  EXPIRED: "ORDER_EXPIRED",
  CANCELLED: "ORDER_CANCELLED",
  DESIGN_REJECTED: "DESIGN_REJECTED",
};

type OrderRow = Pick<
  Order,
  "id" | "code" | "email" | "customer_name" | "subtotal" | "paid_amount" | "prepay_amount" | "expires_at" | "fulfillment" | "access_token" | "customer_id"
>;

async function itemLabel(itemId: string, colors: { key: string; label: string }[]): Promise<string> {
  const { data } = await createServiceClient().from("order_items").select("color, size").eq("id", itemId).maybeSingle();
  if (!data) return "Áo custom";
  return `Áo custom · ${colorLabel(colors, data.color)} · ${data.size}`;
}

export async function notifyOrder(orderId: string, event: OrderEvent): Promise<void> {
  try {
    const [{ data }, settings] = await Promise.all([
      createServiceClient()
        .from("orders")
        .select("id, code, email, customer_name, subtotal, paid_amount, prepay_amount, expires_at, fulfillment, access_token, customer_id")
        .eq("id", orderId)
        .maybeSingle<OrderRow>(),
      getSettings(),
    ]);
    if (!data?.email) return;

    const paymentUrl = siteUrl(`/thanh-toan/${data.code}?t=${data.access_token}`);
    const orderUrl = data.customer_id ? siteUrl(`/tai-khoan/don-hang/${data.code}`) : paymentUrl;
    const remaining = formatVND(Math.max(0, data.subtotal - data.paid_amount));
    const vars: EmailVars = {
      ten_khach: data.customer_name,
      ma_don: data.code,
      tong_tien: formatVND(data.subtotal),
      da_tra: formatVND(data.paid_amount),
      con_lai: remaining,
      hinh_thuc_nhan: data.fulfillment === "PICKUP" ? "nhận tại campus" : "giao hàng",
      link_don_hang: event.kind === "CREATED" ? paymentUrl : orderUrl,
      so_tien_can_chuyen: formatVND(data.prepay_amount),
      han_thanh_toan: formatDate(data.expires_at),
    };
    if (event.kind === "CANCELLED") vars.ly_do = event.reason ?? "";
    if (event.kind === "DESIGN_REJECTED") {
      vars.ly_do = event.reason;
      vars.ten_ao = await itemLabel(event.itemId, settings.colors);
    }

    const block =
      event.kind === "CREATED"
        ? {
            kind: "payment" as const,
            qrUrl: isBankConfigured(settings.bank_sales) ? vietQrUrl(settings.bank_sales, data.prepay_amount, data.code) : null,
            bank: settings.bank_sales,
            code: data.code,
            amount: formatVND(data.prepay_amount),
            subtotal: formatVND(data.subtotal),
            remaining: formatVND(data.subtotal - data.prepay_amount),
            paymentUrl,
          }
        : { kind: "order" as const, code: data.code, subtotal: vars.tong_tien!, paid: vars.da_tra!, remaining, orderUrl };

    await sendTemplate(TEMPLATE_FOR[event.kind], data.email, vars, block);
  } catch (err) {
    console.error("[notify] order email failed", event.kind, err);
  }
}
