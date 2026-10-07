"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { TYPE_LABEL, findPrototype, linePrice, cartProblems, type Catalog } from "@/components/cart/catalog";
import { PickupLocationPicker } from "@/components/order/pickup-location";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart/store";
import { uploadCartDesigns, type SubmitProgress } from "@/lib/cart/submit";
import { useHydrated } from "@/lib/cart/use-hydrated";
import { colorLabel, formatVND } from "@/lib/format";
import { checkPromoCode, createOrder } from "@/lib/orders/actions";
import {
  addDays,
  leadDaysFor,
  makeCheckoutFormSchema,
  type CheckoutForm as CheckoutValues,
  type CheckoutFormInput,
  todayInVietnam,
} from "@/lib/orders/checkout-schema";
import { computeDiscount, promoSummary, type PromoRule } from "@/lib/orders/discounts";
import { PICKUP_NOTE_LABEL, PICKUP_NOTE_PLACEHOLDER } from "@/lib/orders/pickup";
import { PREPAY_CUSTOM, PREPAY_PERCENTS, minConfirmAmount, prepayAmount, prepayFor } from "@/lib/orders/pricing";
import { cn } from "@/lib/utils";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

const choice = (active: boolean) =>
  cn(
    "flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
    active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
  );

type Contact = { customer_name: string; phone: string; email: string };

