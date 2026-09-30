import { Tag } from "lucide-react";
import { formatDate, formatVND } from "@/lib/format";
import { comboContents, comboSaving } from "@/lib/orders/discounts";
import type { Prices } from "@/lib/orders/pricing";
import type { Combo, ItemType } from "@/types/db";

/** Live combos that include this product (all combos when no type is given). */
export function combosWith(combos: Combo[], type?: ItemType): Combo[] {
  return type ? combos.filter((c) => c.items.some((i) => i.type === type)) : combos;
}

/**
 * FR31: live combos. They apply by themselves in the cart, nothing to type.
 * `compact` is the narrow list under "Thêm vào giỏ" on the design page.
 */
export function ComboList({ combos, prices, compact = false }: { combos: Combo[]; prices: Prices; compact?: boolean }) {
  const shown = combos.filter((c) => comboSaving(c, prices) > 0);
  if (!shown.length) return null;

  if (compact) {
    return (
      <ul className="flex flex-col gap-2">
        {shown.map((c) => (
          <li key={c.id} className="flex flex-col gap-0.5 rounded-lg border border-primary/25 bg-brand-cream p-3">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{c.name}</span>
              <span className="shrink-0 font-bold text-primary">{formatVND(c.price)}</span>
            </span>
            <span className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <span>{comboContents(c.items)}</span>
              <span className="shrink-0 line-through">{formatVND(c.price + comboSaving(c, prices))}</span>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((c) => {
        const saving = comboSaving(c, prices);
        return (
          <li key={c.id} className="relative flex flex-col gap-2 rounded-xl border border-primary/25 bg-card p-5 shadow-sm">
            <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
              <Tag className="size-3" aria-hidden /> Tiết kiệm {formatVND(saving)}
            </span>
            <h3 className="font-semibold">{c.name}</h3>
            <p className="text-sm text-muted-foreground">{comboContents(c.items)}</p>
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-bold text-primary">{formatVND(c.price)}</span>
              <span className="text-sm text-muted-foreground line-through">{formatVND(c.price + saving)}</span>
            </p>
            {c.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{c.description}</p>}
            <p className="mt-auto pt-2 text-xs text-muted-foreground">
              Tự động áp dụng trong giỏ hàng{c.ends_at && ` · đến hết ${formatDate(c.ends_at)}`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** "Combo ưu đãi" block under a product (S04, S06). Hidden when no combo applies. */
export function ComboSection({ combos, prices }: { combos: Combo[]; prices: Prices }) {
  if (!combos.some((c) => comboSaving(c, prices) > 0)) return null;
  return (
    <section className="flex flex-col gap-5 border-t pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold">Combo ưu đãi</h2>
        <p className="text-sm text-muted-foreground">Thêm đủ sản phẩm vào giỏ, giá combo được áp dụng tự động.</p>
      </div>
      <ComboList combos={combos} prices={prices} />
    </section>
  );
}
