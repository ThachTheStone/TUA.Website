"use server";

import { z } from "zod";
import { getCustomer } from "@/lib/customers/session";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";

// FR26: the buyer's cart saved to their account. Same shape as the browser cart
// (lib/cart/store.ts). It holds no prices; checkout still recomputes everything.

const MAX_LINES = 100;
/** Drafts can carry fill images; keep a saved cart well under the server action limit. */
const MAX_CART_BYTES = 8 * 1024 * 1024;

const cartItemSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(["PLAIN", "CUSTOM", "PROTOTYPE"]),
  color: z.string().min(1).max(50),
  size: z.string().min(1).max(20),
  quantity: z.number().int().min(1).max(50),
  designDraftId: z.string().min(1).max(64).optional(),
  prototypeId: z.uuid().optional(),
});

const cartSchema = z.object({
  items: z.array(cartItemSchema).max(MAX_LINES, "Giỏ hàng quá nhiều dòng"),
  drafts: z.record(z.string().max(64), z.unknown()),
});

export type SavedCart = z.infer<typeof cartSchema>;

export async function loadCart(): Promise<ActionResult<SavedCart>> {
  const session = await getCustomer();
  if (!session) return { ok: false, error: "Vui lòng đăng nhập" };

  const { data, error } = await createServiceClient()
    .from("carts")
    .select("items, drafts")
    .eq("customer_id", session.userId)
    .maybeSingle();
  if (error) {
    console.error("[cart] load", error.message);
    return { ok: false, error: "Không tải được giỏ hàng đã lưu" };
  }
  const parsed = cartSchema.safeParse(data ?? { items: [], drafts: {} });
  return { ok: true, data: parsed.success ? parsed.data : { items: [], drafts: {} } };
}

export async function saveCart(input: SavedCart): Promise<ActionResult> {
  const session = await getCustomer();
  if (!session) return { ok: false, error: "Vui lòng đăng nhập" };

  const parsed = cartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Giỏ hàng không hợp lệ" };

  // Keep only the drafts that a cart line still uses.
  const used = new Set(parsed.data.items.map((i) => i.designDraftId).filter(Boolean));
  const drafts = Object.fromEntries(Object.entries(parsed.data.drafts).filter(([id]) => used.has(id)));
  if (JSON.stringify(drafts).length > MAX_CART_BYTES) {
    return { ok: false, error: "Thiết kế trong giỏ quá lớn để lưu vào tài khoản" };
  }

  const { error } = await createServiceClient()
    .from("carts")
    .upsert({ customer_id: session.userId, items: parsed.data.items, drafts, updated_at: new Date().toISOString() });
  if (error) {
    console.error("[cart] save", error.message);
    return { ok: false, error: "Không lưu được giỏ hàng" };
  }
  return { ok: true, data: undefined };
}
