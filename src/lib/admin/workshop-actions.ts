"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { findUsablePromo } from "@/lib/discounts/queries";
import type { PromoRule } from "@/lib/orders/discounts";
import { notifyOrder } from "@/lib/orders/notify";
import { createScanSlot, createWorkshopOrder, type WorkshopOrderInput } from "@/lib/orders/workshop";
import { getSettings } from "@/lib/settings";
import { syncSheetsLater } from "@/lib/sheets";
import { requireRole } from "@/lib/supabase/auth";
import { isBankConfigured } from "@/lib/vietqr";
import type { ActionResult } from "@/types/action";

// FR16 server actions. Staff only (hard rule 8).

/** A one-time upload URL for one scan; the browser uploads the file itself (see createScanSlot). */
export async function prepareScanUpload(input: { contentType: string; size: number }): Promise<ActionResult<{ path: string; token: string }>> {
  await requireRole();
  if (typeof input?.contentType !== "string" || !Number.isInteger(input.size) || input.size <= 0) {
    return { ok: false, error: "Chưa chọn ảnh scan" };
  }
  return createScanSlot(input.contentType, input.size);
}

/** FR31: preview a promo code in the workshop form. The order checks it again. */
export async function checkWorkshopPromo(code: string): Promise<ActionResult<PromoRule>> {
  await requireRole();
  const found = await findUsablePromo(String(code ?? ""));
  if (!found.ok) return found;
  const { id, code: key, kind, value, max_discount, min_subtotal } = found.promo;
  return { ok: true, data: { id, code: key, kind, value, max_discount, min_subtotal } };
}

/** `paymentPath`: transfer orders go on to the buyer's QR page, like a website order (FR16). */
export async function submitWorkshopOrder(input: WorkshopOrderInput): Promise<ActionResult<{ code: string; paymentPath: string | null }>> {
  const staff = await requireRole();
  const settings = await getSettings();
  if (input.method === "TRANSFER" && !isBankConfigured(settings.bank_sales)) {
    return { ok: false, error: "Chưa cấu hình tài khoản ngân hàng bán hàng trong Cài đặt" };
  }

  const result = await createWorkshopOrder(input, staff.userId);
  if (!result.ok) return result;
  const order = result.data;

  after(async () => {
    if (order.method === "CASH") {
      await notifyOrder(order.id, { kind: order.fullyPaid ? "FULLY_PAID" : "DEPOSIT_PAID" });
    } else {
      await notifyOrder(order.id, { kind: "CREATED" });
    }
  });
  syncSheetsLater();

  revalidatePath("/admin/don-hang");
  revalidatePath("/admin");
  const paymentPath = order.method === "TRANSFER" ? `/thanh-toan/${order.code}?t=${order.accessToken}` : null;
  return { ok: true, data: { code: order.code, paymentPath } };
}
