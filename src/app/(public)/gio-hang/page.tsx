import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { toCatalog } from "@/components/cart/catalog";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Giỏ hàng" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const settings = await getSettings();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Giỏ hàng</h1>
      <CartView catalog={toCatalog(settings)} />
    </div>
  );
}
