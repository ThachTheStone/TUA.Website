import type { Metadata } from "next";
import { requireRole } from "@/lib/supabase/auth";
import { isPromotionLive, listPromotions } from "@/lib/content";
import { formatDate, isoToVnLocal } from "@/lib/format";
import { createPromotion, deletePromotion, updatePromotion } from "@/lib/admin/content-actions";
import { PromotionForm } from "@/components/admin/promotion-form";
import { EditPanel } from "@/components/admin/edit-panel";
import { ConfirmActionButton } from "@/components/admin/form-kit";
import { Badge } from "@/components/ui/badge";
import type { Promotion } from "@/types/db";

export const metadata: Metadata = { title: "Khuyến mãi" };

function period(p: Promotion): string {
  if (!p.starts_at && !p.ends_at) return "Không giới hạn thời gian";
  return `${p.starts_at ? formatDate(p.starts_at) : "…"} – ${p.ends_at ? formatDate(p.ends_at) : "…"}`;
}

export default async function PromotionsPage() {
  await requireRole(["ADMIN"]);
  const promotions = await listPromotions();

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Khuyến mãi chỉ là nội dung hiển thị trên trang chủ, không tự động giảm giá trong giỏ hàng.
      </p>

      <EditPanel summary={<span className="font-medium">+ Thêm khuyến mãi</span>} defaultOpen={promotions.length === 0}>
        <PromotionForm action={createPromotion} />
      </EditPanel>

      {promotions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có khuyến mãi nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {promotions.map((promotion) => (
            <EditPanel
              key={promotion.id}
              summary={
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{promotion.title}</span>
                  {isPromotionLive(promotion) ? (
                    <Badge>Đang hiển thị</Badge>
                  ) : (
                    <Badge variant="outline">{promotion.is_active ? "Ngoài thời gian" : "Đã tắt"}</Badge>
                  )}
                  <span className="w-full text-xs text-muted-foreground">{period(promotion)}</span>
                </div>
              }
              actions={
                <ConfirmActionButton
                  action={deletePromotion.bind(null, promotion.id)}
                  confirmText="Xóa khuyến mãi này?"
                  successMessage="Đã xóa khuyến mãi"
                >
                  Xóa khuyến mãi
                </ConfirmActionButton>
              }
            >
              <PromotionForm
                action={updatePromotion.bind(null, promotion.id)}
                promotion={promotion}
                startsAt={isoToVnLocal(promotion.starts_at)}
                endsAt={isoToVnLocal(promotion.ends_at)}
              />
            </EditPanel>
          ))}
        </div>
      )}
    </div>
  );
}
