"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatVND } from "@/lib/format";
import { COMBO_ITEM_LABEL, comboSaving } from "@/lib/orders/discounts";
import type { Prices } from "@/lib/orders/pricing";
import type { Combo, ItemType } from "@/types/db";
import { CheckboxField, Field, FormError, SubmitButton, useAdminForm, type FormAction } from "./form-kit";

type Props = {
  action: FormAction;
  combo?: Combo;
  prices: Prices;
  startsAt?: string;
  endsAt?: string;
};

const TYPES: ItemType[] = ["CUSTOM", "PROTOTYPE", "PLAIN", "BLINDBOX"];
const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs";

/** FR31: a bundle at a set price, applied automatically in the cart. */
export function ComboForm({ action, combo, prices, startsAt = "", endsAt = "" }: Props) {
  const isNew = !combo;
  const { state, onSubmit, pending, formRef, key } = useAdminForm(action, isNew ? "Đã thêm combo" : "Đã lưu combo", { reset: isNew });
  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormError state={state} />
      {/* Keyed with the form so a reset after "Thêm combo" also clears the product rows. */}
      <ComboFields key={key} combo={combo} prices={prices} startsAt={startsAt} endsAt={endsAt} />
      <SubmitButton pending={pending}>{isNew ? "Thêm combo" : "Lưu"}</SubmitButton>
    </form>
  );
}

function ComboFields({ combo, prices, startsAt, endsAt }: Omit<Props, "action">) {
  const [items, setItems] = useState<Combo["items"]>(combo?.items ?? [{ type: "CUSTOM", quantity: 1 }]);
  const [price, setPrice] = useState<number>(combo?.price ?? 0);
  const id = (name: string) => `${combo?.id ?? "new"}-${name}`;
  const saving = comboSaving({ price, items }, prices);
  const unused = TYPES.filter((t) => !items.some((i) => i.type === t));

  const update = (n: number, patch: Partial<Combo["items"][number]>) => setItems((xs) => xs.map((x, i) => (i === n ? { ...x, ...patch } : x)));

  return (
    <>
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field label="Tên combo" htmlFor={id("name")}>
          <Input id={id("name")} name="name" defaultValue={combo?.name ?? ""} maxLength={100} required />
        </Field>
        <Field label="Giá combo (đ)" htmlFor={id("price")}>
          <Input
            id={id("price")}
            name="price"
            type="number"
            min={1000}
            step={1000}
            value={price || ""}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            required
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Sản phẩm trong combo</legend>
        {items.map((item, n) => (
          <div key={item.type} className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={20}
              value={item.quantity}
              onChange={(e) => update(n, { quantity: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
              className="h-9 w-20"
              aria-label="Số lượng"
            />
            <select
              className={selectClass}
              value={item.type}
              onChange={(e) => update(n, { type: e.target.value as ItemType })}
              aria-label="Loại sản phẩm"
            >
              {TYPES.filter((t) => t === item.type || unused.includes(t)).map((t) => (
                <option key={t} value={t}>
                  {COMBO_ITEM_LABEL[t]}
                </option>
              ))}
            </select>
            {items.length > 1 && (
              <Button type="button" variant="ghost" size="icon" aria-label="Xóa dòng" onClick={() => setItems((xs) => xs.filter((_, i) => i !== n))}>
                <Trash2 />
              </Button>
            )}
          </div>
        ))}
        {unused.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setItems((xs) => [...xs, { type: unused[0], quantity: 1 }])}
          >
            <Plus /> Thêm sản phẩm
          </Button>
        )}
        <p className={saving > 0 ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
          Giá lẻ {formatVND(price + saving)} ·{" "}
          {saving > 0 ? `khách tiết kiệm ${formatVND(saving)}` : "giá combo phải thấp hơn giá lẻ thì combo mới được áp dụng"}
        </p>
        <p className="text-xs text-muted-foreground">Áo mẫu và áo custom là hai loại riêng khi tính combo.</p>
      </fieldset>

      <Field label="Mô tả (hiển thị cho khách)" htmlFor={id("description")}>
        <Textarea id={id("description")} name="description" rows={2} defaultValue={combo?.description ?? ""} maxLength={1000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Áp dụng từ" htmlFor={id("starts_at")} hint="Để trống: áp dụng ngay">
          <Input id={id("starts_at")} name="starts_at" type="datetime-local" defaultValue={startsAt} />
        </Field>
        <Field label="Áp dụng đến" htmlFor={id("ends_at")} hint="Để trống: không hết hạn">
          <Input id={id("ends_at")} name="ends_at" type="datetime-local" defaultValue={endsAt} />
        </Field>
        <Field label="Thứ tự" htmlFor={id("sort_order")}>
          <Input id={id("sort_order")} name="sort_order" type="number" min={0} defaultValue={combo?.sort_order ?? 0} />
        </Field>
      </div>
      <CheckboxField id={id("is_active")} name="is_active" label="Bật combo" defaultChecked={combo?.is_active ?? true} />
    </>
  );
}
