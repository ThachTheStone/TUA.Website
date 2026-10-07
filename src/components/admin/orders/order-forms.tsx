"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { FormError, SubmitButton, useAdminForm, type FormAction } from "@/components/admin/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PickupLocationField } from "@/components/order/pickup-location";
import { Textarea } from "@/components/ui/textarea";
import { formatVND } from "@/lib/format";
import { parseReceiveTime } from "@/lib/orders/checkout-schema";
import { PICKUP_NOTE_LABEL, PICKUP_NOTE_PLACEHOLDER } from "@/lib/orders/pickup";

// Client forms on the admin order detail page (FR14, FR15, FR29). The server re-checks
// every amount; the hints here are for staff only.

const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs";

function MethodSelect({ id }: { id: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={id}>
      Phương thức
      <select id={id} name="method" defaultValue="TRANSFER" className={selectClass}>
        <option value="TRANSFER">Chuyển khoản</option>
        <option value="CASH">Tiền mặt</option>
      </select>
    </label>
  );
}

function NoteInput({ id }: { id: string }) {
  return (
    <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-muted-foreground" htmlFor={id}>
      Ghi chú (không bắt buộc)
      <Input id={id} name="note" maxLength={300} className="h-9" />
    </label>
  );
}

/** "Đã cọc": the amount that really arrived, below `subtotal`. Under `min` (50%) only warns. */
export function DepositForm({ action, defaultAmount, min, subtotal }: { action: FormAction; defaultAmount: number; min: number; subtotal: number }) {
  const { state, onSubmit, pending, formRef, key } = useAdminForm(action, "Đã ghi nhận tiền cọc");
  const [amount, setAmount] = useState(defaultAmount);
  const belowMin = amount > 0 && amount < min;
  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
      <FormError state={state} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor="deposit-amount">
          Số tiền đã nhận (đ)
          <Input
            id="deposit-amount"
            name="amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={subtotal - 1}
            step={1}
            value={Number.isNaN(amount) ? "" : amount}
            onChange={(e) => setAmount(e.target.valueAsNumber)}
            required
            className="h-9 w-40"
          />
        </label>
        <MethodSelect id="deposit-method" />
        <NoteInput id="deposit-note" />
        <SubmitButton pending={pending}>Đã cọc</SubmitButton>
      </div>
      <p className="text-xs text-muted-foreground">
        Nhập đúng số tiền khách đã chuyển, nhỏ hơn tổng đơn {formatVND(subtotal)}. Mức cọc 50% là {formatVND(min)}.
      </p>
      {belowMin && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Thấp hơn mức cọc 50% (BR02). Vẫn lưu được; lịch sử sẽ ghi &quot;dưới mức cọc 50%&quot;.
        </p>
      )}
    </form>
  );
}

/** "Đã thanh toán 100%": records the remaining amount. */
export function FullPaymentForm({ action, remaining }: { action: FormAction; remaining: number }) {
  const { state, onSubmit, pending, formRef, key } = useAdminForm(action, "Đã ghi nhận thanh toán đủ");
  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
      <FormError state={state} />
      <div className="flex flex-wrap items-end gap-3">
        <MethodSelect id="full-method" />
        <NoteInput id="full-note" />
        <SubmitButton pending={pending}>Đã thanh toán 100%</SubmitButton>
      </div>
      <p className="text-xs text-muted-foreground">Ghi nhận thêm {formatVND(remaining)} để đơn được thanh toán đủ.</p>
    </form>
  );
}

export function CancelForm({ action, paidAmount }: { action: FormAction; paidAmount: number }) {
  const { state, onSubmit, pending, formRef, key } = useAdminForm(action, "Đã hủy đơn");
  return (
    <form
      key={key}
      ref={formRef}
      onSubmit={(e) => {
        if (!window.confirm("Hủy đơn này? Thao tác không thể hoàn tác.")) return e.preventDefault();
        onSubmit(e);
      }}
      className="flex flex-col gap-3"
    >
      <FormError state={state} />
      <Textarea name="reason" rows={2} maxLength={300} required placeholder="Lý do hủy (gửi cho khách qua email)" />
      {paidAmount > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Khách đã trả {formatVND(paidAmount)}. Đơn sẽ được đánh dấu cần hoàn tiền (BR06).
        </p>
      )}
      <SubmitButton pending={pending}>Hủy đơn</SubmitButton>
    </form>
  );
}

