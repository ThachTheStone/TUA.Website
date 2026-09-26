import "server-only";
import { checkBlindboxQuantity } from "@/lib/blindbox";
import { foreignAssets } from "@/lib/design/assets.server";
import { discountRpcError, resolveDiscount } from "@/lib/discounts/queries";
import { collectUploadedDesign, type UploadedDesign } from "@/lib/orders/design-upload";
import { createOrderSchema, formatPickupTime, type CreateOrderInput } from "@/lib/orders/checkout-schema";
import { prepayAmount, unitPrice } from "@/lib/orders/pricing";
import { orderablePrototypes } from "@/lib/prototypes/queries";
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
  phone: string;
  customerName: string;
  subtotal: number;
  prepayAmount: number;
  expiresAt: string;
};

/** `customerId`: the signed-in buyer placing the order (FR26). */
export async function createWebOrder(
  input: CreateOrderInput,
  customerId: string,
): Promise<ActionResult<CreatedOrder>> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { form, items, promoCode } = parsed.data;

  const settings = await getSettings();
  if (!isBankConfigured(settings.bank_sales)) {
    return { ok: false, error: "Hệ thống chưa sẵn sàng nhận thanh toán. Vui lòng liên hệ Ban tổ chức." };
  }

  // FR27: a prototype line takes its colour from the prototype, which must still be on sale.
  const protos = await orderablePrototypes(
    items.flatMap((i) => (i.type === "PROTOTYPE" && i.prototypeId ? [i.prototypeId] : [])),
    settings,
  );
  if (!protos.ok) return protos;

  const colorKeys = new Set(settings.colors.map((c) => c.key));
  const designs = new Map<string, UploadedDesign>();
  for (const item of items) {
    if (item.type === "BLINDBOX") {
      item.color = "";
      item.size = "";
      continue;
    }
    if (item.type === "PROTOTYPE") {
      if (!item.prototypeId) return { ok: false, error: "Thiếu áo mẫu trong giỏ hàng" };
      item.color = protos.colors.get(item.prototypeId)!;
    }
    if (!colorKeys.has(item.color) || !settings.sizes.includes(item.size)) {
      return { ok: false, error: "Màu hoặc size trong giỏ hàng không còn được bán. Vui lòng cập nhật giỏ hàng." };
    }
    if (item.type === "CUSTOM") {
      if (!item.uploadId || designs.has(item.uploadId)) {
        return { ok: false, error: "Thiếu thiết kế cho áo custom" };
      }
      const design = await collectUploadedDesign(item.uploadId, settings);
      if (!design) return { ok: false, error: "Thiết kế chưa được tải lên đầy đủ. Vui lòng thử lại." };
      // BR01: a design may only use photos this buyer uploaded.
      if ((await foreignAssets(design.canvas_json.assets, customerId)).length) {
        return { ok: false, error: "Thiết kế có ảnh không thuộc tài khoản của bạn. Vui lòng chèn lại ảnh." };
      }
      designs.set(item.uploadId, design);
    }
  }

  const boxProblem = await checkBlindboxQuantity(items.reduce((n, i) => n + (i.type === "BLINDBOX" ? i.quantity : 0), 0));
  if (boxProblem) return { ok: false, error: boxProblem };

  const discount = await resolveDiscount(items, settings, promoCode);
  if (!discount.ok) return discount;

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

  const { itemsTotal, discount: discountAmount, total: subtotal, note: discountNote, promo } = discount.data;
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
      preferred_time: isDelivery ? form.preferred_time || null : formatPickupTime(form.pickup_date, form.pickup_time),
      pickup_location: isDelivery ? null : form.pickup_location,
      note: form.note || null,
      items_total: itemsTotal,
      discount_amount: discountAmount,
      discount_note: discountNote,
      promo_code_id: promo?.id ?? null,
      subtotal,
      prepay_percent: form.prepay_percent,
      prepay_amount: prepay,
      expires_at: expiresAt,
      customer_id: customerId,
      history_note: "Khách đặt hàng trên website",
    },
    p_items: items.map((item) => ({
      type: item.type,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      unit_price: unitPrice(item.type, settings.prices), // BR09: price locked into the order
      design: item.type === "CUSTOM" ? designs.get(item.uploadId!) : null,
      // The RPC links the prototype's current print files (and re-checks it is active).
      prototype_id: item.type === "PROTOTYPE" ? item.prototypeId : null,
    })),
  });
  if (error || !data) {
    const known = discountRpcError(error?.message);
    if (known) return { ok: false, error: known };
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
      phone: form.phone,
      customerName: form.customer_name,
      subtotal,
      prepayAmount: prepay,
      expiresAt,
    },
  };
}
