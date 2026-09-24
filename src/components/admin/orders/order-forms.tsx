"use client";

import { FormError, SubmitButton, useAdminForm, type FormAction } from "@/components/admin/form-kit";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatVND } from "@/lib/format";

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

/** "Đã cọc": amount received, at least `min` and below `subtotal`. */
export function DepositForm({ action, defaultAmount, min, subtotal }: { action: FormAction; defaultAmount: number; min: number; subtotal: number }) {
  const { state, onSubmit, pending, formRef, key } = useAdminForm(action, "Đã ghi nhận tiền cọc");
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
            min={min}
            max={subtotal - 1}
            step={1000}
            defaultValue={defaultAmount}
            required
            className="h-9 w-40"
          />
        </label>
        <MethodSelect id="deposit-method" />
        <NoteInput id="deposit-note" />
        <SubmitButton pending={pending}>Đã cọc</SubmitButton>
      </div>
      <p className="text-xs text-muted-foreground">
        Tối thiểu {formatVND(min)} (50%), nhỏ hơn tổng đơn {formatVND(subtotal)}.
      </p>
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
