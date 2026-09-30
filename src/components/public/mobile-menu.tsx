"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isActiveNav } from "@/components/public/nav-link";
import { SiteSearch } from "@/components/public/site-search";

/** Phone/tablet header menu: a toggle button and a drop-down panel of nav links. */
export function MobileMenu({
  nav,
  children,
}: {
  nav: { href: string; label: string }[];
  /** Account entry (sign in / account + sign out), rendered under the links. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close when the route changes (covers links in `children` too).
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex size-10 items-center justify-center rounded-md hover:bg-muted"
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full max-h-[calc(100dvh-var(--header-h))] overflow-y-auto border-b bg-background shadow-md">
          {/* A search from /cua-hang keeps the pathname, so close on submit too. */}
          <nav aria-label="Menu chính" onSubmit={() => setOpen(false)} className="mx-auto flex max-w-6xl flex-col px-4 py-3 text-sm">
            <SiteSearch className="mb-2" />
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={isActiveNav(href, pathname) ? "page" : undefined}
                className="rounded-md px-3 py-3 hover:bg-muted aria-[current=page]:font-semibold aria-[current=page]:text-primary"
              >
                {label}
              </Link>
            ))}
            <div className="mt-1 flex items-center gap-1 border-t pt-2">{children}</div>
          </nav>
        </div>
      )}
    </>
  );
}
