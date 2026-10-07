/* eslint-disable @next/next/no-img-element -- signed storage URLs expire; next/image would cache them */
import { Download, ExternalLink } from "lucide-react";
import { ConfirmActionButton } from "@/components/admin/form-kit";
import { ApprovalBadge } from "@/components/admin/orders/badges";
import { DesignLinkForm, RejectDesignForm } from "@/components/admin/orders/order-forms";
import { setDesignLink, setDesignStatus, rejectDesign } from "@/lib/admin/order-actions";
import { TYPE_LABEL } from "@/components/cart/catalog";
import { formatDate, formatVND } from "@/lib/format";
import { CUSTOM_KIND_LABEL } from "@/lib/orders/pickup";
import type { AdminOrderItem } from "@/lib/orders/admin-queries";

/**
 * One order line; custom shirts show the design, print files and the FR29 review buttons.
 * Prototype lines show the prototype and its print files (FR14), with no review.
 */
export function ItemCard({ item, code, locked }: { item: AdminOrderItem; code: string; locked: boolean }) {
  const status = item.approvalStatus;
  const canReview = !locked && (status === "PENDING_APPROVAL" || status === "UNDER_REVIEW");
  // A Drive link instead of print files: "Link Drive" shirts and Workshop "Tự thiết kế".
  const usesLink = item.type === "CUSTOM" && item.customKind !== "UPLOAD" && item.files.length === 0;
  const canEditLink = usesLink && !locked && status !== "APPROVED";

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row">
      {item.prototype && (
        <div className="w-full shrink-0 sm:w-40">
          {item.prototype.image ? (
            <img src={item.prototype.image} alt={item.prototype.name} className="aspect-square w-full rounded-lg border bg-muted object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">Không có ảnh</div>
          )}
        </div>
      )}
      {item.type === "CUSTOM" && (
        <div className="w-full shrink-0 sm:w-64">
          {item.previewUrl ? (
            <a href={item.previewUrl} target="_blank" rel="noreferrer">
              <img src={item.previewUrl} alt={`Thiết kế áo ${item.index}`} className="w-full rounded-lg border bg-muted object-contain" />
            </a>
          ) : (
            <div className="flex aspect-[2/1] items-center justify-center rounded-lg border bg-muted p-3 text-center text-xs text-muted-foreground">
              {usesLink ? (item.designLink ? "Thiết kế ở link Drive" : "Chưa có thiết kế") : "Không có ảnh xem trước"}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold">
              #{item.index}: {TYPE_LABEL[item.type]}
              {item.prototype && ` "${item.prototype.name}"`}
              {item.customKind && <span className="font-normal text-muted-foreground"> ({CUSTOM_KIND_LABEL[item.customKind]})</span>}
            </p>
            <p className="text-sm text-muted-foreground">
              {item.type !== "BLINDBOX" && `${item.colorLabel} · Size ${item.size} · `}
              {item.quantity} × {formatVND(item.unitPrice)}
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

        {usesLink && (
          <div className="flex flex-col gap-2">
            {item.printAreaLabel && (
              <p className="text-sm">
                Vùng in: <strong>{item.printAreaLabel}</strong>
              </p>
            )}
            {item.designLink ? (
              <a
                href={item.designLink}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm break-all hover:bg-muted"
              >
                <ExternalLink className="size-4 shrink-0" /> {item.designLink}
              </a>
            ) : (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Chưa có link thiết kế. Liên hệ khách qua Zalo, rồi dán link Drive vào đây và duyệt trước khi in.
              </p>
            )}
            {canEditLink && <DesignLinkForm action={setDesignLink.bind(null, item.id, code)} id={item.id} link={item.designLink} />}
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
            Lý do từ chối: {item.rejectReason}. {usesLink ? "Cập nhật link thiết kế mới để duyệt lại." : "Đang chờ khách sửa và gửi lại."}
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
              {!(usesLink && !item.designLink) && (
                <ConfirmActionButton
                  action={setDesignStatus.bind(null, item.id, code, "APPROVED")}
                  confirmText="Duyệt thiết kế này? Sau khi duyệt, khách không sửa được nữa."
                  successMessage="Đã duyệt thiết kế"
                  variant="default"
                >
                  Duyệt
                </ConfirmActionButton>
              )}
            </div>
            <RejectDesignForm action={rejectDesign.bind(null, item.id, code)} id={item.id} />
          </div>
        )}
      </div>
    </div>
  );
}
