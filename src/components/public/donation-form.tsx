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
  donationFormSchema,
  type DonationFormInput,
  type DonationFormValues,
  type DonationVisibility,
} from "@/lib/donations/schema";
import { formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

const VISIBILITY: { value: DonationVisibility; label: string; hint: string }[] = [
  { value: "public", label: "Hiển thị công khai", hint: "Tên hiển thị, số tiền và lời nhắn" },
  { value: "anonymous", label: "Ẩn danh", hint: "Hiện là “Nhà hảo tâm ẩn danh”" },
  { value: "hidden", label: "Không hiển thị", hint: "Không có trên Bảng vinh danh" },
];

const choice = (active: boolean) =>
  cn(
    "flex flex-col gap-0.5 rounded-2xl border p-3 text-left text-sm transition-colors",
    active ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-muted/50",
  );

/** FR08: how to show on the donor wall, amount and (public only) donor details; then the QR page. */
export function DonationForm({ min }: { min: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => donationFormSchema(min), [min]);

  const { register, handleSubmit, watch, setValue, formState } = useForm<DonationFormInput, unknown, DonationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { visibility: "public", display_name: "", contact: "", amount: "", message: "", consent: false },
  });
  const errors = formState.errors;
  const amount = Number(watch("amount"));
  const visibility = watch("visibility");
  const isPublic = visibility === "public";
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
          <h2 className="text-lg font-semibold">Bảng vinh danh</h2>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Hiển thị trên Bảng vinh danh">
            {VISIBILITY.map((v) => (
              <button
                key={v.value}
                type="button"
                role="radio"
                aria-checked={visibility === v.value}
                className={choice(visibility === v.value)}
                onClick={() => setValue("visibility", v.value, { shouldValidate: formState.isSubmitted })}
              >
                <span className="font-medium">{v.label}</span>
                <span className="text-muted-foreground">{v.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <Label htmlFor="amount" className="text-lg font-semibold">Số tiền quyên góp</Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              inputMode="numeric"
              min={min}
              step={1}
              placeholder="Nhập số tiền"
              className="h-11 pr-8 text-base tabular-nums"
              {...register("amount")}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">đ</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {amount >= min && amount > 0 ? `Bạn sẽ chuyển ${formatVND(amount)}.` : "Nhập số tiền bạn muốn quyên góp."}
          </p>
          <FieldError message={errors.amount?.message} />
        </section>

        {/* RHF keeps the typed values; the schema drops them unless the donation is public. */}
        <fieldset disabled={!isPublic} className="flex flex-col gap-4 disabled:opacity-60">
          {!isPublic && (
            <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
              Bạn đã chọn {visibility === "anonymous" ? "Ẩn danh" : "Không hiển thị"}, nên không cần điền tên, liên hệ và lời nhắn.
              Bạn sẽ không nhận được thư cảm ơn qua email.
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="display_name" className="text-lg font-semibold">Tên hiển thị</Label>
            <Input id="display_name" autoComplete="name" maxLength={100} {...register("display_name")} />
            <FieldError message={errors.display_name?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact" className="text-lg font-semibold">Email hoặc số điện thoại</Label>
            <Input id="contact" autoComplete="email" maxLength={200} {...register("contact")} />
            <p className="text-xs text-muted-foreground">
              Chỉ Ban tổ chức xem được. Nhập email để nhận thư cảm ơn khi khoản quyên góp được xác nhận.
            </p>
            <FieldError message={errors.contact?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="message" className="text-lg font-semibold">Lời nhắn (không bắt buộc)</Label>
            <Textarea id="message" rows={3} maxLength={300} {...register("message")} />
            <p className="text-right text-xs text-muted-foreground tabular-nums">{message.length}/300</p>
            <FieldError message={errors.message?.message} />
          </div>
        </fieldset>

        {isPublic && (
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
        )}
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
