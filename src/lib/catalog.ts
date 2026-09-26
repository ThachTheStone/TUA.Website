import "server-only";
import { toCatalog, type Catalog } from "@/components/cart/catalog";
import { getBlindboxStatus } from "@/lib/blindbox";
import { listCombos, toComboRules } from "@/lib/discounts/queries";
import { listProtoSummaries } from "@/lib/prototypes/queries";
import { getSettings } from "@/lib/settings";

/** Everything the cart, checkout and workshop form need, in one call (server only). */
export async function loadCatalog(): Promise<Catalog> {
  const [settings, prototypes, combos, box] = await Promise.all([
    getSettings(),
    listProtoSummaries(),
    listCombos({ liveOnly: true }),
    getBlindboxStatus(),
  ]);
  return toCatalog(settings, prototypes, {
    combos: toComboRules(combos),
    blindbox: { name: box.name, image: box.image_url, active: box.is_active, remaining: box.remaining },
  });
}
