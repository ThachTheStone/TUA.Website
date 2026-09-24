"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signInWithGoogle, signUp } from "@/lib/customers/actions";

// FR26 buyer auth forms. `next` is where to go after signing in (already sanitized server-side).

function GoogleSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="lg" className="h-12 w-full" disabled={pending}>
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
      </svg>
      {pending ? "Đang chuyển tới Google…" : "Tiếp tục với Google"}
    </Button>
  );
}

export function GoogleButton({ next }: { next: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <GoogleSubmit />
    </form>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> hoặc <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function Field({ id, label, ...props }: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} className="h-11" {...props} />
    </div>
  );
}

/** Submits without React's automatic form reset, so typed values survive an error. */
function keepValues(action: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form onSubmit={keepValues(action)} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {state && !state.ok && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Field id="email" label="Email" type="email" autoComplete="email" required />
      <Field id="password" label="Mật khẩu" type="password" autoComplete="current-password" required />
      <Button type="submit" size="lg" className="h-12" disabled={pending}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <Link href={`/dang-ky?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline underline-offset-4">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUp, null);

  if (state?.ok) {
    return (
      <Alert>
        <AlertDescription>
          Chúng tôi đã gửi liên kết xác thực tới <strong>{state.data.email}</strong>. Vui lòng mở email và bấm liên kết để
          kích hoạt tài khoản (kiểm tra cả mục Spam).
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={keepValues(action)} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {state && !state.ok && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Field id="full_name" label="Họ tên" autoComplete="name" required />
      <Field id="phone" label="Số điện thoại" type="tel" inputMode="tel" autoComplete="tel" required />
      <Field id="email" label="Email" type="email" autoComplete="email" required />
      <Field id="password" label="Mật khẩu (tối thiểu 8 ký tự)" type="password" autoComplete="new-password" minLength={8} required />
      <Field id="confirm" label="Nhập lại mật khẩu" type="password" autoComplete="new-password" required />
      <Button type="submit" size="lg" className="h-12" disabled={pending}>
        {pending ? "Đang đăng ký…" : "Đăng ký"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link href={`/dang-nhap?next=${encodeURIComponent(next)}`} className="font-medium text-foreground underline underline-offset-4">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
