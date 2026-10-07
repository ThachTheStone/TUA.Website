import type { ItemType } from "@/types/db";

// Money is integer VND. The server recomputes everything with these helpers from
// `settings.prices` (hard rule 4); the client uses them only to display estimates.

export const PREPAY_PERCENTS = [50, 75, 100] as const;
export type PrepayPercent = (typeof PREPAY_PERCENTS)[number];
/** `prepay_percent` = 0: the buyer typed their own deposit amount (≥ 50%, BR02; migration 0018). */
export const PREPAY_CUSTOM = 0;
export type PrepayChoice = PrepayPercent | typeof PREPAY_CUSTOM;
export const isPrepayChoice = (v: number): v is PrepayChoice => v === PREPAY_CUSTOM || (PREPAY_PERCENTS as readonly number[]).includes(v);

/** Standard deposit share (BR02). Staff may still record a smaller real transfer, with a warning. */
export const MIN_PREPAY_PERCENT = 50;

export type PricedLine = { type: ItemType; quantity: number };
/** `settings.prices`: plain, custom and blindbox have their own price. */
export type Prices = { PLAIN: number; CUSTOM: number; BLINDBOX: number };

/** A prototype ("Áo mẫu") always costs the same as a custom shirt (BR09). */
export function unitPrice(type: ItemType, prices: Prices): number {
  if (type === "PLAIN") return prices.PLAIN;
  if (type === "BLINDBOX") return prices.BLINDBOX;
  return prices.CUSTOM;
}

export function subtotalOf(lines: PricedLine[], prices: Prices): number {
  return lines.reduce((sum, l) => sum + unitPrice(l.type, prices) * l.quantity, 0);
}

/** Amount to transfer now, rounded up to the next 1.000đ (FR07). */
export function prepayAmount(subtotal: number, percent: number): number {
  return Math.ceil((subtotal * percent) / 100 / 1000) * 1000;
}

/** The standard 50% deposit (BR02); below it the admin forms warn instead of blocking. */
export function minConfirmAmount(subtotal: number): number {
  return Math.ceil((subtotal * MIN_PREPAY_PERCENT) / 100);
}

/** "Số tiền khác": allowed from the 50% deposit (BR02) up to the whole order. */
export function customPrepayIssue(amount: number, subtotal: number): string | null {
  const min = minConfirmAmount(subtotal);
  if (!Number.isInteger(amount) || amount <= 0) return "Vui lòng nhập số tiền muốn chuyển trước";
  if (amount < min || amount > subtotal) return `Số tiền chuyển trước từ ${min.toLocaleString("vi-VN")}đ (50%) đến ${subtotal.toLocaleString("vi-VN")}đ`;
  return null;
}

/** Amount to transfer now for a choice: a percentage, or the buyer's own amount. */
export function prepayFor(subtotal: number, percent: number, customAmount: number): number {
  return percent === PREPAY_CUSTOM ? customAmount : Math.min(subtotal, prepayAmount(subtotal, percent));
}
