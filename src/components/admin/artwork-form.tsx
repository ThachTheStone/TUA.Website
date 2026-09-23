"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Artwork } from "@/types/db";
import { Field, FormError, ImageInput, SubmitButton, useAdminForm, type FormAction } from "./form-kit";

/** FR17: create (no `artwork`) or edit one "Top 5" artwork. */
export function ArtworkForm({ action, artwork }: { action: FormAction; artwork?: Artwork }) {
  const isNew = !artwork;
  const { state, onSubmit, pending, formRef, key } = useAdminForm(
    action,
    isNew ? "Đã thêm tranh" : "Đã lưu tranh",
    { reset: isNew },
  );
  const id = (name: string) => `${artwork?.id ?? "new"}-${name}`;

  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormError state={state} />
      <ImageInput id={id("image")} label="Ảnh tranh" current={artwork?.image_url} required />
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Tên bé hoặc biệt danh" htmlFor={id("child_name")}>
          <Input id={id("child_name")} name="child_name" defaultValue={artwork?.child_name ?? ""} maxLength={100} />
        </Field>
        <Field label="Thứ tự" htmlFor={id("sort_order")}>
          <Input
            id={id("sort_order")}
            name="sort_order"
            type="number"
            min={0}
            max={9999}
            defaultValue={artwork?.sort_order ?? 0}
            required
          />
        </Field>
      </div>
      <Field label="Mô tả" htmlFor={id("description")}>
        <Textarea
          id={id("description")}
          name="description"
          defaultValue={artwork?.description ?? ""}
          rows={3}
          maxLength={1000}
        />
      </Field>
      <SubmitButton pending={pending}>{isNew ? "Thêm tranh" : "Lưu"}</SubmitButton>
    </form>
  );
}
