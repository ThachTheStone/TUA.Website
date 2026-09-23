"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { changePassword } from "@/lib/auth-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELDS = [
  { name: "currentPassword", label: "Mật khẩu hiện tại", autoComplete: "current-password" },
  { name: "newPassword", label: "Mật khẩu mới", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Nhập lại mật khẩu mới", autoComplete: "new-password" },
] as const;

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Đã đổi mật khẩu");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4 rounded-xl border bg-card p-6">
      {state && !state.ok && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {FIELDS.map((f) => (
        <div key={f.name} className="flex flex-col gap-2">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input id={f.name} name={f.name} type="password" autoComplete={f.autoComplete} required />
        </div>
      ))}
      <Button type="submit" disabled={pending}>
        {pending ? "Đang lưu…" : "Đổi mật khẩu"}
      </Button>
    </form>
  );
}
