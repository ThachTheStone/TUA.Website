"use client";

/* eslint-disable @next/next/no-img-element -- inline SVG mockup */
import { Minus, Package, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { ShirtPreview } from "@/components/canvas/shirt-preview";
import { TYPE_LABEL, cartProblems, findPrototype, lineColor, linePrice, variantText, type Catalog, type LineProblem } from "@/components/cart/catalog";
import { Button } from "@/components/ui/button";
import { MAX_QUANTITY, useCart, type CartItem } from "@/lib/cart/store";
import { useHydrated } from "@/lib/cart/use-hydrated";
import { maxOrderable } from "@/lib/inventory";
import { shirtImageUrl } from "@/lib/design/mockup";
import { colorLabel, formatVND } from "@/lib/format";
import { computeDiscount } from "@/lib/orders/discounts";

function CartLine({ item, catalog, problem }: { item: CartItem; catalog: Catalog; problem: LineProblem | undefined }) {
  const draft = useCart((s) => (item.designDraftId ? s.drafts[item.designDraftId] : undefined));
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);
  // FR06: no canvas on phones, so no "Sửa thiết kế" there.
  const proto = item.type === "PROTOTYPE" ? findPrototype(catalog, item.prototypeId) : undefined;
  const color = catalog.colors.find((c) => c.key === (proto?.color ?? item.color));
  const hex = color?.hex ?? "#ffffff";
  const price = linePrice(item.type, catalog);
  const isBox = item.type === "BLINDBOX";
  const box = isBox ? catalog.blindbox : null;
  // Caps the + button for one line; lines sharing a colour × size are checked together in cartProblems.
  const left = box ? box.remaining : maxOrderable(catalog.shirtStock, lineColor(item, catalog), item.size, proto?.left ?? null);
  const maxQty = left === null ? MAX_QUANTITY : Math.max(1, Math.min(MAX_QUANTITY, left));

  function remove() {
    if (item.type === "CUSTOM" && !window.confirm("Xóa áo này cùng bản thiết kế khỏi giỏ hàng?")) return;
    removeItem(item.id);
  }

  return (
    <li className="flex flex-col gap-4 border-b py-5 sm:flex-row">
      <div className="w-full shrink-0 rounded-lg bg-muted/50 p-2 sm:w-56">
        {item.type === "CUSTOM" && draft ? (
          <ShirtPreview areas={draft} printAreas={catalog.printAreas} colorHex={hex} debounceMs={0} />
        ) : proto?.image ? (
          <img src={proto.image} alt={proto.name} className="mx-auto aspect-square w-40 rounded-md object-cover sm:w-full" />
        ) : isBox ? (
          box?.image ? (
            <img src={box.image} alt={box.name} className="mx-auto aspect-square w-40 rounded-md object-cover sm:w-full" />
          ) : (
            <Package className="mx-auto size-20 text-muted-foreground" aria-hidden />
          )
        ) : (
          <img src={shirtImageUrl("front", hex)} alt="" className="mx-auto w-28" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">
              {isBox ? (
                <Link href="/blindbox" className="underline-offset-4 hover:underline">
                  {box?.name ?? TYPE_LABEL.BLINDBOX}
                </Link>
              ) : (
                TYPE_LABEL[item.type]
              )}
              {proto && (
                <>
                  {": "}
                  {proto.name}
                </>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {isBox
                ? `${formatVND(price)}/hộp`
                : `${variantText(item, color?.label ?? colorLabel(catalog.colors, item.color))} · ${formatVND(price)}/áo`}
            </p>
            {problem && <p className="mt-1 text-sm text-destructive">{problemText(problem, item, catalog)}</p>}
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
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Tăng" disabled={item.quantity >= maxQty} onClick={() => setQuantity(item.id, item.quantity + 1)}>
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

function problemText(problem: LineProblem, item: CartItem, catalog: Catalog): string {
  const box = catalog.blindbox;
  switch (problem.kind) {
    case "box":
      return box && box.active && box.remaining > 0
        ? `Chỉ còn ${box.remaining} hộp. Vui lòng giảm số lượng.`
        : "Blindbox đã hết hàng hoặc ngừng bán. Vui lòng xóa khỏi giỏ hàng.";
    case "shirt":
      return problem.left > 0
        ? `Size ${item.size} màu này chỉ còn ${problem.left} áo (tính cả các dòng cùng màu, size). Vui lòng giảm số lượng.`
        : `Size ${item.size} màu này đã hết hàng. Vui lòng xóa hoặc chọn size khác.`;
    case "proto":
      return problem.left > 0
        ? `Mẫu áo này chỉ còn ${problem.left} áo. Vui lòng giảm số lượng.`
        : "Mẫu áo này đã hết hàng. Vui lòng xóa khỏi giỏ hàng.";
    case "gone":
      return item.type === "PROTOTYPE"
        ? "Mẫu áo này đã ngừng bán. Vui lòng xóa khỏi giỏ hàng để đặt hàng."
        : "Màu hoặc size này không còn bán. Vui lòng xóa hoặc thiết kế lại.";
  }
}

/** FR06: cart lines with quantity, remove and re-edit. */
export function CartView({ catalog, signedIn }: { catalog: Catalog; signedIn: boolean }) {
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);

  if (!hydrated) return <p className="py-12 text-center text-muted-foreground">Đang tải giỏ hàng…</p>;

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg">Giỏ hàng đang trống.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="cta">
            <Link href="/cua-hang">Đến cửa hàng</Link>
          </Button>
          <Button asChild size="cta" variant="brand-outline">
            <Link href="/thiet-ke">Tự thiết kế áo</Link>
          </Button>
        </div>
      </div>
    );
  }

  const problems = cartProblems(items, catalog);
  const missingDesign = items.some((i) => i.type === "CUSTOM" && !i.designDraftId);
  const blocked = problems.size > 0 || missingDesign;
  // FR31: combos apply by themselves; a promo code is entered at checkout.
  const discount = computeDiscount(items, catalog.prices, catalog.combos, null);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <ul>
        {items.map((item) => (
          <CartLine key={item.id} item={item} catalog={catalog} problem={problems.get(item.id)} />
        ))}
      </ul>
      <aside className="flex h-fit flex-col gap-4 rounded-xl border p-5 lg:sticky lg:top-20">
        {discount.discount > 0 && (
          <div className="flex flex-col gap-1 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Tiền hàng</span>
              <span className="tabular-nums">{formatVND(discount.itemsTotal)}</span>
            </p>
            {discount.combos.map((c) => (
              <p key={c.id} className="flex justify-between gap-2 text-emerald-700 dark:text-emerald-400">
                <span>
                  Combo {c.name} ×{c.times}
                </span>
                <span className="tabular-nums">−{formatVND(c.saving)}</span>
              </p>
            ))}
          </div>
        )}
        <p className="flex items-baseline justify-between">
          <span className="text-muted-foreground">Tạm tính</span>
          <span className="text-xl font-bold">{formatVND(discount.total)}</span>
        </p>
        <p className="text-sm text-muted-foreground">Có mã giảm giá? Nhập ở bước đặt hàng.</p>
        <p className="text-sm text-muted-foreground">
          Phí vận chuyển (nếu giao hàng) bạn trả trực tiếp cho đơn vị vận chuyển.
        </p>
        <Button asChild={!blocked} size="lg" className="h-12" disabled={blocked}>
          {blocked ? <span>Đặt hàng</span> : <Link href="/thanh-toan">Đặt hàng</Link>}
        </Button>
        {!signedIn && (
          <p className="text-center text-sm text-muted-foreground">
            Bạn cần{" "}
            <Link href="/dang-nhap?next=/thanh-toan" className="underline underline-offset-4">
              đăng nhập
            </Link>{" "}
            để đặt hàng. Giỏ hàng sẽ được giữ nguyên.
          </p>
        )}
        <div className="flex justify-center gap-4 text-sm">
          <Link href="/cua-hang" className="underline underline-offset-4">
            Mua thêm sản phẩm
          </Link>
          <Link href="/thiet-ke" className="underline underline-offset-4">
            Thiết kế thêm áo
          </Link>
        </div>
      </aside>
    </div>
  );
}
