import Link from "next/link";

// Links are added here as later phases ship their pages (thiết kế, áo trơn, quyên góp, tra cứu).
const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/vinh-danh", label: "Vinh danh" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-bold tracking-tight">
          TỰA <span className="hidden font-normal text-muted-foreground sm:inline">– Nét Vẽ Yêu Thương</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 hover:bg-muted">
              {label}
            </Link>
          ))}
        </nav>
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
