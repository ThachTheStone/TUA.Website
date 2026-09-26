import "server-only";
import { computeDiscount, isLiveWindow, type ComboRule, type DiscountResult, type PromoRule } from "@/lib/orders/discounts";
import type { PricedLine } from "@/lib/orders/pricing";
import type { Settings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import type { Combo, PromoCode } from "@/types/db";

// FR31 reads. Promo codes are never listed publicly; a buyer only learns about a code by typing it.

const COMBO_FIELDS = "id, name, description, price, items, starts_at, ends_at, is_active, sort_order, created_at";
const PROMO_FIELDS = "id, code, description, kind, value, max_discount, min_subtotal, max_uses, starts_at, ends_at, is_active, created_at";

export async function listCombos({ liveOnly = false } = {}): Promise<Combo[]> {
  let query = createServiceClient().from("combos").select(COMBO_FIELDS);
  if (liveOnly) query = query.eq("is_active", true);
  const { data, error } = await query.order("sort_order").order("created_at").returns<Combo[]>();
  if (error) throw new Error(`Không đọc được combo: ${error.message}`);
  return liveOnly ? (data ?? []).filter((c) => isLiveWindow(c)) : (data ?? []);
}

export async function listPromoCodes(): Promise<PromoCode[]> {
  const { data, error } = await createServiceClient()
    .from("promo_codes")
    .select(PROMO_FIELDS)
    .order("created_at", { ascending: false })
    .returns<PromoCode[]>();
  if (error) throw new Error(`Không đọc được mã giảm giá: ${error.message}`);
  return data ?? [];
}

/** promo code id → uses by orders that are not cancelled or expired. */
export async function promoUsage(): Promise<Map<string, number>> {
  const { data, error } = await createServiceClient().rpc("promo_code_usage");
  if (error) throw new Error(`Không đọc được lượt dùng mã: ${error.message}`);
  return new Map(((data ?? []) as { promo_code_id: string; used: number }[]).map((r) => [r.promo_code_id, r.used]));
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** A code the buyer may use right now, or a Vietnamese reason why not. */
export async function findUsablePromo(code: string): Promise<{ ok: true; promo: PromoRule } | { ok: false; error: string }> {
  const key = normalizeCode(code);
  if (!/^[A-Z0-9_-]{3,30}$/.test(key)) return { ok: false, error: "Mã giảm giá không hợp lệ" };
  const { data, error } = await createServiceClient()
    .from("promo_codes")
    .select(PROMO_FIELDS)
    .eq("code", key)
    .maybeSingle<PromoCode>();
  if (error) throw new Error(`Không đọc được mã giảm giá: ${error.message}`);
  if (!data || !data.is_active) return { ok: false, error: "Mã giảm giá không tồn tại hoặc đã ngừng áp dụng" };
  const now = Date.now();
  if (data.starts_at && new Date(data.starts_at).getTime() > now) return { ok: false, error: "Mã giảm giá chưa đến thời gian áp dụng" };
  if (data.ends_at && new Date(data.ends_at).getTime() < now) return { ok: false, error: "Mã giảm giá đã hết hạn" };
  if (data.max_uses !== null && ((await promoUsage()).get(data.id) ?? 0) >= data.max_uses) {
    return { ok: false, error: "Mã giảm giá đã hết lượt sử dụng" };
  }
  return { ok: true, promo: data };
}

export function toComboRules(combos: Combo[]): ComboRule[] {
  return combos.map(({ id, name, price, items }) => ({ id, name, price, items }));
}

/**
 * Server-side discount for an order: live combos plus the typed code (if any).
 * An unusable code is an error so the buyer isn't charged more than the page showed.
 */
export async function resolveDiscount(
  lines: PricedLine[],
  settings: Pick<Settings, "prices">,
  code: string | undefined,
): Promise<{ ok: true; data: DiscountResult } | { ok: false; error: string }> {
  let promo: PromoRule | null = null;
  if (code?.trim()) {
    const found = await findUsablePromo(code);
    if (!found.ok) return found;
    promo = found.promo;
  }
  const combos = toComboRules(await listCombos({ liveOnly: true }));
  return { ok: true, data: computeDiscount(lines, settings.prices, combos, promo) };
}

/** create_order's exceptions → Vietnamese messages. */
export function discountRpcError(message: string | undefined): string | null {
  if (!message) return null;
  if (message.includes("PROMO_USED_UP")) return "Mã giảm giá vừa hết lượt sử dụng. Vui lòng bỏ mã và đặt lại.";
  if (message.includes("PROMO_INVALID")) return "Mã giảm giá đã ngừng áp dụng. Vui lòng bỏ mã và đặt lại.";
  if (message.includes("BLINDBOX_SOLD_OUT")) return "Blindbox không còn đủ số lượng. Vui lòng giảm số lượng trong giỏ hàng.";
  if (message.includes("BLINDBOX_OFF")) return "Blindbox đã ngừng bán. Vui lòng xóa khỏi giỏ hàng.";
  return null;
}
