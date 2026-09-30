"use client";

import { cn } from "@/lib/utils";

export type ColorOption = { key: string; label: string; hex: string };

type Props = {
  colors: ColorOption[];
  sizes: string[];
  /** Sizes listed but not on sale (settings.sizes_disabled): shown, can't be picked. */
  disabledSizes?: string[];
  color: string;
  size: string;
  onColor: (key: string) => void;
  onSize: (size: string) => void;
  /** Shirts left in a size (for the chosen colour); null = not tracked. Sold-out sizes are disabled. */
  left?: (size: string) => number | null;
};

/** Keeps a picked size if it can still be bought, else the first size that can. */
export function pickSize(
  sizes: string[],
  wanted: string,
  left?: (size: string) => number | null,
  disabledSizes: string[] = [],
): string {
  const ok = (s: string) => !disabledSizes.includes(s) && (left?.(s) ?? 1) > 0;
  return ok(wanted) ? wanted : (sizes.find(ok) ?? wanted);
}

/** FR02: shirt colour and size, both from settings. */
export function ShirtOptions({ colors, sizes, disabledSizes, color, size, onColor, onSize, left }: Props) {
  const current = colors.find((c) => c.key === color);
  return (
    <div className="flex flex-col gap-4">
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
                c.key === color ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-border",
              )}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </fieldset>
      <SizeOptions sizes={sizes} disabledSizes={disabledSizes} size={size} onSize={onSize} left={left} />
    </div>
  );
}

/** Size buttons alone, for products whose colour is fixed (FR02). */
export function SizeOptions({
  sizes,
  disabledSizes = [],
  size,
  onSize,
  left,
}: Pick<Props, "sizes" | "disabledSizes" | "size" | "onSize" | "left">) {
  const current = left?.(size) ?? null;
  const offSale = sizes.filter((s) => disabledSizes.includes(s));
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">Size</legend>
      <div className="flex flex-wrap gap-2">
        {sizes.map((s) => {
          const disabled = disabledSizes.includes(s);
          const soldOut = !disabled && (left?.(s) ?? 1) <= 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onSize(s)}
              disabled={disabled || soldOut}
              aria-pressed={s === size}
              aria-label={disabled ? `${s} (chưa mở bán)` : soldOut ? `${s} (hết hàng)` : s}
              title={disabled ? "Chưa mở bán" : soldOut ? "Hết hàng" : undefined}
              className={cn(
                "h-11 min-w-12 rounded-full border px-3 text-sm font-semibold transition-colors",
                s === size ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:border-primary hover:text-primary",
                (disabled || soldOut) && "cursor-not-allowed border-dashed bg-muted text-muted-foreground opacity-60 hover:border-input hover:text-muted-foreground",
                soldOut && "line-through",
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
      {offSale.length > 0 && <p className="text-xs text-muted-foreground">Size {offSale.join(", ")} chưa mở bán.</p>}
      {current !== null && (
        <p className={cn("text-sm", current > 0 ? "text-muted-foreground" : "text-destructive")}>
          {current > 0 ? `Còn ${current} áo size ${size}` : `Size ${size} đã hết hàng`}
        </p>
      )}
    </fieldset>
  );
}
