"use client";

import type { ColorOption } from "@/components/public/shirt-options";
import { Input } from "@/components/ui/input";
import { saveShirtStock } from "@/lib/admin/inventory-actions";
import { stockKey } from "@/lib/inventory";
import type { StockCell } from "@/lib/inventory.server";
import { cn } from "@/lib/utils";
import { FormError, SubmitButton, useAdminForm } from "./form-kit";

/** Total blank shirts per colour × size. Empty = not tracked (unlimited). */
export function StockForm({ colors, sizes, cells }: { colors: ColorOption[]; sizes: string[]; cells: StockCell[] }) {
  const { state, onSubmit, pending, formRef, key } = useAdminForm(saveShirtStock, "Đã lưu kho áo");
  const cellOf = (color: string, size: string) => cells.find((c) => c.color === color && c.size === size);

  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormError state={state} />
      {colors.map((color) => (
        <fieldset key={color.key} className="flex flex-col gap-3">
          <legend className="mb-2 flex items-center gap-2 font-semibold">
            <span className="inline-block size-4 rounded-full border" style={{ background: color.hex }} />
            Màu {color.label}
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sizes.map((size) => {
              const cell = cellOf(color.key, size);
              const id = `stock-${stockKey(color.key, size)}`;
              const low = cell?.left != null && cell.left <= 0;
              return (
                <div key={size} className="flex flex-col gap-1.5 rounded-lg border p-3">
                  <label htmlFor={id} className="text-sm font-medium">
                    Size {size}
                  </label>
                  <Input
                    id={id}
                    name={`q:${stockKey(color.key, size)}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="Không giới hạn"
                    defaultValue={cell?.quantity ?? ""}
                  />
                  <p className={cn("text-xs", low ? "font-medium text-destructive" : "text-muted-foreground")}>
                    Đã đặt {cell?.used ?? 0}
                    {cell?.left != null && ` · Còn ${cell.left}`}
                  </p>
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
      <SubmitButton pending={pending}>Lưu kho áo</SubmitButton>
    </form>
  );
}
