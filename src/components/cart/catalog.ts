import type { CartItem } from "@/lib/cart/store";
import type { ColorOption } from "@/components/public/shirt-options";
import type { CanvasPrintArea } from "@/lib/design/types";
import { subtotalOf } from "@/lib/orders/pricing";
import type { ItemType } from "@/types/db";

/** The slice of settings the cart pages need. Prices here are for display only. */
export type Catalog = {
  prices: Record<ItemType, number>;
  colors: ColorOption[];
  sizes: string[];
  printAreas: CanvasPrintArea[];
  dpi: number;
};

export const TYPE_LABEL: Record<ItemType, string> = { PLAIN: "Áo trơn", CUSTOM: "Áo custom" };

/** Lines whose colour or size is no longer sold (settings changed after adding to cart). */
export function unavailableItems(items: CartItem[], catalog: Catalog): Set<string> {
  return new Set(
    items
      .filter((i) => !catalog.colors.some((c) => c.key === i.color) || !catalog.sizes.includes(i.size))
      .map((i) => i.id),
  );
}

export function cartSubtotal(items: CartItem[], catalog: Catalog): number {
  return subtotalOf(items, catalog.prices);
}

/** Picks the catalog out of the full settings (call on the server, pass to the client). */
export function toCatalog(settings: {
  prices: Record<ItemType, number>;
  colors: ColorOption[];
  sizes: string[];
  print_areas: CanvasPrintArea[];
  export_dpi: number;
}): Catalog {
  return {
    prices: settings.prices,
    colors: settings.colors,
    sizes: settings.sizes,
    printAreas: settings.print_areas,
    dpi: settings.export_dpi,
  };
}
