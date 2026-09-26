import "server-only";
import { getSettings, type Blindbox } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";

// FR32: the Hot Wheels blindbox. Boxes in orders that are not cancelled or expired count
// as sold, so a cancelled or expired order gives its boxes back automatically.

export type BlindboxStatus = Blindbox & { price: number; sold: number; remaining: number };

export async function blindboxSold(): Promise<number> {
  const { data, error } = await createServiceClient().rpc("blindbox_sold");
  if (error) throw new Error(`Không đọc được số blindbox đã bán: ${error.message}`);
  return Number(data ?? 0);
}

export async function getBlindboxStatus(): Promise<BlindboxStatus> {
  const [settings, sold] = await Promise.all([getSettings(), blindboxSold()]);
  const box = settings.blindbox;
  return { ...box, price: settings.prices.BLINDBOX, sold, remaining: Math.max(0, box.stock - sold) };
}

/** Checkout / workshop pre-check (the RPC checks again under a lock). */
export async function checkBlindboxQuantity(quantity: number): Promise<string | null> {
  if (quantity <= 0) return null;
  const box = await getBlindboxStatus();
  if (!box.is_active) return "Blindbox đã ngừng bán. Vui lòng xóa khỏi giỏ hàng.";
  if (quantity > box.remaining) {
    return box.remaining > 0 ? `Blindbox chỉ còn ${box.remaining} hộp. Vui lòng giảm số lượng.` : "Blindbox đã hết hàng. Vui lòng xóa khỏi giỏ hàng.";
  }
  return null;
}
