"use client";

/* eslint-disable @next/next/no-img-element -- public content-bucket images */
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SizeOptions, pickSize, type ColorOption } from "@/components/public/shirt-options";
import { Button } from "@/components/ui/button";
import { MAX_QUANTITY, useCart } from "@/lib/cart/store";
import { formatVND } from "@/lib/format";
import { addToCartProblem, maxOrderable, type ShirtStock } from "@/lib/inventory";
import { cn } from "@/lib/utils";

/** FR27: front/back (and other) photos of a prototype, with thumbnails. */
export function PrototypeGallery({ images, name }: { images: string[]; name: string }) {
  const [current, setCurrent] = useState(0);
  if (!images.length) return <div className="aspect-square rounded-xl bg-muted" />;
  return (
    <div className="flex flex-col gap-3">
      <img src={images[current]} alt={name} className="aspect-square w-full rounded-xl bg-muted object-cover" />
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Ảnh ${i + 1}`}
              aria-pressed={i === current}
              className={cn("size-16 overflow-hidden rounded-md border-2 sm:size-20", i === current ? "border-primary" : "border-transparent")}
            >
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Props = {
  prototypeId: string;
  name: string;
  color: ColorOption;
  sizes: string[];
  price: number;
  stock: ShirtStock;
  /** Pieces left under the prototype's cap; null = no cap. */
  prototypeLeft: number | null;
};

/** FR27: the colour is fixed by the prototype; the buyer picks size and quantity only. */
export function PrototypeBuyForm({ prototypeId, name, color, sizes, price, stock, prototypeLeft }: Props) {
  const leftIn = (s: string) => maxOrderable(stock, color.key, s, prototypeLeft);
  const [size, setSize] = useState(() => pickSize(sizes, sizes[Math.floor(sizes.length / 2)], leftIn));
  const [quantity, setQuantity] = useState(1);
  const addPrototype = useCart((s) => s.addPrototype);
  const cart = useCart((s) => s.items);
  const left = leftIn(size);
  const maxQty = Math.max(1, Math.min(MAX_QUANTITY, left ?? MAX_QUANTITY));
  const soldOut = left !== null && left <= 0;

  if (prototypeLeft !== null && prototypeLeft <= 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-2xl font-bold">{formatVND(price)}</p>
        <p className="text-lg font-semibold text-destructive">Mẫu áo này đã hết hàng</p>
      </div>
    );
  }

  function add() {
    const problem = addToCartProblem(cart, stock, { color: color.key, size, quantity, prototypeId, prototypeLeft });
    if (problem) return toast.error(problem);
    addPrototype({ prototypeId, color: color.key, size, quantity });
    toast.success(`Đã thêm ${quantity} áo "${name}" vào giỏ hàng`, {
      action: { label: "Xem giỏ hàng", onClick: () => window.location.assign("/gio-hang") },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-2xl font-bold">{formatVND(price)}</p>
      <p className="flex items-center gap-2 text-sm">
        <span className="font-semibold">Màu áo:</span>
        <span className="inline-block size-5 rounded-full border" style={{ background: color.hex }} />
        {color.label}
      </p>
      <SizeOptions
        sizes={sizes}
        size={size}
        onSize={(s) => {
          setSize(s);
          setQuantity(1);
        }}
        left={leftIn}
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
      <p className="text-sm text-muted-foreground">
        Tạm tính: <strong className="text-foreground">{formatVND(price * quantity)}</strong>
      </p>
      <Button type="button" size="lg" className="h-12" onClick={add} disabled={soldOut}>
        <ShoppingCart /> {soldOut ? "Hết hàng" : "Thêm vào giỏ"}
      </Button>
    </div>
  );
}
