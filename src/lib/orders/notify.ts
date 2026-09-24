import "server-only";
import {
  sendDesignRejected,
  sendOrderCancelled,
  sendOrderDelivered,
  sendOrderReady,
  sendPaymentConfirmed,
  siteUrl,
  type OrderEmailBase,
} from "@/lib/email";
import { getSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";

// Customer emails after admin actions (FR15, FR29). Called inside after(): never throws
// and never blocks the action (hard rule 7).

export type OrderEvent =
  | { kind: "DEPOSIT_PAID" | "FULLY_PAID" | "READY" | "DELIVERED" }
  | { kind: "CANCELLED"; reason: string | null }
  | { kind: "DESIGN_REJECTED"; itemId: string; reason: string };

async function loadBase(orderId: string): Promise<OrderEmailBase | null> {
  const { data } = await createServiceClient()
    .from("orders")
    .select("code, email, customer_name, subtotal, paid_amount, access_token, customer_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!data?.email) return null;
  return {
    to: data.email,
    customerName: data.customer_name,
    code: data.code,
    subtotal: data.subtotal,
    paidAmount: data.paid_amount,
    orderUrl: data.customer_id
      ? siteUrl(`/tai-khoan/don-hang/${data.code}`)
      : siteUrl(`/thanh-toan/${data.code}?t=${data.access_token}`),
  };
}

async function itemLabel(itemId: string): Promise<string> {
  const [{ data }, settings] = await Promise.all([
    createServiceClient().from("order_items").select("color, size").eq("id", itemId).maybeSingle(),
    getSettings(),
  ]);
  if (!data) return "áo custom";
  const color = settings.colors.find((c) => c.key === data.color)?.label ?? data.color;
  return `Áo custom · ${color} · ${data.size}`;
}

export async function notifyOrder(orderId: string, event: OrderEvent): Promise<void> {
  try {
    const base = await loadBase(orderId);
    if (!base) return;
    switch (event.kind) {
      case "DEPOSIT_PAID":
      case "FULLY_PAID":
        await sendPaymentConfirmed({ ...base, full: event.kind === "FULLY_PAID" });
        break;
      case "READY":
        await sendOrderReady(base);
        break;
      case "DELIVERED":
        await sendOrderDelivered(base);
        break;
      case "CANCELLED":
        await sendOrderCancelled({ ...base, reason: event.reason });
        break;
      case "DESIGN_REJECTED":
        await sendDesignRejected({ ...base, reason: event.reason, itemLabel: await itemLabel(event.itemId) });
        break;
    }
  } catch (err) {
    console.error("[notify] order email failed", event.kind, err);
  }
}
