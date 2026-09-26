import { formatDate, formatVND } from "@/lib/format";
import { comboContents, comboSaving } from "@/lib/orders/discounts";
import type { Prices } from "@/lib/orders/pricing";
import type { Combo } from "@/types/db";

/** FR31: live combos. They apply by themselves in the cart, nothing to type. */
export function ComboList({ combos, prices }: { combos: Combo[]; prices: Prices }) {
  const shown = combos.filter((c) => comboSaving(c, prices) > 0);
  if (!shown.length) return null;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((c) => (
        <li key={c.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <h3 className="font-semibold">{c.name}</h3>
          <p className="text-sm text-muted-foreground">{comboContents(c.items)}</p>
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-bold text-primary">{formatVND(c.price)}</span>
            <span className="text-sm text-muted-foreground line-through">{formatVND(c.price + comboSaving(c, prices))}</span>
          </p>
          {c.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{c.description}</p>}
          <p className="mt-auto pt-2 text-xs text-muted-foreground">
            Tự động áp dụng trong giỏ hàng{c.ends_at && ` · đến hết ${formatDate(c.ends_at)}`}
          </p>
        </li>
      ))}
    </ul>
  );
}
