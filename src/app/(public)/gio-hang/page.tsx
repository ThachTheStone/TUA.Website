import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { toCatalog } from "@/components/cart/catalog";
import { getCustomer } from "@/lib/customers/session";
import { listProtoSummaries } from "@/lib/prototypes/queries";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Giỏ hàng" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [settings, session, prototypes] = await Promise.all([getSettings(), getCustomer(), listProtoSummaries()]);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Giỏ hàng</h1>
      <CartView catalog={toCatalog(settings, prototypes)} signedIn={!!session} />
    </div>
  );
}
