"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MAX_QUANTITY, useCart } from "@/lib/cart/store";
import { formatVND } from "@/lib/format";

/** FR32: quantity + "Thêm vào giỏ". The cart and checkout check stock again. */
export function BlindboxBuy({ price, remaining }: { price: number; remaining: number }) {
  const max = Math.min(MAX_QUANTITY, remaining);
  const [quantity, setQuantity] = useState(1);
  const inCart = useCart((s) => s.items.find((i) => i.type === "BLINDBOX")?.quantity ?? 0);
  const addBlindbox = useCart((s) => s.addBlindbox);

  if (remaining <= 0) return <p className="text-lg font-semibold text-destructive">Đã hết hàng</p>;

  function add() {
    if (inCart + quantity > max) {
      toast.error(`Chỉ còn ${remaining} hộp, giỏ hàng đã có ${inCart} hộp`);
      return;
    }
    addBlindbox(quantity);
    toast.success(`Đã thêm ${quantity} blindbox vào giỏ hàng`, {
      action: { label: "Xem giỏ hàng", onClick: () => window.location.assign("/gio-hang") },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Số lượng</span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Giảm">
            <Minus />
          </Button>
          <span className="w-10 text-center text-lg tabular-nums">{quantity}</span>
          <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => setQuantity((q) => Math.min(max, q + 1))} aria-label="Tăng" disabled={quantity >= max}>
            <Plus />
          </Button>
          <span className="text-sm text-muted-foreground">Còn {remaining} hộp</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <p className="flex items-baseline justify-between text-sm text-muted-foreground">
          Tạm tính <strong className="text-lg text-foreground">{formatVND(price * quantity)}</strong>
        </p>
        <Button type="button" size="lg" className="h-12 text-base" onClick={add}>
          <ShoppingCart /> Thêm vào giỏ
        </Button>
      </div>
    </div>
  );
}
