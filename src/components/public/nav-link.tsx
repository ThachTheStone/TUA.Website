"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** A menu item stays highlighted on the pages grouped under it. */
const SECTION_PATHS: Record<string, string[]> = {
  "/cua-hang": ["/cua-hang", "/ao-tron", "/blindbox"],
  "/quyen-gop": ["/quyen-gop", "/vinh-danh"],
};

export function isActiveNav(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return (SECTION_PATHS[href] ?? [href]).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Header menu link: grey, bold and dark on the current section. */
export function NavLink({ href, label, className }: { href: string; label: string; className?: string }) {
  const active = isActiveNav(href, usePathname());
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block shrink-0 py-2 text-[15px] text-foreground/65 transition-colors hover:text-primary",
        "aria-[current=page]:font-bold aria-[current=page]:text-foreground",
        className,
      )}
    >
      {label}
    </Link>
  );
}
