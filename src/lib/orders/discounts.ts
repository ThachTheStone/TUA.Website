import { formatVND } from "@/lib/format";
import { subtotalOf, unitPrice, type PricedLine, type Prices } from "@/lib/orders/pricing";
import type { Combo, ItemType, PromoCode } from "@/types/db";

// FR31: combos and promo codes. Pure, so the cart shows the same numbers the server
// charges; the server always recomputes with rules it loads itself (hard rule 4).
// A code and combos never stack: whichever saves the buyer more is applied.

export type ComboRule = Pick<Combo, "id" | "name" | "price" | "items">;
export type PromoRule = Pick<PromoCode, "id" | "code" | "kind" | "value" | "max_discount" | "min_subtotal">;

export const COMBO_ITEM_LABEL: Record<ItemType, string> = {
  CUSTOM: "Áo custom",
  PROTOTYPE: "Áo mẫu",
  PLAIN: "Áo trơn",
  BLINDBOX: "Blindbox",
};

/** An order never drops below this after discount (keeps a real transfer and deposit). */
export const MIN_PAYABLE = 1000;

export type AppliedCombo = { id: string; name: string; times: number; saving: number };

export type DiscountResult = {
  itemsTotal: number;
  discount: number;
  /** What the buyer owes. */
  total: number;
  combos: AppliedCombo[];
  /** Set when the code is the discount that was applied. */
  promo: { id: string; code: string; discount: number } | null;
  /** Why the typed code gives nothing (below minimum, combos better…). */
  promoProblem: string | null;
  /** Stored on the order, e.g. "Combo Áo + Blindbox ×2". */
  note: string | null;
};

/** Within its optional date range. */
export function isLiveWindow(rule: { starts_at: string | null; ends_at: string | null }, now = Date.now()): boolean {
  if (rule.starts_at && new Date(rule.starts_at).getTime() > now) return false;
  if (rule.ends_at && new Date(rule.ends_at).getTime() < now) return false;
  return true;
}

/** Normal price of one bundle minus the combo price. */
export function comboSaving(combo: Pick<ComboRule, "price" | "items">, prices: Prices): number {
  return combo.items.reduce((sum, i) => sum + unitPrice(i.type, prices) * i.quantity, 0) - combo.price;
}

/** Greedy: the combo saving the most per bundle is taken as many times as the cart allows, then the next. */
function applyCombos(lines: PricedLine[], prices: Prices, combos: ComboRule[]): AppliedCombo[] {
  const left = new Map<ItemType, number>();
  for (const l of lines) left.set(l.type, (left.get(l.type) ?? 0) + l.quantity);

  const ranked = combos
    .map((c) => ({ c, saving: comboSaving(c, prices) }))
    .filter((x) => x.saving > 0 && x.c.items.length)
    .sort((a, b) => b.saving - a.saving);

  const applied: AppliedCombo[] = [];
  for (const { c, saving } of ranked) {
    const times = Math.min(...c.items.map((i) => Math.floor((left.get(i.type) ?? 0) / i.quantity)));
    if (times <= 0) continue;
    for (const i of c.items) left.set(i.type, left.get(i.type)! - i.quantity * times);
    applied.push({ id: c.id, name: c.name, times, saving: saving * times });
  }
  return applied;
}

function promoDiscount(promo: PromoRule, itemsTotal: number): number {
  const raw = promo.kind === "PERCENT" ? Math.floor((itemsTotal * promo.value) / 100) : promo.value;
  return promo.max_discount ? Math.min(raw, promo.max_discount) : raw;
}

export function computeDiscount(lines: PricedLine[], prices: Prices, combos: ComboRule[], promo: PromoRule | null): DiscountResult {
  const itemsTotal = subtotalOf(lines, prices);
  const cap = Math.max(0, itemsTotal - MIN_PAYABLE);
  const applied = applyCombos(lines, prices, combos);
  const comboTotal = Math.min(cap, applied.reduce((sum, c) => sum + c.saving, 0));

  let promoProblem: string | null = null;
  let promoTotal = 0;
  if (promo) {
    if (itemsTotal < promo.min_subtotal) {
      promoProblem = `Mã ${promo.code} áp dụng cho đơn từ ${formatVND(promo.min_subtotal)}`;
    } else {
      promoTotal = Math.min(cap, promoDiscount(promo, itemsTotal));
      if (promoTotal <= comboTotal) {
        promoProblem = `Mã ${promo.code} không cộng dồn với combo. Combo đang có lợi hơn nên được áp dụng.`;
        promoTotal = 0;
      }
    }
  }

  if (promoTotal > 0) {
    return {
      itemsTotal,
      discount: promoTotal,
      total: itemsTotal - promoTotal,
      combos: [],
      promo: { id: promo!.id, code: promo!.code, discount: promoTotal },
      promoProblem: null,
      note: `Mã ${promo!.code}`,
    };
  }
  return {
    itemsTotal,
    discount: comboTotal,
    total: itemsTotal - comboTotal,
    combos: comboTotal > 0 ? applied : [],
    promo: null,
    promoProblem,
    note: comboTotal > 0 ? applied.map((c) => `Combo ${c.name} ×${c.times}`).join("; ") : null,
  };
}

/** "1 Áo custom + 1 Blindbox" */
export function comboContents(items: ComboRule["items"]): string {
  return items.map((i) => `${i.quantity} ${COMBO_ITEM_LABEL[i.type]}`).join(" + ");
}

/** "Giảm 10% (tối đa 30.000đ)" / "Giảm 20.000đ" */
export function promoSummary(p: Pick<PromoCode, "kind" | "value" | "max_discount" | "min_subtotal">): string {
  const main = p.kind === "PERCENT" ? `Giảm ${p.value}%${p.max_discount ? ` (tối đa ${formatVND(p.max_discount)})` : ""}` : `Giảm ${formatVND(p.value)}`;
  return p.min_subtotal > 0 ? `${main} cho đơn từ ${formatVND(p.min_subtotal)}` : main;
}
