/* eslint-disable @next/next/no-img-element -- signed storage URLs expire; next/image would cache them */
import { Download } from "lucide-react";
import { ConfirmActionButton } from "@/components/admin/form-kit";
import { ApprovalBadge } from "@/components/admin/orders/badges";
import { RejectDesignForm } from "@/components/admin/orders/order-forms";
import { setDesignStatus, rejectDesign } from "@/lib/admin/order-actions";
import { formatDate, formatVND } from "@/lib/format";
import type { AdminOrderItem } from "@/lib/orders/admin-queries";

const TYPE_LABEL = { PLAIN: "Áo trơn", CUSTOM: "Áo custom" } as const;

/** One order line; custom shirts show the design, print files and the FR29 review buttons. */
export function ItemCard({ item, code, locked }: { item: AdminOrderItem; code: string; locked: boolean }) {
  const status = item.approvalStatus;
  const canReview = !locked && (status === "PENDING_APPROVAL" || status === "UNDER_REVIEW");

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row">
      {item.type === "CUSTOM" && (
        <div className="w-full shrink-0 sm:w-64">
          {item.previewUrl ? (
            <a href={item.previewUrl} target="_blank" rel="noreferrer">
              <img src={item.previewUrl} alt={`Thiết kế áo ${item.index}`} className="w-full rounded-lg border bg-muted object-contain" />
            </a>
          ) : (
            <div className="flex aspect-[2/1] items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
              Không có ảnh xem trước
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold">
              Áo {item.index}: {TYPE_LABEL[item.type]}
              {item.designSource === "SCAN" && <span className="font-normal text-muted-foreground"> (scan Workshop)</span>}
            </p>
            <p className="text-sm text-muted-foreground">
              {item.colorLabel} · Size {item.size} · {item.quantity} × {formatVND(item.unitPrice)}
            </p>
          </div>
          {status && <ApprovalBadge status={status} />}
        </div>

        {item.files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.files.map((f) =>
              f.downloadUrl ? (
                <a
                  key={f.area}
                  href={f.downloadUrl}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted"
                >
                  <Download className="size-4" /> {f.areaLabel}
                  {f.widthPx && f.heightPx && (
                    <span className="text-xs text-muted-foreground">
                      {f.widthPx}×{f.heightPx}
                    </span>
                  )}
                </a>
              ) : (
                <span key={f.area} className="text-sm text-destructive">
                  Không tạo được liên kết tải {f.areaLabel}
                </span>
              ),
            )}
          </div>
        )}

        {item.assetUrls.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Ảnh khách tải lên ({item.assetUrls.length}) – kiểm tra bản quyền, nội dung</span>
            <div className="flex flex-wrap gap-2">
              {item.assetUrls.map((url, n) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" title={`Ảnh ${n + 1}`}>
                  <img src={url} alt={`Ảnh khách tải lên ${n + 1}`} className="size-20 rounded-md border bg-muted object-contain" />
                </a>
              ))}
            </div>
          </div>
        )}

        {status === "REJECTED" && (
          <p className="rounded-md bg-red-50 p-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
            Lý do từ chối: {item.rejectReason}. Đang chờ khách sửa và gửi lại.
          </p>
        )}
        {item.reviewedAt && (
          <p className="text-xs text-muted-foreground">
            Cập nhật bởi {item.reviewedBy ?? "khách"} lúc {formatDate(item.reviewedAt)}
          </p>
        )}

        {canReview && (
          <div className="flex flex-col gap-3 border-t pt-3">
            <div className="flex flex-wrap gap-2">
              {status === "PENDING_APPROVAL" && (
                <ConfirmActionButton action={setDesignStatus.bind(null, item.id, code, "UNDER_REVIEW")} successMessage="Đã nhận xem xét" variant="outline">
                  Xem xét
                </ConfirmActionButton>
              )}
              {status === "UNDER_REVIEW" && (
                <ConfirmActionButton action={setDesignStatus.bind(null, item.id, code, "PENDING_APPROVAL")} successMessage="Đã trả về hàng chờ" variant="ghost">
                  Trả lại hàng chờ
                </ConfirmActionButton>
              )}
              <ConfirmActionButton
                action={setDesignStatus.bind(null, item.id, code, "APPROVED")}
                confirmText="Duyệt thiết kế này? Sau khi duyệt, khách không sửa được nữa."
                successMessage="Đã duyệt thiết kế"
                variant="default"
              >
                Duyệt
              </ConfirmActionButton>
            </div>
            <RejectDesignForm action={rejectDesign.bind(null, item.id, code)} id={item.id} />
          </div>
        )}
      </div>
    </div>
  );
}
