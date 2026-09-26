import Link from "next/link";
import { AccountLink } from "@/components/account/account-link";
import { CartLink } from "@/components/public/cart-link";
import { MobileMenu } from "@/components/public/mobile-menu";
import type { CustomerSession } from "@/lib/customers/session";

const NAV = [
  { href: "/mau-ao", label: "Áo mẫu" },
  { href: "/thiet-ke", label: "Thiết kế áo" },
  { href: "/ao-tron", label: "Áo trơn" },
  { href: "/blindbox", label: "Blindbox" },
  { href: "/quyen-gop", label: "Quyên góp" },
  { href: "/tra-cuu", label: "Tra cứu đơn" },
  { href: "/vinh-danh", label: "Vinh danh" },
];

export function SiteHeader({ session }: { session: CustomerSession | null }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="shrink-0 font-bold tracking-tight">
          TỰA <span className="hidden font-normal text-muted-foreground sm:inline">– Nét Vẽ Yêu Thương</span>
        </Link>
        {/* Full nav only where it fits on one line; below lg it moves into MobileMenu. */}
        <nav className="hidden items-center gap-1 text-sm lg:flex">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className="shrink-0 rounded-md px-3 py-2 hover:bg-muted">
              {label}
            </Link>
          ))}
          <CartLink />
          <AccountLink session={session} />
        </nav>
        <div className="flex items-center gap-1 lg:hidden">
          <CartLink />
          <MobileMenu nav={NAV}>
            <AccountLink session={session} />
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">TỰA – Nét Vẽ Yêu Thương</p>
        <p>Toàn bộ lợi nhuận được dùng để hỗ trợ trẻ em có hoàn cảnh đặc biệt.</p>
      </div>
    </footer>
  );
}
