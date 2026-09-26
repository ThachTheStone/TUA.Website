"use client";

import { cn } from "@/lib/utils";

export type ColorOption = { key: string; label: string; hex: string };

type Props = {
  colors: ColorOption[];
  sizes: string[];
  color: string;
  size: string;
  onColor: (key: string) => void;
  onSize: (size: string) => void;
  /** Shirts left in a size (for the chosen colour); null = not tracked. Sold-out sizes are disabled. */
  left?: (size: string) => number | null;
};

/** Keeps a picked size if it is still in stock, else the first size that is. */
export function pickSize(sizes: string[], wanted: string, left?: (size: string) => number | null): string {
  const inStock = (s: string) => (left?.(s) ?? 1) > 0;
  return inStock(wanted) ? wanted : (sizes.find(inStock) ?? wanted);
}

/** FR02: shirt colour and size, both from settings. */
export function ShirtOptions({ colors, sizes, color, size, onColor, onSize, left }: Props) {
  const current = colors.find((c) => c.key === color);
  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">
          Màu áo{current && <span className="font-normal text-muted-foreground">: {current.label}</span>}
        </legend>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onColor(c.key)}
              aria-pressed={c.key === color}
              aria-label={c.label}
              title={c.label}
              className={cn(
                "size-11 rounded-full border-2 shadow-sm",
                c.key === color ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border",
              )}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </fieldset>
      <SizeOptions sizes={sizes} size={size} onSize={onSize} left={left} />
    </div>
  );
}

/** Size buttons alone, for prototypes whose colour is fixed (FR02). */
export function SizeOptions({ sizes, size, onSize, left }: Pick<Props, "sizes" | "size" | "onSize" | "left">) {
  const current = left?.(size) ?? null;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">Size</legend>
      <div className="flex flex-wrap gap-2">
        {sizes.map((s) => {
          const soldOut = (left?.(s) ?? 1) <= 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onSize(s)}
              disabled={soldOut}
              aria-pressed={s === size}
              aria-label={soldOut ? `${s} (hết hàng)` : s}
              title={soldOut ? "Hết hàng" : undefined}
              className={cn(
                "h-11 min-w-11 rounded-md border px-3 text-sm font-medium",
                s === size ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                soldOut && "cursor-not-allowed text-muted-foreground line-through opacity-50 hover:bg-transparent",
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
      {current !== null && (
        <p className={cn("text-sm", current > 0 ? "text-muted-foreground" : "text-destructive")}>
          {current > 0 ? `Còn ${current} áo size ${size}` : `Size ${size} đã hết hàng`}
        </p>
      )}
    </fieldset>
  );
}