export function RejectDesignForm({ action, id }: { action: FormAction; id: string }) {
  const { state, onSubmit, pending, formRef, key } = useAdminForm(action, "Đã từ chối thiết kế");
  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-2">
      <FormError state={state} />
      <Textarea
        id={`reject-${id}`}
        name="reason"
        rows={2}
        maxLength={500}
        required
        placeholder="Lý do từ chối (khách sẽ thấy trong tài khoản và email)"
      />
      <SubmitButton pending={pending}>Từ chối</SubmitButton>
    </form>
  );
}

/** FR29: paste or change the Drive link of a custom shirt designed outside the website. */
export function DesignLinkForm({ action, id, link }: { action: FormAction; id: string; link: string | null }) {
  const { state, onSubmit, pending, formRef, key } = useAdminForm(action, "Đã lưu link thiết kế");
  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-2">
      <FormError state={state} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs text-muted-foreground" htmlFor={`link-${id}`}>
          Link Drive thiết kế
          <Input
            id={`link-${id}`}
            name="link"
            type="url"
            defaultValue={link ?? ""}
            maxLength={500}
            placeholder="https://drive.google.com/…"
            className="h-9"
          />
        </label>
        <SubmitButton pending={pending}>{link ? "Lưu link" : "Thêm link"}</SubmitButton>
      </div>
    </form>
  );
}

/** Closes the surrounding EditableCard after a successful save. */
const CloseEditor = createContext<() => void>(() => {});

function useCloseOnSuccess(ok: boolean | undefined) {
  const close = useContext(CloseEditor);
  useEffect(() => {
    if (ok) close();
  }, [ok, close]);
}

/**
 * A detail card with an edit button in its header. While editing, `form` replaces the content,
 * or follows it when `keepContent` (the money card keeps its figures in view).
 */
export function EditableCard({
  title,
  editLabel,
  form,
  keepContent = false,
  children,
}: {
  title: string;
  editLabel: string;
  form: React.ReactNode;
  keepContent?: boolean;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {form && (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? "Đóng" : editLabel}
          </Button>
        )}
      </div>
      {(!editing || keepContent) && children}
      {editing && (
        <CloseEditor.Provider value={() => setEditing(false)}>
          <div className={keepContent ? "border-t pt-3" : undefined}>{form}</div>
        </CloseEditor.Provider>
      )}
    </section>
  );
}

const paymentPreview = (amount: number, subtotal: number) =>
  amount <= 0 ? "Chưa thanh toán" : amount >= subtotal ? "Đã thanh toán 100%" : "Đã cọc";

/** Staff/Admin: re-enter the total actually received. The server recomputes the payment status. */
export function AdjustPaidForm({
  action,
  paidAmount,
  subtotal,
  minDeposit,
}: {
  action: FormAction;
  paidAmount: number;
  subtotal: number;
  minDeposit: number;
}) {
  const { state, onSubmit, pending, formRef, key } = useAdminForm(action, "Đã sửa số tiền đã nhận");
  const [amount, setAmount] = useState(paidAmount);
  useCloseOnSuccess(state?.ok);
  const valid = Number.isInteger(amount) && amount >= 0 && amount <= subtotal;
  return (
    <form
      key={key}
      ref={formRef}
      onSubmit={(e) => {
        if (!window.confirm(`Sửa số tiền đã nhận từ ${formatVND(paidAmount)} thành ${formatVND(amount)}?`)) return e.preventDefault();
        onSubmit(e);
      }}
      className="flex flex-col gap-3"
    >
      <FormError state={state} />
      <label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor="adjust-amount">
        Tổng số tiền thực tế đã nhận (đ)
        <Input
          id="adjust-amount"
          name="amount"
          type="number"
          inputMode="numeric"
          min={0}
          max={subtotal}
          step={1}
          value={Number.isNaN(amount) ? "" : amount}
          onChange={(e) => setAmount(e.target.valueAsNumber)}
          required
          className="h-9 w-44"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Gồm cả các lần đã ghi nhận trước. Tổng đơn {formatVND(subtotal)}.
        {valid && (
          <>
            {" "}
            Trạng thái thanh toán mới: <span className="font-medium text-foreground">{paymentPreview(amount, subtotal)}</span>.
          </>
        )}
      </p>
      {valid && amount > 0 && amount < minDeposit && (
        <p className="text-xs text-amber-700 dark:text-amber-400">Thấp hơn mức cọc 50% ({formatVND(minDeposit)}, BR02).</p>
      )}
      <Textarea name="reason" rows={2} maxLength={300} required placeholder="Lý do sửa (ví dụ: nhập nhầm, khách chuyển thêm…)" />
      <SubmitButton pending={pending}>Lưu số tiền</SubmitButton>
    </form>
  );
}

