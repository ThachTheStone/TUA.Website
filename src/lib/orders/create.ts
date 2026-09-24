import "server-only";
import { collectUploadedDesign, type UploadedDesign } from "@/lib/orders/design-upload";
import { createOrderSchema, type CreateOrderInput } from "@/lib/orders/checkout-schema";
import { prepayAmount, subtotalOf, unitPrice } from "@/lib/orders/pricing";
import { getSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import { isBankConfigured } from "@/lib/vietqr";
import type { ActionResult } from "@/types/action";

// FR07 web checkout. Hard rule 4: every amount is recomputed here from settings;
// nothing money-related is read from the client.

export type CreatedOrder = {
  id: string;
  code: string;
  accessToken: string;
  email: string;
  customerName: string;
  subtotal: number;
  prepayAmount: number;
  expiresAt: string;
};

export async function createWebOrder(input: CreateOrderInput): Promise<ActionResult<CreatedOrder>> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { form, items } = parsed.data;

  const settings = await getSettings();
  if (!isBankConfigured(settings.bank_sales)) {
    return { ok: false, error: "Hệ thống chưa sẵn sàng nhận thanh toán. Vui lòng liên hệ Ban tổ chức." };
  }

  const colorKeys = new Set(settings.colors.map((c) => c.key));
  const designs = new Map<string, UploadedDesign>();
  for (const item of items) {
    if (!colorKeys.has(item.color) || !settings.sizes.includes(item.size)) {
      return { ok: false, error: "Màu hoặc size trong giỏ hàng không còn được bán. Vui lòng cập nhật giỏ hàng." };
    }
    if (item.type === "CUSTOM") {
      if (!item.uploadId || designs.has(item.uploadId)) {
        return { ok: false, error: "Thiếu thiết kế cho áo custom" };
      }
      const design = await collectUploadedDesign(item.uploadId, settings);
      if (!design) return { ok: false, error: "Thiết kế chưa được tải lên đầy đủ. Vui lòng thử lại." };
      designs.set(item.uploadId, design);
    }
  }

  const db = createServiceClient();
  // An upload folder belongs to exactly one order.
  const paths = [...designs.values()].flatMap((d) => d.files.map((f) => f.file_path));
  if (paths.length) {
    const { count, error } = await db
      .from("design_files")
      .select("id", { count: "exact", head: true })
      .in("file_path", paths);
    if (error) return { ok: false, error: "Không kiểm tra được thiết kế. Vui lòng thử lại." };
    if (count) return { ok: false, error: "Thiết kế này đã được dùng cho một đơn khác. Vui lòng đặt lại." };
  }

  const subtotal = subtotalOf(items, settings.prices);
  const prepay = prepayAmount(subtotal, form.prepay_percent);
  const expiresAt = new Date(Date.now() + settings.order_expire_hours * 3600_000).toISOString();
  const isDelivery = form.fulfillment === "DELIVERY";

  const { data, error } = await db.rpc("create_order", {
    p_order: {
      source: "WEB",
      customer_name: form.customer_name,
      phone: form.phone,
      email: form.email,
      fulfillment: form.fulfillment,
      address: isDelivery ? form.address : null,
      preferred_time: form.preferred_time || null,
      pickup_location: isDelivery ? null : form.pickup_location,
      note: form.note || null,
      subtotal,
      prepay_percent: form.prepay_percent,
      prepay_amount: prepay,
      expires_at: expiresAt,
      history_note: "Khách đặt hàng trên website",
    },
    p_items: items.map((item) => ({
      type: item.type,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      unit_price: unitPrice(item.type, settings.prices), // BR09: price locked into the order
      design: item.type === "CUSTOM" ? designs.get(item.uploadId!) : null,
    })),
  });
  if (error || !data) {
    console.error("[orders] create_order failed", error?.message);
    return { ok: false, error: "Không tạo được đơn hàng. Vui lòng thử lại." };
  }

  const created = data as { id: string; code: string; access_token: string };
  return {
    ok: true,
    data: {
      id: created.id,
      code: created.code,
      accessToken: created.access_token,
      email: form.email,
      customerName: form.customer_name,
      subtotal,
      prepayAmount: prepay,
      expiresAt,
    },
  };
}
