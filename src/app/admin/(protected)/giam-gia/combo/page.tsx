import type { Metadata } from "next";
import { ComboForm } from "@/components/admin/combo-form";
import { EditPanel } from "@/components/admin/edit-panel";
import { ConfirmActionButton } from "@/components/admin/form-kit";
import { Badge } from "@/components/ui/badge";
import { createCombo, deleteCombo, updateCombo } from "@/lib/admin/discount-actions";
import { listCombos } from "@/lib/discounts/queries";
import { formatDate, formatVND, isoToVnLocal } from "@/lib/format";
import { comboContents, comboSaving, isLiveWindow } from "@/lib/orders/discounts";
import { getSettings } from "@/lib/settings";
import { requireRole } from "@/lib/supabase/auth";
import type { Combo } from "@/types/db";

export const metadata: Metadata = { title: "Combo" };
export const dynamic = "force-dynamic";

function period(c: Combo): string {
  if (!c.starts_at && !c.ends_at) return "Không giới hạn thời gian";
  return `${c.starts_at ? formatDate(c.starts_at) : "…"} – ${c.ends_at ? formatDate(c.ends_at) : "…"}`;
}

export default async function CombosPage() {
  await requireRole(["ADMIN", "STAFF"]);
  const [combos, settings] = await Promise.all([listCombos(), getSettings()]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Combo tự động áp dụng trong giỏ hàng khi khách có đủ sản phẩm, và hiển thị ở trang chủ và trang Blindbox.
      </p>
      <EditPanel summary={<span className="font-medium">+ Thêm combo</span>} defaultOpen={combos.length === 0}>
        <ComboForm action={createCombo} prices={settings.prices} />
      </EditPanel>

      {combos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có combo nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {combos.map((combo) => {
            const saving = comboSaving(combo, settings.prices);
            return (
              <EditPanel
                key={combo.id}
                summary={
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">{combo.name}</span>
                    {combo.is_active && isLiveWindow(combo) && saving > 0 ? (
                      <Badge>Đang áp dụng</Badge>
                    ) : (
                      <Badge variant="outline">
                        {!combo.is_active ? "Đã tắt" : saving <= 0 ? "Giá không thấp hơn giá lẻ" : "Ngoài thời gian"}
                      </Badge>
                    )}
                    <span className="text-sm">
                      {comboContents(combo.items)} = {formatVND(combo.price)}
                    </span>
                    <span className="w-full text-xs text-muted-foreground">{period(combo)}</span>
                  </div>
                }
                actions={
                  <ConfirmActionButton
                    action={deleteCombo.bind(null, combo.id)}
                    confirmText={`Xóa combo "${combo.name}"?`}
                    successMessage="Đã xóa combo"
                  >
                    Xóa combo
                  </ConfirmActionButton>
                }
              >
                <ComboForm
                  action={updateCombo.bind(null, combo.id)}
                  combo={combo}
                  prices={settings.prices}
                  startsAt={isoToVnLocal(combo.starts_at)}
                  endsAt={isoToVnLocal(combo.ends_at)}
                />
              </EditPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
