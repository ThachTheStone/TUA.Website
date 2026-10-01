"use client";

import { Ruler, X } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { SIZE_CHART, formatCm } from "@/lib/size-chart";
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
  const chartRef = useRef<HTMLDialogElement>(null);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex w-full items-center justify-between gap-3 text-sm font-semibold">
        Size
        <button
          type="button"
          onClick={() => chartRef.current?.showModal()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <Ruler className="size-4" aria-hidden /> Bảng size
        </button>
      </legend>
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
      <SizeChartDialog ref={chartRef} sizes={sizes} />
    </fieldset>
  );
}

/** Measurement diagram (public/size-diagram.webp) and the size table, in a centred popup. */
function SizeChartDialog({ ref, sizes }: { ref: React.Ref<HTMLDialogElement>; sizes: string[] }) {
  const rows = sizes.filter((s) => SIZE_CHART[s]);
  return (
    <dialog
      ref={ref}
      aria-label="Bảng size áo"
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-3xl border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-3 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Bảng size áo</h2>
          <button
            type="button"
            aria-label="Đóng"
            onClick={(e) => e.currentTarget.closest("dialog")?.close()}
            className="flex size-10 items-center justify-center rounded-full hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <Image
          src="/size-diagram.webp"
          alt="Cách đo áo: dài áo từ vai xuống gấu, rộng đo ngang thân, dài tay đo từ vai tới cửa tay."
          width={700}
          height={555}
          sizes="(min-width: 672px) 592px, 100vw"
          className="mx-auto h-auto w-full max-w-md rounded-2xl"
        />
        {rows.length > 0 && (
          <div className="overflow-hidden rounded-2xl border">
            <table className="w-full text-center text-sm tabular-nums sm:text-base">
              <thead className="bg-brand-sage text-brand-cream">
                <tr>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Size</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Dài áo</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Rộng</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Dài tay</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s} className="border-t even:bg-muted/50">
                    <th scope="row" className="px-3 py-2.5 font-semibold text-primary">{s}</th>
                    <td className="px-3 py-2.5">{formatCm(SIZE_CHART[s].length)}</td>
                    <td className="px-3 py-2.5">{formatCm(SIZE_CHART[s].width)}</td>
                    <td className="px-3 py-2.5">{formatCm(SIZE_CHART[s].sleeve)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-sm text-muted-foreground">Cần tư vấn chọn size, bạn liên hệ Ban tổ chức ở trang Liên hệ.</p>
      </div>
    </dialog>
  );
}
