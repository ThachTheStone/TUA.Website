"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError, ImageInput, SubmitButton, useAdminForm, type FormAction } from "./form-kit";

type Props = {
  blockKey: string;
  action: FormAction;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
};

/** FR17: edit one home-page text block (story or event). */
export function ContentBlockForm({ blockKey, action, title, body, imageUrl }: Props) {
  const { state, onSubmit, pending, formRef, key } = useAdminForm(action, "Đã lưu nội dung");
  const id = (name: string) => `${blockKey}-${name}`;

  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormError state={state} />
      <Field label="Tiêu đề" htmlFor={id("title")}>
        <Input id={id("title")} name="title" defaultValue={title ?? ""} maxLength={200} />
      </Field>
      <Field label="Nội dung" htmlFor={id("body")} hint="Xuống dòng sẽ được giữ nguyên trên trang chủ">
        <Textarea id={id("body")} name="body" defaultValue={body ?? ""} rows={8} maxLength={10000} />
      </Field>
      <ImageInput id={id("image")} label="Ảnh minh họa" current={imageUrl} removable />
      <SubmitButton pending={pending}>Lưu</SubmitButton>
    </form>
  );
}