/** FR07: customer details, fulfilment, prepay choice and consent, then create the order. */
export function CheckoutForm({ catalog, contact }: { catalog: Catalog; contact: Contact }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const drafts = useCart((s) => s.drafts);
  const clearCart = useCart((s) => s.clear);
  const [progress, setProgress] = useState<SubmitProgress | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  // FR31: the code as typed, and the rule once the server accepted it.
  const [codeInput, setCodeInput] = useState("");
  const [promo, setPromo] = useState<PromoRule | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  // A custom shirt needs a week before pickup/delivery; the cart can change, so read it at validation time.
  const leadDays = leadDaysFor(items);
  const leadRef = useRef(leadDays);
  leadRef.current = leadDays;
  const subtotalRef = useRef<number | undefined>(undefined);
  const resolver: Resolver<CheckoutFormInput, unknown, CheckoutValues> = (values, context, options) =>
    zodResolver(makeCheckoutFormSchema(leadRef.current, subtotalRef.current))(values, context, options);

  const form = useForm<CheckoutFormInput, unknown, CheckoutValues>({
    resolver,
    defaultValues: {
      ...contact,
      fulfillment: "PICKUP",
      address: "",
      receive_date: "",
      receive_time: "",
      pickup_location: "",
      note: "",
      prepay_percent: 50,
      consent: false,
    },
  });
  const { register, handleSubmit, watch, setValue, formState } = form;
  const errors = formState.errors;
  const fulfillment = watch("fulfillment");
  const pickupLocation = watch("pickup_location");
  const minDate = addDays(todayInVietnam(), leadDays);
  const percent = Number(watch("prepay_percent"));

  if (!hydrated) return <p className="py-12 text-center text-muted-foreground">Đang tải…</p>;
  if (!items.length && !progress) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg">Giỏ hàng đang trống.</p>
        <Button asChild>
          <Link href="/thiet-ke">Tự thiết kế áo</Link>
        </Button>
      </div>
    );
  }
  if (cartProblems(items, catalog).size && !progress) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg">Một số áo trong giỏ không còn bán (mẫu đã tắt, hoặc màu/size đã thay đổi).</p>
        <Button asChild>
          <Link href="/gio-hang">Cập nhật giỏ hàng</Link>
        </Button>
      </div>
    );
  }

  const discount = computeDiscount(items, catalog.prices, catalog.combos, promo);
  const subtotal = discount.total;
  subtotalRef.current = subtotal;
  const customAmount = Number(watch("prepay_custom")) || 0;
  const prepayNow = prepayFor(subtotal, percent, customAmount);
  const submitting = progress !== null;

  async function applyCode() {
    const code = codeInput.trim();
    if (!code) return;
    setCheckingCode(true);
    setCodeError(null);
    const result = await checkPromoCode(code);
    setCheckingCode(false);
    if (result.ok) setPromo(result.data);
    else {
      setPromo(null);
      setCodeError(result.error);
    }
  }

  function removeCode() {
    setPromo(null);
    setCodeInput("");
    setCodeError(null);
  }

  async function onSubmit(values: CheckoutValues) {
    setServerError(null);
    setProgress({ label: "Đang chuẩn bị…", done: 0, total: 1 });
    try {
      const uploads = await uploadCartDesigns(items, drafts, catalog, setProgress);
      const result = await createOrder({
        form: values,
        items: items.map((i) => ({
          type: i.type,
          color: i.color,
          size: i.size,
          quantity: i.quantity,
          uploadId: uploads.get(i.id),
          prototypeId: i.type === "PROTOTYPE" ? i.prototypeId : undefined,
          consult: i.type === "CUSTOM" && i.consult ? true : undefined,
        })),
        promoCode: promo?.code,
      });
      if (!result.ok) throw new Error(result.error);
      clearCart();
      router.replace(`/thanh-toan/${result.data.code}?t=${result.data.token}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Không tạo được đơn hàng. Vui lòng thử lại.");
      setProgress(null);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-[1fr_340px]" noValidate>
      <fieldset disabled={submitting} className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Thông tin người đặt</h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="customer_name">Họ tên</Label>
            <Input id="customer_name" autoComplete="name" {...register("customer_name")} />
            <FieldError message={errors.customer_name?.message} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />
              <FieldError message={errors.phone?.message} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              <FieldError message={errors.email?.message} />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Hình thức nhận hàng</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={choice(fulfillment === "PICKUP")}>
              <span className="flex items-center gap-2 font-medium">
                <input type="radio" value="PICKUP" className="size-4 accent-primary" {...register("fulfillment")} />
                Nhận tại campus
              </span>
              <span className="pl-6 text-muted-foreground">Hẹn giờ và địa điểm nhận áo</span>
            </label>
            <label className={choice(fulfillment === "DELIVERY")}>
              <span className="flex items-center gap-2 font-medium">
                <input type="radio" value="DELIVERY" className="size-4 accent-primary" {...register("fulfillment")} />
                Giao hàng
              </span>
              <span className="pl-6 text-muted-foreground">Phí ship bạn trả trực tiếp cho đơn vị vận chuyển</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {fulfillment === "DELIVERY" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="address">Địa chỉ nhận hàng</Label>
                <Textarea id="address" rows={2} autoComplete="street-address" {...register("address")} />
                <FieldError message={errors.address?.message} />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="pickup_location">Địa điểm hẹn</Label>
                <PickupLocationPicker
                  id="pickup_location"
                  value={pickupLocation}
                  onChange={(v) => setValue("pickup_location", v, { shouldValidate: formState.isSubmitted })}
                  invalid={!!errors.pickup_location}
                />
                <FieldError message={errors.pickup_location?.message} />
              </div>
            )}
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">
                {fulfillment === "PICKUP" ? "Thời gian hẹn nhận" : "Thời gian mong muốn nhận hàng"}
              </legend>
              <div className="grid grid-cols-[1fr_8rem] gap-2">
                <Input
                  id="receive_date"
                  type="date"
                  aria-label="Ngày nhận hàng"
                  min={minDate}
                  className="h-11"
                  aria-invalid={!!errors.receive_date || undefined}
                  {...register("receive_date")}
                />
                <Input
                  id="receive_time"
                  type="time"
                  aria-label="Giờ nhận hàng"
                  step={300}
                  className="h-11"
                  aria-invalid={!!errors.receive_time || undefined}
                  {...register("receive_time")}
                />
              </div>
              {leadDays > 0 && (
                <p className="text-sm text-muted-foreground">
                  Đơn có áo custom cần ít nhất {leadDays} ngày để thiết kế và in: chọn ngày từ{" "}
                  {minDate.split("-").reverse().join("/")}.
                </p>
              )}
              <FieldError message={errors.receive_date?.message ?? errors.receive_time?.message} />
            </fieldset>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">{fulfillment === "PICKUP" ? `${PICKUP_NOTE_LABEL} (không bắt buộc)` : "Ghi chú (không bắt buộc)"}</Label>
            <Textarea
              id="note"
              rows={2}
              placeholder={fulfillment === "PICKUP" ? PICKUP_NOTE_PLACEHOLDER : undefined}
              {...register("note")}
            />
            <FieldError message={errors.note?.message} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Thanh toán trước</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PREPAY_PERCENTS.map((p) => (
              <label key={p} className={choice(percent === p)}>
                <span className="flex items-center gap-2 font-medium">
                  <input type="radio" value={p} className="size-4 accent-primary" {...register("prepay_percent")} />
                  {p}%
                </span>
                <span className="pl-6 tabular-nums text-muted-foreground">{formatVND(prepayAmount(subtotal, p))}</span>
              </label>
            ))}
            <label className={choice(percent === PREPAY_CUSTOM)}>
              <span className="flex items-center gap-2 font-medium">
                <input type="radio" value={PREPAY_CUSTOM} className="size-4 accent-primary" {...register("prepay_percent")} />
                Số tiền khác
              </span>
              <span className="pl-6 text-muted-foreground">Tự nhập</span>
            </label>
          </div>
          {percent === PREPAY_CUSTOM && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="prepay_custom">Số tiền bạn muốn chuyển trước (đ)</Label>
              <Input
                id="prepay_custom"
                type="number"
                inputMode="numeric"
                min={minConfirmAmount(subtotal)}
                max={subtotal}
                step={1}
                className="sm:max-w-60"
                aria-invalid={!!errors.prepay_custom || undefined}
                {...register("prepay_custom")}
              />
              <p className="text-sm text-muted-foreground">
                Từ {formatVND(minConfirmAmount(subtotal))} (50% tổng đơn) đến {formatVND(subtotal)}.
              </p>
              <FieldError message={errors.prepay_custom?.message} />
            </div>
          )}
          <FieldError message={errors.prepay_percent?.message} />
          <p className="text-sm text-muted-foreground">Phần còn lại thanh toán khi nhận áo.</p>
        </section>

        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-primary" {...register("consent")} />
            <span>
              Tôi đồng ý để TỰA xử lý dữ liệu cá nhân của tôi để thực hiện đơn hàng, theo{" "}
              <Link href="/chinh-sach" target="_blank" className="underline underline-offset-4">
                chính sách xử lý dữ liệu cá nhân
              </Link>{" "}
              (Nghị định 13/2023/NĐ-CP).
            </span>
          </label>
          <FieldError message={errors.consent?.message} />
        </div>
      </fieldset>

      <aside className="flex h-fit flex-col gap-4 rounded-xl border p-5 lg:sticky lg:top-20">
        <h2 className="font-semibold">Đơn hàng ({items.reduce((n, i) => n + i.quantity, 0)} sản phẩm)</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span>
                {i.type === "BLINDBOX"
                  ? `${catalog.blindbox?.name ?? TYPE_LABEL.BLINDBOX} × ${i.quantity}`
                  : `${i.type === "PROTOTYPE" ? `${TYPE_LABEL.PROTOTYPE} "${findPrototype(catalog, i.prototypeId)?.name ?? ""}"` : TYPE_LABEL[i.type]}${i.consult ? " (cần tư vấn)" : ""} · ${colorLabel(catalog.colors, i.color)} · ${i.size} × ${i.quantity}`}
              </span>
              <span className="tabular-nums">{formatVND(linePrice(i.type, catalog) * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 border-t pt-3">
          <Label htmlFor="promo_code">Mã giảm giá</Label>
          {promo && !discount.promoProblem ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-emerald-600/40 bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950">
              <span>
                <span className="font-semibold">{promo.code}</span>
                <span className="block text-xs text-muted-foreground">{promoSummary(promo)}</span>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={removeCode} disabled={submitting}>
                Bỏ mã
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                id="promo_code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void applyCode();
                  }
                }}
                maxLength={30}
                autoComplete="off"
                disabled={submitting}
              />
              <Button type="button" variant="outline" onClick={() => void applyCode()} disabled={submitting || checkingCode || !codeInput.trim()}>
                {checkingCode ? <Loader2 className="animate-spin" /> : "Áp dụng"}
              </Button>
            </div>
          )}
          {(codeError ?? discount.promoProblem) && <p className="text-sm text-destructive">{codeError ?? discount.promoProblem}</p>}
        </div>
        <div className="flex flex-col gap-1 border-t pt-3 text-sm">
          {discount.discount > 0 && (
            <>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Tiền hàng</span>
                <span className="tabular-nums">{formatVND(discount.itemsTotal)}</span>
              </p>
              {discount.combos.map((c) => (
                <p key={c.id} className="flex justify-between gap-2 text-emerald-700 dark:text-emerald-400">
                  <span>
                    Combo {c.name} ×{c.times}
                  </span>
                  <span className="tabular-nums">−{formatVND(c.saving)}</span>
                </p>
              ))}
              {discount.promo && (
                <p className="flex justify-between gap-2 text-emerald-700 dark:text-emerald-400">
                  <span>Mã {discount.promo.code}</span>
                  <span className="tabular-nums">−{formatVND(discount.promo.discount)}</span>
                </p>
              )}
            </>
          )}
          <p className="flex justify-between">
            <span className="text-muted-foreground">Tổng đơn</span>
            <span className="font-semibold tabular-nums">{formatVND(subtotal)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Chuyển khoản trước{percent === PREPAY_CUSTOM ? "" : ` (${percent}%)`}</span>
            <span className="text-lg font-bold tabular-nums">{formatVND(prepayNow)}</span>
          </p>
        </div>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" className="h-12" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" /> {progress.label}
            </>
          ) : (
            "Đặt hàng"
          )}
        </Button>
        {submitting && <p className="text-center text-xs text-muted-foreground">Vui lòng không đóng trang.</p>}
      </aside>
    </form>
  );
}
