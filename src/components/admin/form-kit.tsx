"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/types/action";

export type FormAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/**
 * useActionState plus a success toast. Submits via onSubmit (not `action=`) so React doesn't
 * clear the fields when the server returns a validation error.
 * `reset: true` clears the form after success (create forms). The returned `key` changes after
 * each success; put it on the form so file inputs and edit forms re-sync with saved values.
 */
export function useAdminForm(action: FormAction, successMessage: string, { reset = false } = {}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!state?.ok) return;
    toast.success(successMessage);
    if (reset) formRef.current?.reset();
    setKey((k) => k + 1);
  }, [state, successMessage, reset]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  };

  return { state, onSubmit, pending, formRef, key };
}

export function FormError({ state }: { state: ActionResult | null }) {
  if (!state || state.ok) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked,
  id,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="size-4 accent-primary" />
      {label}
    </label>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? "Đang lưu…" : children}
    </Button>
  );
}

/**
 * Admin-only image picker (staff uploads to the public `content` bucket; BR01 forbids this on
 * public pages). Shows the current image and, when `removable`, a "remove" checkbox.
 */
export function ImageInput({
  id,
  label,
  current,
  removable = false,
  required = false,
}: {
  id: string;
  label: string;
  current?: string | null;
  removable?: boolean;
  required?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const shown = preview ?? current ?? null;

  return (
    <Field label={label} htmlFor={id} hint="PNG, JPG, WEBP hoặc SVG, tối đa 5MB">
      {shown && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob previews can't use next/image
        <img src={shown} alt="" className="h-28 w-auto self-start rounded-md border bg-muted object-contain" />
      )}
      <input
        id={id}
        name="image"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        required={required && !current}
        onChange={(e) => {
          const file = e.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
        className="text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
      />
      {removable && current && <CheckboxField id={`${id}-remove`} name="removeImage" label="Xóa ảnh hiện tại" />}
    </Field>
  );
}

/** Button that asks for confirmation, runs a bound server action and toasts the result. */
export function ConfirmActionButton({
  action,
  confirmText,
  successMessage,
  children,
  variant = "destructive",
  size = "sm",
}: {
  action: () => Promise<ActionResult>;
  confirmText?: string;
  successMessage: string;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        startTransition(async () => {
          const result = await action();
          if (result.ok) toast.success(successMessage);
          else toast.error(result.error);
        });
      }}
    >
      {children}
    </Button>
  );
}
