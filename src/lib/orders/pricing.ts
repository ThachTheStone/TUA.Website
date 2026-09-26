import type { ItemType } from "@/types/db";

// Money is integer VND. The server recomputes everything with these helpers from
// `settings.prices` (hard rule 4); the client uses them only to display estimates.

export const PREPAY_PERCENTS = [50, 75, 100] as const;
export type PrepayPercent = (typeof PREPAY_PERCENTS)[number];

/** Minimum share of the subtotal that must be paid before production (BR02). */
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

/** Minimum paid amount for an order to be confirmed (BR02). */
export function minConfirmAmount(subtotal: number): number {
  return Math.ceil((subtotal * MIN_PREPAY_PERCENT) / 100);
}
