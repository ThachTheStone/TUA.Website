"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDonationAction } from "@/lib/donations/actions";
import {
  DONATION_PRESETS,
  donationFormSchema,
  type DonationFormInput,
  type DonationFormValues,
} from "@/lib/donations/schema";
import { formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

const choice = (active: boolean) =>
  cn(
    "flex flex-col gap-0.5 rounded-lg border p-3 text-left text-sm",
    active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
  );

/** FR08: donor details and amount; on success, go to the QR page for the fund account. */
export function DonationForm({ min }: { min: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => donationFormSchema(min), [min]);
  const presets = DONATION_PRESETS.filter((p) => p >= min);

  const { register, handleSubmit, watch, setValue, formState } = useForm<DonationFormInput, unknown, DonationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: "", contact: "", amount: presets[0] ?? min, message: "", is_public: true, consent: false },
  });
  const errors = formState.errors;
  const amount = Number(watch("amount"));
  const isPublic = watch("is_public");
  const message = watch("message") ?? "";

  function onSubmit(values: DonationFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await createDonationAction(values);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      router.push(`/quyen-gop/${result.data.code}?t=${result.data.token}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <fieldset disabled={pending} className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <Label htmlFor="amount">Số tiền quyên góp</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setValue("amount", p, { shouldValidate: true })}
                aria-pressed={amount === p}
                className={cn(
                  "h-11 rounded-md border text-sm font-medium tabular-nums",
                  amount === p ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {formatVND(p)}
              </button>
            ))}
          </div>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              inputMode="numeric"
              min={min}
              step={1000}
              className="h-11 pr-8 text-base tabular-nums"
              {...register("amount")}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">đ</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tối thiểu {formatVND(min)}.{amount >= min ? ` Bạn sẽ chuyển ${formatVND(amount)}.` : ""}
          </p>
          <FieldError message={errors.amount?.message} />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="display_name">Tên hiển thị</Label>
            <Input id="display_name" autoComplete="name" maxLength={100} {...register("display_name")} />
            <FieldError message={errors.display_name?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact">Email hoặc số điện thoại</Label>
            <Input id="contact" autoComplete="email" maxLength={200} {...register("contact")} />
            <p className="text-xs text-muted-foreground">
              Chỉ Ban tổ chức xem được. Nhập email để nhận thư cảm ơn khi khoản quyên góp được xác nhận.
            </p>
            <FieldError message={errors.contact?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="message">Lời nhắn (không bắt buộc)</Label>
            <Textarea id="message" rows={3} maxLength={300} {...register("message")} />
            <p className="text-right text-xs text-muted-foreground tabular-nums">{message.length}/300</p>
            <FieldError message={errors.message?.message} />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Bảng vinh danh</h2>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Hiển thị trên Bảng vinh danh">
            <button type="button" role="radio" aria-checked={isPublic} className={choice(isPublic)} onClick={() => setValue("is_public", true)}>
              <span className="font-medium">Hiển thị công khai</span>
              <span className="text-muted-foreground">Tên hiển thị, số tiền và lời nhắn</span>
            </button>
            <button type="button" role="radio" aria-checked={!isPublic} className={choice(!isPublic)} onClick={() => setValue("is_public", false)}>
              <span className="font-medium">Ẩn danh</span>
              <span className="text-muted-foreground">Hiện là “Nhà hảo tâm ẩn danh”</span>
            </button>
          </div>
        </section>

        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-primary" {...register("consent")} />
            <span>
              Tôi đồng ý để TỰA xử lý dữ liệu cá nhân của tôi để ghi nhận khoản quyên góp, theo{" "}
              <Link href="/chinh-sach" target="_blank" className="underline underline-offset-4">
                chính sách xử lý dữ liệu cá nhân
              </Link>{" "}
              (Nghị định 13/2023/NĐ-CP).
            </span>
          </label>
          <FieldError message={errors.consent?.message} />
        </div>
      </fieldset>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" className="h-12" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Tiếp tục đến bước chuyển khoản
      </Button>
    </form>
  );
}