export type OrderInfoValues = {
  customer_name: string;
  phone: string;
  email: string | null;
  fulfillment: "DELIVERY" | "PICKUP";
  address: string | null;
  preferred_time: string | null;
  pickup_location: string | null;
  note: string | null;
};

function InfoField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Staff/Admin: buyer contact and delivery details. Items and money are not editable here. */
/** `minDate`: earliest date allowed (a week after the order date when it has a custom shirt). */
export function OrderInfoForm({ action, values, minDate }: { action: FormAction; values: OrderInfoValues; minDate: string }) {
  const picked = parseReceiveTime(values.preferred_time);
  const { state, onSubmit, pending, formRef, key } = useAdminForm(action, "Đã lưu thông tin đơn");
  const [fulfillment, setFulfillment] = useState(values.fulfillment);
  useCloseOnSuccess(state?.ok);
  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
      <FormError state={state} />
      <InfoField id="info-name" label="Họ tên">
        <Input id="info-name" name="customer_name" defaultValue={values.customer_name} maxLength={100} required className="h-9" />
      </InfoField>
      <InfoField id="info-phone" label="Số điện thoại">
        <Input id="info-phone" name="phone" type="tel" inputMode="tel" defaultValue={values.phone} maxLength={20} required className="h-9" />
      </InfoField>
      <InfoField id="info-email" label="Email (không bắt buộc)">
        <Input id="info-email" name="email" type="email" defaultValue={values.email ?? ""} maxLength={200} className="h-9" />
      </InfoField>
      <InfoField id="info-fulfillment" label="Nhận hàng">
        <select
          id="info-fulfillment"
          name="fulfillment"
          value={fulfillment}
          onChange={(e) => setFulfillment(e.target.value as OrderInfoValues["fulfillment"])}
          className={selectClass}
        >
          <option value="DELIVERY">Giao hàng</option>
          <option value="PICKUP">Nhận tại campus</option>
        </select>
      </InfoField>
      {fulfillment === "DELIVERY" ? (
        <InfoField id="info-address" label="Địa chỉ">
          <Textarea id="info-address" name="address" rows={2} defaultValue={values.address ?? ""} maxLength={300} required />
        </InfoField>
      ) : (
        <InfoField id="info-location" label="Địa điểm hẹn">
          <PickupLocationField id="info-location" name="pickup_location" defaultValue={values.pickup_location ?? ""} />
        </InfoField>
      )}
      <InfoField id="info-time" label={fulfillment === "PICKUP" ? "Thời gian hẹn nhận" : "Thời gian nhận hàng"}>
        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <Input id="info-time" name="receive_date" type="date" min={minDate} defaultValue={picked?.date ?? ""} aria-label="Ngày nhận hàng" className="h-9" />
          <Input name="receive_time" type="time" step={300} defaultValue={picked?.time ?? ""} aria-label="Giờ nhận hàng" className="h-9" />
        </div>
        {!picked && values.preferred_time && (
          <p className="text-xs text-muted-foreground">Hiện tại: {values.preferred_time}. Để trống nếu giữ nguyên.</p>
        )}
      </InfoField>
      <InfoField id="info-note" label={fulfillment === "PICKUP" ? `${PICKUP_NOTE_LABEL} (không bắt buộc)` : "Ghi chú (không bắt buộc)"}>
        <Textarea
          id="info-note"
          name="note"
          rows={2}
          defaultValue={values.note ?? ""}
          maxLength={500}
          placeholder={fulfillment === "PICKUP" ? PICKUP_NOTE_PLACEHOLDER : undefined}
        />
      </InfoField>
      <p className="text-xs text-muted-foreground">Khách tra cứu đơn bằng mã đơn và số điện thoại, nên báo khách nếu đổi số.</p>
      <SubmitButton pending={pending}>Lưu thông tin</SubmitButton>
    </form>
  );
}
