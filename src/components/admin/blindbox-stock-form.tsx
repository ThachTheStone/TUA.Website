"use client";

import { FormError, SubmitButton, useAdminForm } from "@/components/admin/form-kit";
import { Input } from "@/components/ui/input";
import { saveBlindboxRemaining } from "@/lib/admin/blindbox-actions";

/** FR32 in Kho hàng: how many boxes are left. Boxes in live orders are kept on top of this. */
export function BlindboxStockForm({ name, remaining, sold }: { name: string; remaining: number; sold: number }) {
  const { state, onSubmit, pending, formRef, key } = useAdminForm(saveBlindboxRemaining, "Đã lưu số hộp còn lại");
  return (
    <form key={key} ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
      <FormError state={state} />
      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor="bb-remaining" className="flex flex-col gap-1.5 text-sm font-medium">
          {name}: số hộp còn lại
          <Input id="bb-remaining" name="remaining" type="number" min={0} inputMode="numeric" defaultValue={remaining} required className="w-32" />
        </label>
        <SubmitButton pending={pending}>Lưu</SubmitButton>
      </div>
      <p className="text-xs text-muted-foreground">
        Đã bán/giữ chỗ {sold} hộp trong các đơn chưa hủy. Khách thấy &quot;Còn {remaining} hộp&quot; trên Cửa hàng.
      </p>
    </form>
  );
}
