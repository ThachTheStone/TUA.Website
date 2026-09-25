"use client";

import { useActionState } from "react";
import { login } from "@/lib/auth-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Đăng nhập quản trị</CardTitle>
        <CardDescription>Dành cho Ban tổ chức TỰA</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          {state && !state.ok && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <PasswordInput id="password" name="password" autoComplete="current-password" required />
          </div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Đang đăng nhập…" : "Đăng nhập"}
          </Button>
          {/* FR20: staff passwords are reset by an Admin in "Tài khoản". */}
          <p className="text-center text-sm text-muted-foreground">Quên mật khẩu? Liên hệ Admin để được đặt lại.</p>
        </form>
      </CardContent>
    </Card>
  );
}
