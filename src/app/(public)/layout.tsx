import { CartSync } from "@/components/cart/cart-sync";
import { Breadcrumbs } from "@/components/public/breadcrumbs";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getCustomer } from "@/lib/customers/session";
import { getSettings } from "@/lib/settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [session, { contact }] = await Promise.all([getCustomer(), getSettings()]);
  return (
    <div className="site-public flex min-h-screen flex-col bg-background">
      <SiteHeader session={session} />
      <CartSync customerId={session?.userId ?? null} />
      <Breadcrumbs />
      <main className="flex-1">{children}</main>
      <SiteFooter contact={contact} />
    </div>
  );
}
