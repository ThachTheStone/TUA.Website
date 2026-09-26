"use server";

import { revalidatePath } from "next/cache";
import { OK, fail } from "@/lib/admin/form";
import { colorLabel } from "@/lib/format";
import { stockKey } from "@/lib/inventory";
import { getSettings } from "@/lib/settings";
import { requireRole } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";

// Inventory: total blank shirts per colour × size (Staff and Admin, like Blindbox).
// A field left empty stops tracking that colour × size (unlimited).

const MAX_STOCK = 100000;

export async function saveShirtStock(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireRole(["ADMIN", "STAFF"]);
  const settings = await getSettings();

  const upserts: { color: string; size: string; quantity: number; updated_at: string }[] = [];
  const untracked: { color: string; size: string }[] = [];
  const now = new Date().toISOString();
  for (const c of settings.colors) {
    for (const size of settings.sizes) {
      const raw = String(formData.get(`q:${stockKey(c.key, size)}`) ?? "").trim();
      if (raw === "") {
        untracked.push({ color: c.key, size });
        continue;
      }
      const quantity = Number(raw);
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_STOCK) {
        return fail(`Số áo màu ${colorLabel(settings.colors, c.key)} size ${size} phải là số nguyên từ 0 đến ${MAX_STOCK}`);
      }
      upserts.push({ color: c.key, size, quantity, updated_at: now });
    }
  }

  const db = createServiceClient();
  if (upserts.length) {
    const { error } = await db.from("shirt_stock").upsert(upserts, { onConflict: "color,size" });
    if (error) {
      console.error("[inventory] save failed", error.message);
      return fail("Không lưu được kho áo. Vui lòng thử lại");
    }
  }
  for (const { color, size } of untracked) {
    const { error } = await db.from("shirt_stock").delete().eq("color", color).eq("size", size);
    if (error) {
      console.error("[inventory] untrack failed", error.message);
      return fail("Không lưu được kho áo. Vui lòng thử lại");
    }
  }

  revalidatePath("/admin/kho");
  revalidatePath("/ao-tron");
  revalidatePath("/thiet-ke");
  revalidatePath("/mau-ao", "layout");
  return OK;
}
