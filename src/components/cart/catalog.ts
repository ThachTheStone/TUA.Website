import type { CartItem } from "@/lib/cart/store";
import type { ColorOption } from "@/components/public/shirt-options";
import type { CanvasPrintArea } from "@/lib/design/types";
import { subtotalOf, unitPrice, type Prices } from "@/lib/orders/pricing";
import type { ItemType } from "@/types/db";

/** A prototype ("Áo mẫu", FR27) as the cart and workshop form see it. */
export type ProtoSummary = { id: string; slug: string; name: string; color: string; image: string | null; active: boolean };

/** The slice of settings the cart pages need. Prices here are for display only. */
export type Catalog = {
  prices: Prices;
  colors: ColorOption[];
  sizes: string[];
  printAreas: CanvasPrintArea[];
  dpi: number;
  /** Every prototype, inactive ones included so the cart can flag them (FR06). */
  prototypes: ProtoSummary[];
};

export const TYPE_LABEL: Record<ItemType, string> = { PLAIN: "Áo trơn", CUSTOM: "Áo custom", PROTOTYPE: "Áo mẫu" };

export function findPrototype(catalog: Pick<Catalog, "prototypes">, id: string | undefined): ProtoSummary | undefined {
  return id ? catalog.prototypes.find((p) => p.id === id) : undefined;
}

/**
 * Lines that can't be ordered as they are: colour or size no longer sold (settings changed
 * after adding to cart), or a prototype that was removed or deactivated (FR06).
 */
export function unavailableItems(items: CartItem[], catalog: Catalog): Set<string> {
  return new Set(
    items
      .filter((i) => {
        if (!catalog.sizes.includes(i.size)) return true;
        if (i.type === "PROTOTYPE") {
          const proto = findPrototype(catalog, i.prototypeId);
          return !proto?.active || !catalog.colors.some((c) => c.key === proto.color);
        }
        return !catalog.colors.some((c) => c.key === i.color);
      })
      .map((i) => i.id),
  );
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
): Catalog {
  return {
    prices: settings.prices,
    colors: settings.colors,
    sizes: settings.sizes,
    printAreas: settings.print_areas,
    dpi: settings.export_dpi,
    prototypes,
  };
}
