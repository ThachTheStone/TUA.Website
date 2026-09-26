"use client";

/* eslint-disable @next/next/no-img-element -- inline SVG mockup */
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ShirtOptions, pickSize, type ColorOption } from "@/components/public/shirt-options";
import { Button } from "@/components/ui/button";
import { MAX_QUANTITY, useCart } from "@/lib/cart/store";
import { shirtSvgUrl } from "@/lib/design/mockup";
import { formatVND } from "@/lib/format";
import { addToCartProblem, shirtsLeft, type ShirtStock } from "@/lib/inventory";

type Props = { colors: ColorOption[]; sizes: string[]; price: number; stock: ShirtStock };

/** FR02: plain shirt, colour, size and quantity. Sold-out sizes can't be picked. */
export function PlainShirtForm({ colors, sizes, price, stock }: Props) {
  const [color, setColor] = useState(colors[0].key);
  const leftIn = (c: string) => (s: string) => shirtsLeft(stock, c, s);
  const [size, setSize] = useState(() => pickSize(sizes, sizes[Math.floor(sizes.length / 2)], leftIn(colors[0].key)));
  const [quantity, setQuantity] = useState(1);
  const addPlain = useCart((s) => s.addPlain);
  const cart = useCart((s) => s.items);
  const hex = colors.find((c) => c.key === color)?.hex ?? "#ffffff";
  const left = shirtsLeft(stock, color, size);
  const maxQty = Math.max(1, Math.min(MAX_QUANTITY, left ?? MAX_QUANTITY));
  const soldOut = left !== null && left <= 0;

  function changeColor(key: string) {
    setColor(key);
    setSize((s) => pickSize(sizes, s, leftIn(key)));
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
    <div className="grid gap-8 md:grid-cols-2">
      <div className="rounded-xl bg-muted/40 p-6">
        <img src={shirtSvgUrl("front", hex)} alt="Áo trơn" className="mx-auto w-full max-w-md" />
      </div>
      <div className="flex flex-col gap-6">
        <p className="text-2xl font-bold">{formatVND(price)}</p>
        <ShirtOptions colors={colors} sizes={sizes} color={color} size={size} onColor={changeColor} onSize={changeSize} left={leftIn(color)} />
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
        <p className="text-sm text-muted-foreground">
          Tạm tính: <strong className="text-foreground">{formatVND(price * quantity)}</strong>
        </p>
        <Button type="button" size="lg" className="h-12" onClick={add} disabled={soldOut}>
          <ShoppingCart /> {soldOut ? "Hết hàng" : "Thêm vào giỏ"}
        </Button>
      </div>
    </div>
  );
}
