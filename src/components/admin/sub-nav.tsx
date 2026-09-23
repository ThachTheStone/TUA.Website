"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Tab-style links between sibling admin pages. */
export function SubNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b">
      {items.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "-mb-px shrink-0 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground",
            pathname === href && "border-primary font-medium text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
