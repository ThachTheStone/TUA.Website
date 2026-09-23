"use client";

import { Input } from "@/components/ui/input";
import type { Sponsor } from "@/types/db";
import { CheckboxField, Field, FormError, ImageInput, SubmitButton, useAdminForm, type FormAction } from "./form-kit";

/** FR19: create or edit a sponsor. */
export function SponsorForm({ action, sponsor }: { action: FormAction; sponsor?: Sponsor }) {
  const isNew = !sponsor;
  const { state, onSubmit, pending, formRef, key } = useAdminForm(
    action,
    isNew ? "Đã thêm nhà tài trợ" : "Đã lưu nhà tài trợ",
    { reset: isNew },
  );
  const id = (name: string) => `${sponsor?.id ?? "new"}-${name}`;

  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên nhà tài trợ" htmlFor={id("name")}>
          <Input id={id("name")} name="name" defaultValue={sponsor?.name ?? ""} maxLength={200} required />
        </Field>
        <Field label="Website" htmlFor={id("website_url")}>
          <Input
            id={id("website_url")}
            name="website_url"
            type="url"
            placeholder="https://"
            defaultValue={sponsor?.website_url ?? ""}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Hạng tài trợ" htmlFor={id("tier")} hint="Ví dụ: Kim cương, Vàng, Bạc, Đồng hành">
          <Input id={id("tier")} name="tier" defaultValue={sponsor?.tier ?? ""} maxLength={50} />
        </Field>
        <Field label="Thứ tự" htmlFor={id("sort_order")}>
          <Input
            id={id("sort_order")}
            name="sort_order"
            type="number"
            min={0}
            max={9999}
            defaultValue={sponsor?.sort_order ?? 0}
            required
          />
        </Field>
      </div>
      <ImageInput id={id("image")} label="Logo" current={sponsor?.logo_url} removable />
      <CheckboxField
        id={id("is_active")}
        name="is_active"
        label="Bật hiển thị"
        defaultChecked={sponsor?.is_active ?? true}
      />
      <SubmitButton pending={pending}>{isNew ? "Thêm nhà tài trợ" : "Lưu"}</SubmitButton>
    </form>
  );
}
