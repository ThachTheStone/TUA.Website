import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PrototypeGrid } from "@/components/public/prototype-grid";
import { Section } from "@/components/public/sections";
import type { PrototypeOnSale } from "@/lib/prototypes/queries";

/** How many prototypes the home page shows before "Xem tất cả". */
export const HOME_PROTOTYPE_LIMIT = 8;

/** FR01 §2: prototypes on sale, plus the ways into custom and plain shirts. Hidden when none are on sale. */
export function PrototypeShowcase({ prototypes, price }: { prototypes: PrototypeOnSale[]; price: number }) {
  if (prototypes.length === 0) return null;
  return (
    <Section id="ao-mau" title="Áo mẫu">
      <PrototypeGrid prototypes={prototypes.slice(0, HOME_PROTOTYPE_LIMIT)} price={price} />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button asChild>
          <Link href="/mau-ao">Xem tất cả áo mẫu</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/thiet-ke">Tự thiết kế áo</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/ao-tron">Mua áo trơn</Link>
        </Button>
      </div>
    </Section>
  );
}
