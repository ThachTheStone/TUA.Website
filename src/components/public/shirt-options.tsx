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
};

/** FR02: shirt colour and size, both from settings. */
export function ShirtOptions({ colors, sizes, color, size, onColor, onSize }: Props) {
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
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Size</legend>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSize(s)}
              aria-pressed={s === size}
              className={cn(
                "h-11 min-w-11 rounded-md border px-3 text-sm font-medium",
                s === size ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
