/* eslint-disable @next/next/no-img-element -- public content-bucket images */
import Link from "next/link";
import { formatVND } from "@/lib/format";
import type { Prototype } from "@/types/db";

/** FR27: prototype cards (image, name, price) linking to the detail page. */
export function PrototypeGrid({ prototypes, price }: { prototypes: Prototype[]; price: number }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {prototypes.map((p) => (
        <li key={p.id}>
          <Link href={`/mau-ao/${p.slug}`} className="group flex flex-col gap-2">
            <div className="aspect-square overflow-hidden rounded-xl bg-muted">
              {p.image_urls[0] && (
                <img src={p.image_urls[0]} alt={p.name} className="size-full object-cover transition-transform group-hover:scale-105" />
              )}
            </div>
            <span className="font-medium group-hover:underline">{p.name}</span>
            <span className="text-sm text-muted-foreground">{formatVND(price)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
