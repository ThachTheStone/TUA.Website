"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getCustomer } from "@/lib/customers/session";
import { findUsablePromo } from "@/lib/discounts/queries";
import type { PromoRule } from "@/lib/orders/discounts";
import { orderCodeSchema, phoneSchema, type CreateOrderInput } from "@/lib/orders/checkout-schema";
import { createWebOrder } from "@/lib/orders/create";
import { saveDesignFile } from "@/lib/orders/design-upload";
import { notifyOrder } from "@/lib/orders/notify";
import { findOrderIdByToken, isOverdue, lookupOrder, type OrderView } from "@/lib/orders/queries";
import { resubmitDesign } from "@/lib/orders/resubmit";
import { transitionOrder } from "@/lib/orders/transition";
import { getSettings } from "@/lib/settings";
import { syncSheetsLater } from "@/lib/sheets";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";

// Public (customer) server actions. Placing an order needs a signed-in buyer (FR26).
// Paying and looking up are proven by the payment-link token or code + phone.

const LOGIN_REQUIRED = "Vui lòng đăng nhập để đặt hàng";

const uploadSchema = z.object({
  uploadId: z.uuid(),
  kind: z.enum(["area", "preview", "json"]),
  area: z.string().max(50).optional(),
});

/** Stores one canvas export (print PNG, preview PNG or design JSON) for a custom shirt. */
export async function uploadDesignFile(formData: FormData): Promise<ActionResult> {
  if (!(await getCustomer())) return { ok: false, error: LOGIN_REQUIRED };
  const parsed = uploadSchema.safeParse({
    uploadId: formData.get("uploadId"),
    kind: formData.get("kind"),
    area: formData.get("area") ?? undefined,
  });
  const file = formData.get("file");
  if (!parsed.success || !(file instanceof File)) return { ok: false, error: "Dữ liệu thiết kế không hợp lệ" };

  try {
    const error = await saveDesignFile({ ...parsed.data, file }, await getSettings());
    return error ? { ok: false, error } : { ok: true, data: undefined };
  } catch (err) {
    console.error("[designs] upload failed", err);
    return { ok: false, error: "Không tải được thiết kế lên. Vui lòng thử lại." };
  }
}

export type CreateOrderResult = { code: string; token: string };

export async function createOrder(input: CreateOrderInput): Promise<ActionResult<CreateOrderResult>> {
  const session = await getCustomer();
  if (!session) return { ok: false, error: LOGIN_REQUIRED };
  try {
    const result = await createWebOrder(input, session.userId);
    if (!result.ok) return result;
    const order = result.data;

    // FR07/FR24: confirmation email after the response (never fails the order).
    after(async () => {
      // FR26: Google sign-ups give their phone at checkout; keep it on the account.
      if (!session.customer.phone) {
        const { error } = await createServiceClient()
          .from("customers")
          .update({ phone: order.phone })
          .eq("id", session.userId)
          .is("phone", null);
        if (error) console.error("[orders] save customer phone failed", error.message);
      }

      await notifyOrder(order.id, { kind: "CREATED" });
    });
    syncSheetsLater();

    return { ok: true, data: { code: order.code, token: order.accessToken } };
  } catch (err) {
    console.error("[orders] createOrder failed", err);
    return { ok: false, error: "Không tạo được đơn hàng. Vui lòng thử lại." };
  }
}

/** FR31: checkout preview of a promo code. createOrder checks it again. */
export async function checkPromoCode(code: string): Promise<ActionResult<PromoRule>> {
  if (!(await getCustomer())) return { ok: false, error: LOGIN_REQUIRED };
  try {
    const found = await findUsablePromo(String(code ?? ""));
    if (!found.ok) return found;
    const { id, code: key, kind, value, max_discount, min_subtotal } = found.promo;
    return { ok: true, data: { id, code: key, kind, value, max_discount, min_subtotal } };
  } catch (err) {
    console.error("[orders] checkPromoCode failed", err);
    return { ok: false, error: "Không kiểm tra được mã giảm giá. Vui lòng thử lại." };
  }
}

/** "Tôi đã chuyển khoản": PENDING_PAYMENT → PAYMENT_REVIEW. */
export async function markTransferred(code: string, token: string): Promise<ActionResult> {
  try {
    const order = await findOrderIdByToken(String(code), String(token));
    if (!order) return { ok: false, error: "Không tìm thấy đơn hàng" };
    if (order.status === "PAYMENT_REVIEW") return { ok: true, data: undefined };
    if (isOverdue(order)) {
      return { ok: false, error: "Đơn đã quá hạn thanh toán. Nếu bạn đã chuyển khoản, vui lòng liên hệ Ban tổ chức." };
    }
    const result = await transitionOrder(order.id, "PAYMENT_REVIEW", { note: "Khách báo đã chuyển khoản" });
    return result.ok ? { ok: true, data: undefined } : result;
  } catch (err) {
    console.error("[orders] markTransferred failed", err);
    return { ok: false, error: "Không cập nhật được đơn hàng. Vui lòng thử lại." };
  }
}

const lookupSchema = z.object({ code: orderCodeSchema, phone: phoneSchema });

/** FR11: order lookup by code + phone. */
export async function lookupOrderAction(input: { code: string; phone: string }): Promise<ActionResult<OrderView>> {
  const parsed = lookupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const order = await lookupOrder(parsed.data.code, parsed.data.phone);
    if (!order) return { ok: false, error: "Không tìm thấy đơn hàng khớp với mã đơn và số điện thoại" };
    return { ok: true, data: order };
  } catch (err) {
    console.error("[orders] lookup failed", err);
    return { ok: false, error: "Không tra cứu được đơn hàng. Vui lòng thử lại." };
  }
}

const resubmitSchema = z.object({ code: orderCodeSchema, itemId: z.uuid(), uploadId: z.uuid() });

/** FR29: the signed-in buyer sends a fixed design for a rejected shirt back for approval. */
export async function resubmitDesignAction(input: { code: string; itemId: string; uploadId: string }): Promise<ActionResult> {
  const session = await getCustomer();
  if (!session) return { ok: false, error: "Vui lòng đăng nhập lại" };
  const parsed = resubmitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dữ liệu không hợp lệ" };
  try {
    const { code, itemId, uploadId } = parsed.data;
    const result = await resubmitDesign(session.userId, code, itemId, uploadId);
    if (result.ok) revalidatePath(`/tai-khoan/don-hang/${code}`);
    return result;
  } catch (err) {
    console.error("[orders] resubmit failed", err);
    return { ok: false, error: "Không gửi lại được thiết kế. Vui lòng thử lại." };
  }
}
