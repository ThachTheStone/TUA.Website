import { CartSync } from "@/components/cart/cart-sync";
import { SiteFooter, SiteHeader } from "@/components/public/site-header";
import { getCustomer } from "@/lib/customers/session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getCustomer();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader session={session} />
      <CartSync customerId={session?.userId ?? null} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
