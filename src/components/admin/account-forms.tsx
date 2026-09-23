"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types/action";
import type { UserRole } from "@/types/db";
import { Field, FormError, SubmitButton, useAdminForm, type FormAction } from "./form-kit";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50";

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "STAFF", label: "Staff" },
  { value: "ADMIN", label: "Admin" },
];

/** FR20: create a Staff/Admin account with an initial password. */
export function CreateAccountForm({ action }: { action: FormAction }) {
  const { state, onSubmit, pending, formRef, key } = useAdminForm(action, "Đã tạo tài khoản", { reset: true });

  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Họ tên" htmlFor="new-full_name">
          <Input id="new-full_name" name="full_name" maxLength={100} required />
        </Field>
        <Field label="Email" htmlFor="new-email">
          <Input id="new-email" name="email" type="email" autoComplete="off" required />
        </Field>
        <Field label="Vai trò" htmlFor="new-role">
          <select id="new-role" name="role" defaultValue="STAFF" className={selectClass}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mật khẩu ban đầu" htmlFor="new-password" hint="Ít nhất 8 ký tự. Gửi riêng cho người dùng.">
          <Input id="new-password" name="password" type="text" autoComplete="new-password" minLength={8} required />
        </Field>
      </div>
      <SubmitButton pending={pending}>Tạo tài khoản</SubmitButton>
    </form>
  );
}

/** Role dropdown that saves on change. Disabled for the current admin's own row. */
export function RoleSelect({
  role,
  disabled,
  action,
}: {
  role: UserRole;
  disabled?: boolean;
  action: (role: UserRole) => Promise<ActionResult>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Vai trò"
      defaultValue={role}
      disabled={disabled || pending}
      className={selectClass}
      onChange={(e) => {
        const next = e.target.value as UserRole;
        const select = e.target;
        startTransition(async () => {
          const result = await action(next);
          if (result.ok) {
            toast.success("Đã đổi vai trò");
          } else {
            toast.error(result.error);
            select.value = role;
          }
        });
      }}
    >
      {ROLE_OPTIONS.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

/** FR20: admin sets a new password for another account. */
export function ResetPasswordForm({ id, action }: { id: string; action: FormAction }) {
  const { state, onSubmit, pending, formRef, key } = useAdminForm(action, "Đã đặt lại mật khẩu", { reset: true });

  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
      <FormError state={state} />
      <Field label="Mật khẩu mới" htmlFor={`${id}-password`} hint="Ít nhất 8 ký tự">
        <Input
          id={`${id}-password`}
          name="password"
          type="text"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <SubmitButton pending={pending}>Đặt lại mật khẩu</SubmitButton>
    </form>
  );
}
