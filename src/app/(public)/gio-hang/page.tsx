import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { PageHeader } from "@/components/public/page-header";
import { loadCatalog } from "@/lib/catalog";
import { getCustomer } from "@/lib/customers/session";

export const metadata: Metadata = { title: "Giỏ hàng" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [catalog, session] = await Promise.all([loadCatalog(), getCustomer()]);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <PageHeader title="Giỏ hàng" />
      <CartView catalog={catalog} signedIn={!!session} />
    </div>
  );
}
