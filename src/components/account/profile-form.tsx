"use client";

import { startTransition, useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/customers/actions";

/** FR26: buyer edits their name and phone (email comes from the login and is read-only). */
export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {state && (
        <Alert variant={state.ok ? "default" : "destructive"}>
          <AlertDescription>{state.ok ? "Đã lưu thông tin." : state.error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} readOnly disabled className="h-11" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Họ tên</Label>
        <Input id="full_name" name="full_name" defaultValue={fullName} autoComplete="name" required className="h-11" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Số điện thoại</Label>
        <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={phone} autoComplete="tel" required className="h-11" />
      </div>
      <Button type="submit" className="h-11 self-start" disabled={pending}>
        {pending ? "Đang lưu…" : "Lưu thông tin"}
      </Button>
    </form>
  );
}
