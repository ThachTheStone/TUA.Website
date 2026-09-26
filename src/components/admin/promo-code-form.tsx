"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PromoCode } from "@/types/db";
import { CheckboxField, Field, FormError, SubmitButton, useAdminForm, type FormAction } from "./form-kit";

type Props = {
  action: FormAction;
  promo?: PromoCode;
  /** `datetime-local` values in Vietnam time, prepared on the server. */
  startsAt?: string;
  endsAt?: string;
};

const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-xs";

/** FR31: create or edit a promo code. */
export function PromoCodeForm({ action, promo, startsAt = "", endsAt = "" }: Props) {
  const isNew = !promo;
  const { state, onSubmit, pending, formRef, key } = useAdminForm(action, isNew ? "Đã thêm mã giảm giá" : "Đã lưu mã giảm giá", { reset: isNew });
  const [kind, setKind] = useState<PromoCode["kind"]>(promo?.kind ?? "PERCENT");
  const id = (name: string) => `${promo?.id ?? "new"}-${name}`;

  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mã" htmlFor={id("code")} hint="Chữ không dấu, số, - hoặc _. Tự chuyển thành chữ in hoa">
          <Input
            id={id("code")}
            name="code"
            defaultValue={promo?.code ?? ""}
            maxLength={30}
            required
            className="uppercase"
            autoComplete="off"
          />
        </Field>
        <Field label="Mô tả (nội bộ)" htmlFor={id("description")}>
          <Textarea id={id("description")} name="description" rows={1} defaultValue={promo?.description ?? ""} maxLength={500} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Kiểu giảm" htmlFor={id("kind")}>
          <select id={id("kind")} name="kind" value={kind} onChange={(e) => setKind(e.target.value as PromoCode["kind"])} className={selectClass}>
            <option value="PERCENT">Theo phần trăm (%)</option>
            <option value="AMOUNT">Số tiền cố định (đ)</option>
          </select>
        </Field>
        <Field label={kind === "PERCENT" ? "Mức giảm (%)" : "Mức giảm (đ)"} htmlFor={id("value")}>
          <Input
            id={id("value")}
            name="value"
            type="number"
            min={1}
            max={kind === "PERCENT" ? 100 : undefined}
            step={kind === "PERCENT" ? 1 : 1000}
            defaultValue={promo?.value ?? ""}
            required
          />
        </Field>
        {kind === "PERCENT" && (
          <Field label="Giảm tối đa (đ)" htmlFor={id("max_discount")} hint="Để trống: không giới hạn">
            <Input id={id("max_discount")} name="max_discount" type="number" min={1000} step={1000} defaultValue={promo?.max_discount ?? ""} />
          </Field>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Đơn tối thiểu (đ)" htmlFor={id("min_subtotal")} hint="Tính trên tiền hàng trước giảm. 0 = mọi đơn">
          <Input id={id("min_subtotal")} name="min_subtotal" type="number" min={0} step={1000} defaultValue={promo?.min_subtotal ?? 0} required />
        </Field>
        <Field label="Tổng số lượt dùng" htmlFor={id("max_uses")} hint="Để trống: không giới hạn. Đơn hủy/hết hạn được trả lượt">
          <Input id={id("max_uses")} name="max_uses" type="number" min={1} defaultValue={promo?.max_uses ?? ""} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Áp dụng từ" htmlFor={id("starts_at")} hint="Để trống: áp dụng ngay">
          <Input id={id("starts_at")} name="starts_at" type="datetime-local" defaultValue={startsAt} />
        </Field>
        <Field label="Áp dụng đến" htmlFor={id("ends_at")} hint="Để trống: không hết hạn">
          <Input id={id("ends_at")} name="ends_at" type="datetime-local" defaultValue={endsAt} />
        </Field>
      </div>
      <CheckboxField id={id("is_active")} name="is_active" label="Bật mã" defaultChecked={promo?.is_active ?? true} />
      <SubmitButton pending={pending}>{isNew ? "Thêm mã" : "Lưu"}</SubmitButton>
    </form>
  );
}
