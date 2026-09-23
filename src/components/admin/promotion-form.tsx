"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Promotion } from "@/types/db";
import { CheckboxField, Field, FormError, ImageInput, SubmitButton, useAdminForm, type FormAction } from "./form-kit";

type Props = {
  action: FormAction;
  promotion?: Promotion;
  /** `datetime-local` values in Vietnam time, prepared on the server. */
  startsAt?: string;
  endsAt?: string;
};

/** FR17: create or edit a promotion. Display-only content (SRS §10 #6: no cart discount). */
export function PromotionForm({ action, promotion, startsAt = "", endsAt = "" }: Props) {
  const isNew = !promotion;
  const { state, onSubmit, pending, formRef, key } = useAdminForm(
    action,
    isNew ? "Đã thêm khuyến mãi" : "Đã lưu khuyến mãi",
    { reset: isNew },
  );
  const id = (name: string) => `${promotion?.id ?? "new"}-${name}`;

  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field label="Tiêu đề" htmlFor={id("title")}>
          <Input id={id("title")} name="title" defaultValue={promotion?.title ?? ""} maxLength={200} required />
        </Field>
        <Field label="Giá (hiển thị)" htmlFor={id("price_text")} hint="Ví dụ: Combo 199.000đ">
          <Input id={id("price_text")} name="price_text" defaultValue={promotion?.price_text ?? ""} maxLength={100} />
        </Field>
      </div>
      <Field label="Mô tả" htmlFor={id("description")}>
        <Textarea
          id={id("description")}
          name="description"
          defaultValue={promotion?.description ?? ""}
          rows={3}
          maxLength={2000}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bắt đầu hiển thị" htmlFor={id("starts_at")} hint="Để trống: hiển thị ngay">
          <Input id={id("starts_at")} name="starts_at" type="datetime-local" defaultValue={startsAt} />
        </Field>
        <Field label="Kết thúc hiển thị" htmlFor={id("ends_at")} hint="Để trống: không giới hạn">
          <Input id={id("ends_at")} name="ends_at" type="datetime-local" defaultValue={endsAt} />
        </Field>
      </div>
      <ImageInput id={id("image")} label="Ảnh" current={promotion?.image_url} removable />
      <CheckboxField
        id={id("is_active")}
        name="is_active"
        label="Bật hiển thị"
        defaultChecked={promotion?.is_active ?? true}
      />
      <SubmitButton pending={pending}>{isNew ? "Thêm khuyến mãi" : "Lưu"}</SubmitButton>
    </form>
  );
}
