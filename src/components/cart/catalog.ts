import type { CartItem } from "@/lib/cart/store";
import type { ColorOption } from "@/components/public/shirt-options";
import type { CanvasPrintArea } from "@/lib/design/types";
import { shirtsLeft, stockKey, type ShirtStock } from "@/lib/inventory";
import type { ComboRule } from "@/lib/orders/discounts";
import { subtotalOf, unitPrice, type Prices } from "@/lib/orders/pricing";
import type { ItemType } from "@/types/db";

/** A prototype ("Áo mẫu", FR27) as the cart and workshop form see it. */
export type ProtoSummary = {
  id: string;
  slug: string;
  name: string;
  color: string;
  image: string | null;
  active: boolean;
  /** Pieces left under the prototype's cap; null = no cap. */
  left: number | null;
};

/** The slice of settings the cart pages need. Prices here are for display only. */
export type Catalog = {
  prices: Prices;
  colors: ColorOption[];
  sizes: string[];
  printAreas: CanvasPrintArea[];
  dpi: number;
  /** Every prototype, inactive ones included so the cart can flag them (FR06). */
  prototypes: ProtoSummary[];
  /** FR31: combos live right now (the server recomputes at checkout). */
  combos: ComboRule[];
  /** FR32: null when the page doesn't need it. */
  blindbox: BlindboxSummary | null;
  /** Blank shirts left per tracked colour × size (untracked = unlimited). */
  shirtStock: ShirtStock;
};

export type BlindboxSummary = { name: string; image: string | null; active: boolean; remaining: number };

export const TYPE_LABEL: Record<ItemType, string> = {
  PLAIN: "Áo trơn",
  CUSTOM: "Áo custom",
  PROTOTYPE: "Áo mẫu",
  BLINDBOX: "Blindbox Hot Wheels",
};

/** "Màu Đen · Size M", or "" for a blindbox (no colour or size). */
export function variantText(item: { type: ItemType; size: string }, colorName: string): string {
  return item.type === "BLINDBOX" ? "" : `Màu ${colorName} · Size ${item.size}`;
}

export function findPrototype(catalog: Pick<Catalog, "prototypes">, id: string | undefined): ProtoSummary | undefined {
  return id ? catalog.prototypes.find((p) => p.id === id) : undefined;
}

/** The colour a shirt line is printed on (a prototype's own colour). */
export function lineColor(item: CartItem, catalog: Pick<Catalog, "prototypes">): string {
  return item.type === "PROTOTYPE" ? (findPrototype(catalog, item.prototypeId)?.color ?? item.color) : item.color;
}

/** Why a line can't be ordered as it is, or null. */
export type LineProblem =
  | { kind: "gone" }
  | { kind: "shirt"; left: number }
  | { kind: "proto"; left: number }
  | { kind: "box" };

/**
 * Lines that can't be ordered as they are: colour or size no longer sold (settings changed
 * after adding to cart), a prototype that was removed or deactivated (FR06), or more shirts
 * than are left. Lines of the same colour × size (or prototype) are added up.
 */
export function cartProblems(items: CartItem[], catalog: Catalog): Map<string, LineProblem> {
  const shirtNeed = new Map<string, number>();
  const protoNeed = new Map<string, number>();
  for (const i of items) {
    if (i.type === "BLINDBOX") continue;
    const key = stockKey(lineColor(i, catalog), i.size);
    shirtNeed.set(key, (shirtNeed.get(key) ?? 0) + i.quantity);
    if (i.prototypeId) protoNeed.set(i.prototypeId, (protoNeed.get(i.prototypeId) ?? 0) + i.quantity);
  }

  const out = new Map<string, LineProblem>();
  for (const i of items) {
    if (i.type === "BLINDBOX") {
      const box = catalog.blindbox;
      if (box && (!box.active || i.quantity > box.remaining)) out.set(i.id, { kind: "box" });
      continue;
    }
    const proto = i.type === "PROTOTYPE" ? findPrototype(catalog, i.prototypeId) : undefined;
    const color = lineColor(i, catalog);
    if (!catalog.sizes.includes(i.size) || !catalog.colors.some((c) => c.key === color) || (i.type === "PROTOTYPE" && !proto?.active)) {
      out.set(i.id, { kind: "gone" });
      continue;
    }
    const shirts = shirtsLeft(catalog.shirtStock, color, i.size);
    if (shirts !== null && shirtNeed.get(stockKey(color, i.size))! > shirts) {
      out.set(i.id, { kind: "shirt", left: shirts });
    } else if (proto && proto.left !== null && protoNeed.get(proto.id)! > proto.left) {
      out.set(i.id, { kind: "proto", left: proto.left });
    }
  }
  return out;
}

export function cartSubtotal(items: CartItem[], catalog: Catalog): number {
  return subtotalOf(items, catalog.prices);
}

export function linePrice(type: ItemType, catalog: Catalog): number {
  return unitPrice(type, catalog.prices);
}

/** Picks the catalog out of the full settings (call on the server, pass to the client). */
export function toCatalog(
  settings: {
    prices: Prices;
    colors: ColorOption[];
    sizes: string[];
    print_areas: CanvasPrintArea[];
    export_dpi: number;
  },
  prototypes: ProtoSummary[],
  extras: { combos?: ComboRule[]; blindbox?: BlindboxSummary | null; shirtStock?: ShirtStock } = {},
): Catalog {
  return {
    prices: settings.prices,
    colors: settings.colors,
    sizes: settings.sizes,
    printAreas: settings.print_areas,
    dpi: settings.export_dpi,
    prototypes,
    combos: extras.combos ?? [],
    blindbox: extras.blindbox ?? null,
    shirtStock: extras.shirtStock ?? {},
  };
}
