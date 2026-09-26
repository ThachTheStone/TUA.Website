"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/lib/cart/store";
import { useHydrated } from "@/lib/cart/use-hydrated";

export function CartLink() {
  const hydrated = useHydrated();
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const shown = hydrated ? count : 0;

  return (
    <Link
      href="/gio-hang"
      className="relative flex size-10 items-center justify-center rounded-md hover:bg-muted"
      aria-label={shown ? `Giỏ hàng (${shown} sản phẩm)` : "Giỏ hàng"}
    >
      <ShoppingCart className="size-5" />
      {shown > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
          {shown}
        </span>
      )}
    </Link>
  );
}
