import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { loadCatalog } from "@/lib/catalog";
import { getCustomer } from "@/lib/customers/session";

export const metadata: Metadata = { title: "Giỏ hàng" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [catalog, session] = await Promise.all([loadCatalog(), getCustomer()]);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Giỏ hàng</h1>
      <CartView catalog={catalog} signedIn={!!session} />
    </div>
  );
}
