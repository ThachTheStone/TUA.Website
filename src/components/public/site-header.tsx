import Link from "next/link";
import { AccountLink } from "@/components/account/account-link";
import { Logo } from "@/components/brand/logo";
import { CartLink } from "@/components/public/cart-link";
import { MobileMenu } from "@/components/public/mobile-menu";
import { NavLink } from "@/components/public/nav-link";
import { SiteSearch } from "@/components/public/site-search";
import { Button } from "@/components/ui/button";
import type { CustomerSession } from "@/lib/customers/session";

// Áo trơn and blindbox live under Cửa hàng; the donor wall is part of the Quyên góp page.
const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/cua-hang", label: "Cửa hàng" },
  { href: "/thiet-ke", label: "Tự thiết kế áo" },
  { href: "/quyen-gop", label: "Quyên góp" },
  { href: "/lien-he", label: "Liên hệ" },
];

/**
 * Two rows from lg (logo, search, buttons / menu); one row with a menu button below that.
 * "Tra cứu đơn hàng" stays in the bar at every width, signed in or not.
 */
export function SiteHeader({ session }: { session: CustomerSession | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-sand bg-brand-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 lg:h-20 lg:gap-6">
        <Link href="/" className="shrink-0 text-primary" aria-label="TỰA – Nét Vẽ Yêu Thương, về trang chủ">
          <Logo variant="full" className="h-10 lg:h-12" title="" />
        </Link>
        <SiteSearch className="hidden max-w-xl flex-1 lg:block" />
        <div className="flex items-center gap-1 lg:gap-3">
          <Button asChild size="cta" className="h-10 px-3.5 text-[13px] lg:h-11 lg:px-6 lg:text-[15px]">
            <Link href="/tra-cuu">Tra cứu đơn hàng</Link>
          </Button>
          <CartLink />
          <div className="hidden lg:block">
            <AccountLink session={session} />
          </div>
          <div className="lg:hidden">
            <MobileMenu nav={NAV}>
              <AccountLink session={session} />
            </MobileMenu>
          </div>
        </div>
      </div>
      <nav aria-label="Menu chính" className="hidden h-12 border-t border-foreground/15 lg:block">
        <ul className="mx-auto flex h-full max-w-6xl items-center justify-center gap-14 px-4">
          {NAV.map((item) => (
            <li key={item.href}>
              <NavLink {...item} />
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
