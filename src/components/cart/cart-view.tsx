"use client";

/* eslint-disable @next/next/no-img-element -- inline SVG mockup */
import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { ShirtPreview } from "@/components/canvas/shirt-preview";
import { TYPE_LABEL, cartSubtotal, unavailableItems, type Catalog } from "@/components/cart/catalog";
import { Button } from "@/components/ui/button";
import { MAX_QUANTITY, useCart, type CartItem } from "@/lib/cart/store";
import { useHydrated } from "@/lib/cart/use-hydrated";
import { shirtSvgUrl } from "@/lib/design/mockup";
import { formatVND } from "@/lib/format";

function CartLine({ item, catalog, unavailable }: { item: CartItem; catalog: Catalog; unavailable: boolean }) {
  const draft = useCart((s) => (item.designDraftId ? s.drafts[item.designDraftId] : undefined));
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const color = catalog.colors.find((c) => c.key === item.color);
  const hex = color?.hex ?? "#ffffff";
  const price = catalog.prices[item.type];

  function remove() {
    if (item.type === "CUSTOM" && !window.confirm("Xóa áo này cùng bản thiết kế khỏi giỏ hàng?")) return;
    removeItem(item.id);
  }

  return (
    <li className="flex flex-col gap-4 border-b py-5 sm:flex-row">
      <div className="w-full shrink-0 rounded-lg bg-muted/50 p-2 sm:w-56">
        {item.type === "CUSTOM" && draft ? (
          <ShirtPreview areas={draft} printAreas={catalog.printAreas} colorHex={hex} debounceMs={0} />
        ) : (
          <img src={shirtSvgUrl("front", hex)} alt="" className="mx-auto w-28" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">{TYPE_LABEL[item.type]}</p>
            <p className="text-sm text-muted-foreground">
              Màu {color?.label ?? item.color} · Size {item.size} · {formatVND(price)}/áo
            </p>
            {unavailable && (
              <p className="mt-1 text-sm text-destructive">Màu hoặc size này không còn bán. Vui lòng xóa hoặc thiết kế lại.</p>
            )}
            {item.type === "CUSTOM" && !draft && (
              <p className="mt-1 text-sm text-destructive">Không tìm thấy bản thiết kế. Vui lòng xóa dòng này.</p>
            )}
          </div>
          <p className="font-semibold tabular-nums">{formatVND(price * item.quantity)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Giảm" disabled={item.quantity <= 1} onClick={() => setQuantity(item.id, item.quantity - 1)}>
            <Minus />
          </Button>
          <span className="w-8 text-center tabular-nums">{item.quantity}</span>
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Tăng" disabled={item.quantity >= MAX_QUANTITY} onClick={() => setQuantity(item.id, item.quantity + 1)}>
            <Plus />
          </Button>
          <div className="ml-auto flex gap-2">
            {item.type === "CUSTOM" && draft && (
              <Button asChild variant="outline" className="h-11">
                <Link href={`/thiet-ke?sua=${item.id}`}>
                  <Pencil /> Sửa thiết kế
                </Link>
              </Button>
            )}
            <Button type="button" variant="ghost" className="h-11 text-destructive" onClick={remove}>
              <Trash2 /> Xóa
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

/** FR06: cart lines with quantity, remove and re-edit. */
export function CartView({ catalog }: { catalog: Catalog }) {
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);

  if (!hydrated) return <p className="py-12 text-center text-muted-foreground">Đang tải giỏ hàng…</p>;

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg">Giỏ hàng đang trống.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/thiet-ke">Tự thiết kế áo</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/ao-tron">Mua áo trơn</Link>
          </Button>
        </div>
      </div>
    );
  }

  const unavailable = unavailableItems(items, catalog);
  const missingDesign = items.some((i) => i.type === "CUSTOM" && !i.designDraftId);
  const blocked = unavailable.size > 0 || missingDesign;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <ul>
        {items.map((item) => (
          <CartLine key={item.id} item={item} catalog={catalog} unavailable={unavailable.has(item.id)} />
        ))}
      </ul>
      <aside className="flex h-fit flex-col gap-4 rounded-xl border p-5 lg:sticky lg:top-20">
        <p className="flex items-baseline justify-between">
          <span className="text-muted-foreground">Tạm tính</span>
          <span className="text-xl font-bold">{formatVND(cartSubtotal(items, catalog))}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Phí vận chuyển (nếu giao hàng) bạn trả trực tiếp cho đơn vị vận chuyển.
        </p>
        <Button asChild={!blocked} size="lg" className="h-12" disabled={blocked}>
          {blocked ? <span>Tiến hành đặt hàng</span> : <Link href="/thanh-toan">Tiến hành đặt hàng</Link>}
        </Button>
        <Link href="/thiet-ke" className="text-center text-sm underline underline-offset-4">
          Thiết kế thêm áo
        </Link>
      </aside>
    </div>
  );
}
