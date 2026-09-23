"use client";

/* eslint-disable @next/next/no-img-element -- inline SVG mockup */
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ShirtOptions, type ColorOption } from "@/components/public/shirt-options";
import { Button } from "@/components/ui/button";
import { MAX_QUANTITY, useCart } from "@/lib/cart/store";
import { shirtSvgUrl } from "@/lib/design/mockup";
import { formatVND } from "@/lib/format";

type Props = { colors: ColorOption[]; sizes: string[]; price: number };

/** FR02: plain shirt, colour, size and quantity. */
export function PlainShirtForm({ colors, sizes, price }: Props) {
  const [color, setColor] = useState(colors[0].key);
  const [size, setSize] = useState(sizes[Math.floor(sizes.length / 2)]);
  const [quantity, setQuantity] = useState(1);
  const addPlain = useCart((s) => s.addPlain);
  const hex = colors.find((c) => c.key === color)?.hex ?? "#ffffff";

  function add() {
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
        <ShirtOptions colors={colors} sizes={sizes} color={color} size={size} onColor={setColor} onSize={setSize} />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Số lượng</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Giảm">
              <Minus />
            </Button>
            <span className="w-10 text-center text-lg tabular-nums">{quantity}</span>
            <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))} aria-label="Tăng">
              <Plus />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Tạm tính: <strong className="text-foreground">{formatVND(price * quantity)}</strong>
        </p>
        <Button type="button" size="lg" className="h-12" onClick={add}>
          <ShoppingCart /> Thêm vào giỏ
        </Button>
      </div>
    </div>
  );
}
