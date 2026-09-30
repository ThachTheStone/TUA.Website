"use client";

import { Minus, Palette, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ShirtOptions, pickSize, type ColorOption } from "@/components/public/shirt-options";
import { ShirtArt } from "@/components/public/shop/product-art";
import { Button } from "@/components/ui/button";
import { MAX_QUANTITY, useCart } from "@/lib/cart/store";
import { formatVND } from "@/lib/format";
import { addToCartProblem, shirtsLeft, type ShirtStock } from "@/lib/inventory";
import { cn } from "@/lib/utils";

type Props = {
  colors: ColorOption[];
  sizes: string[];
  disabledSizes: string[];
  price: number;
  /** For the "tự thiết kế" hint. */
  customPrice: number;
  stock: ShirtStock;
};

const SIDES = [
  { key: "front", label: "Mặt trước" },
  { key: "back", label: "Mặt sau" },
] as const;

/** FR02 (S04): plain shirt, colour, size and quantity. Sold-out and not-yet-sold sizes can't be picked. */
export function PlainShirtForm({ colors, sizes, disabledSizes, price, customPrice, stock }: Props) {
  const [color, setColor] = useState(colors[0].key);
  const [side, setSide] = useState<"front" | "back">("front");
  const leftIn = (c: string) => (s: string) => shirtsLeft(stock, c, s);
  const [size, setSize] = useState(() => pickSize(sizes, sizes[Math.floor(sizes.length / 2)], leftIn(colors[0].key), disabledSizes));
  const [quantity, setQuantity] = useState(1);
  const addPlain = useCart((s) => s.addPlain);
  const cart = useCart((s) => s.items);
  const current = colors.find((c) => c.key === color) ?? colors[0];
  const left = shirtsLeft(stock, color, size);
  const maxQty = Math.max(1, Math.min(MAX_QUANTITY, left ?? MAX_QUANTITY));
  const unavailable = disabledSizes.includes(size) || (left !== null && left <= 0);

  function changeColor(key: string) {
    setColor(key);
    setSize((s) => pickSize(sizes, s, leftIn(key), disabledSizes));
    setQuantity(1);
  }

  function changeSize(s: string) {
    setSize(s);
    setQuantity(1);
  }

  function add() {
    const problem = addToCartProblem(cart, stock, { color, size, quantity });
    if (problem) return toast.error(problem);
    addPlain({ color, size, quantity });
    toast.success(`Đã thêm ${quantity} áo trơn vào giỏ hàng`, {
      action: { label: "Xem giỏ hàng", onClick: () => window.location.assign("/gio-hang") },
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-center rounded-2xl border bg-muted p-6 sm:p-10">
          <ShirtArt hex={current.hex} side={side} className="max-w-md" />
        </div>
        <div className="flex gap-3" role="group" aria-label="Xem mặt áo">
          {SIDES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSide(s.key)}
              aria-pressed={side === s.key}
              className={cn(
                "flex w-24 flex-col items-center gap-1 rounded-xl border bg-muted p-2 text-xs font-medium",
                side === s.key ? "border-primary ring-1 ring-primary" : "hover:border-primary/50",
              )}
            >
              <ShirtArt hex={current.hex} side={s.key} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Áo trơn màu {current.label.toLowerCase()}</h1>
          <p className="text-3xl font-bold text-primary">{formatVND(price)}</p>
          <p className="text-muted-foreground">Áo thun không in hình. Chọn size, số lượng rồi thêm vào giỏ hàng.</p>
        </div>

        <ShirtOptions
          colors={colors}
          sizes={sizes}
          disabledSizes={disabledSizes}
          color={color}
          size={size}
          onColor={changeColor}
          onSize={changeSize}
          left={leftIn(color)}
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Số lượng</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Giảm">
              <Minus />
            </Button>
            <span className="w-10 text-center text-lg tabular-nums">{quantity}</span>
            <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty} aria-label="Tăng">
              <Plus />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <p className="flex items-baseline justify-between text-sm text-muted-foreground">
            Tạm tính <strong className="text-lg text-foreground">{formatVND(price * quantity)}</strong>
          </p>
          <Button type="button" size="lg" className="h-12 text-base" onClick={add} disabled={unavailable}>
            <ShoppingCart /> {unavailable ? "Hết hàng" : "Thêm vào giỏ"}
          </Button>
        </div>

        <Link
          href="/thiet-ke"
          className="flex items-center gap-3 rounded-xl border border-dashed border-primary/40 p-4 text-sm hover:bg-primary/5"
        >
          <Palette className="size-5 shrink-0 text-primary" aria-hidden />
          <span>
            Muốn chiếc áo mang nét vẽ của riêng bạn?{" "}
            <strong className="text-primary underline underline-offset-4">Tự thiết kế áo ({formatVND(customPrice)})</strong>
          </span>
        </Link>
      </div>
    </div>
  );
}
