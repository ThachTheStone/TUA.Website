"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveBlindbox } from "@/lib/admin/blindbox-actions";
import type { Blindbox } from "@/lib/settings";
import { CheckboxField, Field, FormError, ImageInput, SubmitButton, useAdminForm } from "./form-kit";

/** FR32: name, description, image, total stock and on/off. */
export function BlindboxForm({ box }: { box: Blindbox & { sold: number } }) {
  const { state, onSubmit, pending, formRef, key } = useAdminForm(saveBlindbox, "Đã lưu blindbox");
  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field label="Tên sản phẩm" htmlFor="bb-name">
          <Input id="bb-name" name="name" defaultValue={box.name} maxLength={100} required />
        </Field>
        <Field label="Tổng số hộp" htmlFor="bb-stock" hint={`Đã bán/giữ chỗ ${box.sold} hộp`}>
          <Input id="bb-stock" name="stock" type="number" min={0} defaultValue={box.stock} required />
        </Field>
      </div>
      <Field label="Mô tả" htmlFor="bb-description">
        <Textarea id="bb-description" name="description" rows={4} defaultValue={box.description} maxLength={2000} />
      </Field>
      <ImageInput id="bb-image" label="Ảnh" current={box.image_url} removable />
      <CheckboxField id="bb-active" name="is_active" label="Mở bán" defaultChecked={box.is_active} />
      <SubmitButton pending={pending}>Lưu</SubmitButton>
    </form>
  );
}
