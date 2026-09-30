"use client";

import { ChevronRight, House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { breadcrumbTrail } from "@/lib/breadcrumbs";

/**
 * Where the buyer is in the site, on every page except the home page. One line of fixed
 * height (--crumbs-h) so the full-screen canvas can subtract it.
 */
export function Breadcrumbs() {
  const trail = breadcrumbTrail(usePathname());
  if (!trail.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="border-b border-brand-sand/70 bg-brand-cream">
      <ol className="mx-auto flex h-(--crumbs-h) max-w-6xl items-center gap-1 overflow-hidden px-4 text-sm whitespace-nowrap">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={i} className={last ? "min-w-0 truncate" : "flex shrink-0 items-center gap-1"}>
              {c.href && !last ? (
                <>
                  <Link href={c.href} className="inline-flex items-center gap-1 rounded text-muted-foreground hover:text-primary hover:underline underline-offset-4">
                    {i === 0 && <House className="size-3.5" aria-hidden />}
                    {c.label}
                  </Link>
                  <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden />
                </>
              ) : (
                <span aria-current="page" className="font-semibold text-primary">
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
