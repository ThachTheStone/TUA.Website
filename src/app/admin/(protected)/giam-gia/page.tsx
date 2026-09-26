import type { Metadata } from "next";
import { EditPanel } from "@/components/admin/edit-panel";
import { ConfirmActionButton } from "@/components/admin/form-kit";
import { PromoCodeForm } from "@/components/admin/promo-code-form";
import { Badge } from "@/components/ui/badge";
import { createPromoCode, deletePromoCode, updatePromoCode } from "@/lib/admin/discount-actions";
import { listPromoCodes, promoUsage } from "@/lib/discounts/queries";
import { formatDate, isoToVnLocal } from "@/lib/format";
import { isLiveWindow, promoSummary } from "@/lib/orders/discounts";
import { requireRole } from "@/lib/supabase/auth";
import type { PromoCode } from "@/types/db";

export const metadata: Metadata = { title: "Mã giảm giá" };
export const dynamic = "force-dynamic";

function period(p: PromoCode): string {
  if (!p.starts_at && !p.ends_at) return "Không giới hạn thời gian";
  return `${p.starts_at ? formatDate(p.starts_at) : "…"} – ${p.ends_at ? formatDate(p.ends_at) : "…"}`;
}

export default async function PromoCodesPage() {
  await requireRole(["ADMIN"]);
  const [codes, usage] = await Promise.all([listPromoCodes(), promoUsage()]);

  return (
    <div className="flex flex-col gap-6">
      <EditPanel summary={<span className="font-medium">+ Thêm mã giảm giá</span>} defaultOpen={codes.length === 0}>
        <PromoCodeForm action={createPromoCode} />
      </EditPanel>

      {codes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có mã giảm giá nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {codes.map((promo) => {
            const used = usage.get(promo.id) ?? 0;
            const usedUp = promo.max_uses !== null && used >= promo.max_uses;
            const live = promo.is_active && isLiveWindow(promo) && !usedUp;
            return (
              <EditPanel
                key={promo.id}
                summary={
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono font-semibold">{promo.code}</span>
                    {live ? (
                      <Badge>Đang áp dụng</Badge>
                    ) : (
                      <Badge variant="outline">{!promo.is_active ? "Đã tắt" : usedUp ? "Hết lượt" : "Ngoài thời gian"}</Badge>
                    )}
                    <span className="text-sm">{promoSummary(promo)}</span>
                    <span className="w-full text-xs text-muted-foreground">
                      Đã dùng {used}
                      {promo.max_uses !== null && `/${promo.max_uses}`} lượt · {period(promo)}
                    </span>
                  </div>
                }
                actions={
                  <ConfirmActionButton
                    action={deletePromoCode.bind(null, promo.id)}
                    confirmText={`Xóa mã ${promo.code}?`}
                    successMessage="Đã xóa mã"
                  >
                    Xóa mã
                  </ConfirmActionButton>
                }
              >
                <PromoCodeForm
                  action={updatePromoCode.bind(null, promo.id)}
                  promo={promo}
                  startsAt={isoToVnLocal(promo.starts_at)}
                  endsAt={isoToVnLocal(promo.ends_at)}
                />
              </EditPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
