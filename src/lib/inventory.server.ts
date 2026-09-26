import "server-only";
import { colorLabel } from "@/lib/format";
import { stockKey, type ShirtStock } from "@/lib/inventory";
import type { Settings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";

// Inventory (SRS §10 #7 updated): blank shirts per colour × size, plus an optional cap per
// prototype. Shirts in orders that are not cancelled or expired count as taken, so a
// cancelled or expired order gives its shirts back. create_order re-checks under a lock.

export type StockCell = { color: string; size: string; quantity: number | null; used: number; left: number | null };

async function readStock() {
  const db = createServiceClient();
  const [stock, used] = await Promise.all([
    db.from("shirt_stock").select("color, size, quantity"),
    db.rpc("shirt_stock_used"),
  ]);
  if (stock.error) throw new Error(`Không đọc được kho áo: ${stock.error.message}`);
  if (used.error) throw new Error(`Không đọc được số áo đã đặt: ${used.error.message}`);
  const quantities = new Map((stock.data ?? []).map((r) => [stockKey(r.color, r.size), r.quantity as number]));
  const usedBy = new Map(((used.data ?? []) as { color: string; size: string; used: number }[]).map((r) => [stockKey(r.color, r.size), r.used]));
  return { quantities, usedBy };
}

/** Admin grid: every colour × size in settings, tracked or not. */
export async function getStockTable(settings: Pick<Settings, "colors" | "sizes">): Promise<StockCell[]> {
  const { quantities, usedBy } = await readStock();
  return settings.colors.flatMap((c) =>
    settings.sizes.map((size) => {
      const key = stockKey(c.key, size);
      const quantity = quantities.get(key) ?? null;
      const used = usedBy.get(key) ?? 0;
      return { color: c.key, size, quantity, used, left: quantity === null ? null : Math.max(0, quantity - used) };
    }),
  );
}

/** Public pages and cart: shirts left for each tracked colour × size. */
export async function getShirtStock(): Promise<ShirtStock> {
  const { quantities, usedBy } = await readStock();
  const out: ShirtStock = {};
  for (const [key, quantity] of quantities) out[key] = Math.max(0, quantity - (usedBy.get(key) ?? 0));
  return out;
}

/** Prototype id → pieces in live orders. */
export async function prototypeSold(): Promise<Map<string, number>> {
  const { data, error } = await createServiceClient().rpc("prototype_sold");
  if (error) throw new Error(`Không đọc được số áo mẫu đã bán: ${error.message}`);
  return new Map(((data ?? []) as { prototype_id: string; sold: number }[]).map((r) => [r.prototype_id, r.sold]));
}

type Line = { type: string; color: string; size: string; quantity: number; prototypeId?: string | null };

/**
 * Checkout / workshop pre-check (the RPC checks again under a lock). Lines of the same
 * colour × size are added up. Returns a Vietnamese error or null.
 */
export async function checkStock(
  lines: Line[],
  settings: Pick<Settings, "colors">,
  prototypes: { id: string; name: string; stock_limit: number | null }[],
): Promise<string | null> {
  const shirts = lines.filter((l) => l.type !== "BLINDBOX");
  if (!shirts.length) return null;

  const need = new Map<string, number>();
  for (const l of shirts) need.set(stockKey(l.color, l.size), (need.get(stockKey(l.color, l.size)) ?? 0) + l.quantity);
  const stock = await getShirtStock();
  for (const [key, qty] of need) {
    if (!(key in stock) || qty <= stock[key]) continue;
    const [color, size] = key.split("|");
    return soldOutMessage(colorLabel(settings.colors, color), size, stock[key]);
  }

  const capped = prototypes.filter((p) => p.stock_limit !== null);
  if (capped.length) {
    const sold = await prototypeSold();
    for (const p of capped) {
      const qty = shirts.filter((l) => l.type === "PROTOTYPE" && l.prototypeId === p.id).reduce((n, l) => n + l.quantity, 0);
      const left = Math.max(0, p.stock_limit! - (sold.get(p.id) ?? 0));
      if (qty > left) return protoSoldOutMessage(p.name, left);
    }
  }
  return null;
}

function soldOutMessage(color: string, size: string, left: number) {
  return left > 0
    ? `Áo màu ${color} size ${size} chỉ còn ${left} chiếc. Vui lòng giảm số lượng.`
    : `Áo màu ${color} size ${size} đã hết hàng. Vui lòng chọn size khác.`;
}

function protoSoldOutMessage(name: string, left: number) {
  return left > 0
    ? `Áo mẫu "${name}" chỉ còn ${left} chiếc. Vui lòng giảm số lượng.`
    : `Áo mẫu "${name}" đã hết hàng. Vui lòng xóa khỏi giỏ hàng.`;
}

/** Maps create_order's stock errors (raised when two buyers take the last shirts at once). */
export async function stockRpcError(
  message: string | undefined,
  settings: Pick<Settings, "colors">,
): Promise<string | null> {
  if (!message) return null;
  const shirt = message.match(/SHIRT_SOLD_OUT:([^:]*):([^:]*):(\d+)/);
  if (shirt) return soldOutMessage(colorLabel(settings.colors, shirt[1]), shirt[2], Number(shirt[3]));
  const proto = message.match(/PROTOTYPE_SOLD_OUT:([0-9a-f-]{36}):(\d+)/);
  if (proto) {
    const { data } = await createServiceClient().from("prototypes").select("name").eq("id", proto[1]).maybeSingle();
    return protoSoldOutMessage(data?.name ?? "", Number(proto[2]));
  }
  return null;
}
