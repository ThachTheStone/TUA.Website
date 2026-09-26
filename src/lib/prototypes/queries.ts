import "server-only";
import type { ProtoSummary } from "@/components/cart/catalog";
import { getSettings, type Settings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import type { Prototype } from "@/types/db";

// FR27/FR28 reads. Public pages only ever see active prototypes.

export const PROTOTYPE_FIELDS = "id, slug, name, description, color, image_urls, design_id, sort_order, is_active, created_at, updated_at";

export async function listPrototypes({ activeOnly = false } = {}): Promise<Prototype[]> {
  let query = createServiceClient().from("prototypes").select(PROTOTYPE_FIELDS);
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query.order("sort_order").order("created_at").returns<Prototype[]>();
  if (error) throw new Error(`Không đọc được áo mẫu: ${error.message}`);
  return data ?? [];
}

/** Active prototypes buyers can order: a prototype whose colour was removed from settings is left out. */
export async function listPrototypesOnSale(): Promise<Prototype[]> {
  const [settings, prototypes] = await Promise.all([getSettings(), listPrototypes({ activeOnly: true })]);
  return prototypes.filter((p) => settings.colors.some((c) => c.key === p.color));
}

export async function getActivePrototype(slug: string): Promise<Prototype | null> {
  const { data, error } = await createServiceClient()
    .from("prototypes")
    .select(PROTOTYPE_FIELDS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<Prototype>();
  if (error) throw new Error(`Không đọc được áo mẫu: ${error.message}`);
  return data;
}

/** What the cart and workshop form need to know about every prototype (inactive ones included). */
export async function listProtoSummaries(): Promise<ProtoSummary[]> {
  return (await listPrototypes()).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    color: p.color,
    image: p.image_urls[0] ?? null,
    active: p.is_active,
  }));
}

export type PrintFileInfo = { area: string; filePath: string; widthPx: number | null; heightPx: number | null };

/** Print files of each prototype's current design, keyed by prototype id. */
export async function prototypeFiles(prototypes: Pick<Prototype, "id" | "design_id">[]): Promise<Map<string, PrintFileInfo[]>> {
  const out = new Map<string, PrintFileInfo[]>();
  if (!prototypes.length) return out;
  const { data, error } = await createServiceClient()
    .from("design_files")
    .select("design_id, area, file_path, width_px, height_px")
    .in("design_id", prototypes.map((p) => p.design_id));
  if (error) throw new Error(`Không đọc được file in áo mẫu: ${error.message}`);
  for (const p of prototypes) {
    out.set(
      p.id,
      (data ?? [])
        .filter((f) => f.design_id === p.design_id)
        .map((f) => ({ area: f.area, filePath: f.file_path, widthPx: f.width_px, heightPx: f.height_px })),
    );
  }
  return out;
}

/**
 * Checkout / workshop: the prototypes an order refers to, which must all exist, be active and
 * have a colour that is still sold. Returns id → colour, or a Vietnamese error.
 */
export async function orderablePrototypes(
  ids: string[],
  settings: Pick<Settings, "colors">,
): Promise<{ ok: true; colors: Map<string, string> } | { ok: false; error: string }> {
  const colors = new Map<string, string>();
  const unique = [...new Set(ids)];
  if (!unique.length) return { ok: true, colors };
  const { data, error } = await createServiceClient().from("prototypes").select("id, name, color, is_active").in("id", unique);
  if (error) throw new Error(`Không đọc được áo mẫu: ${error.message}`);
  for (const id of unique) {
    const proto = (data ?? []).find((p) => p.id === id);
    if (!proto?.is_active) {
      return { ok: false, error: `Áo mẫu ${proto ? `"${proto.name}" ` : ""}đã ngừng bán. Vui lòng xóa khỏi giỏ hàng.` };
    }
    if (!settings.colors.some((c) => c.key === proto.color)) {
      return { ok: false, error: `Áo mẫu "${proto.name}" tạm thời không bán được. Vui lòng xóa khỏi giỏ hàng.` };
    }
    colors.set(id, proto.color);
  }
  return { ok: true, colors };
}
