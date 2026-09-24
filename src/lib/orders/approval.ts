import "server-only";
import { APPROVAL_ALLOWED, APPROVAL_LABEL, CLOSED_STATUSES } from "@/lib/orders/state-machine";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";
import type { ApprovalStatus, OrderStatus } from "@/types/db";

// FR29, SRS §5.3: every review step of a custom shirt goes through reviewDesign(),
// which checks the allowed steps and writes `design_reviews` in the same statement.

export type ReviewedDesign = { orderId: string; from: ApprovalStatus; to: ApprovalStatus };

export async function reviewDesign(
  itemId: string,
  to: ApprovalStatus,
  { reason = null, userId }: { reason?: string | null; userId: string | null },
): Promise<ActionResult<ReviewedDesign>> {
  const db = createServiceClient();
  const { data: item, error } = await db
    .from("order_items")
    .select("id, order_id, type, approval_status, orders(status)")
    .eq("id", itemId)
    .maybeSingle();
  if (error) return { ok: false, error: "Không đọc được thiết kế" };
  if (!item || item.type !== "CUSTOM" || !item.approval_status) return { ok: false, error: "Không tìm thấy áo custom" };

  const orderStatus = (item.orders as unknown as { status: OrderStatus } | null)?.status;
  if (orderStatus && CLOSED_STATUSES.includes(orderStatus)) {
    return { ok: false, error: "Đơn đã hủy hoặc hết hạn, không duyệt được thiết kế" };
  }

  const from = item.approval_status as ApprovalStatus;
  if (!APPROVAL_ALLOWED[from].includes(to)) {
    return { ok: false, error: `Không thể chuyển thiết kế từ "${APPROVAL_LABEL[from]}" sang "${APPROVAL_LABEL[to]}"` };
  }
  const cleanReason = reason?.trim() || null;
  if (to === "REJECTED" && !cleanReason) return { ok: false, error: "Vui lòng nhập lý do từ chối" };

  const { data: changed, error: rpcError } = await db.rpc("review_design", {
    p_item_id: itemId,
    p_from: from,
    p_to: to,
    p_reason: cleanReason,
    p_user: userId,
  });
  if (rpcError) {
    console.error("[approval] review_design", rpcError.message);
    return { ok: false, error: "Không cập nhật được trạng thái duyệt. Vui lòng thử lại." };
  }
  if (!changed) return { ok: false, error: "Thiết kế vừa được cập nhật bởi người khác. Vui lòng tải lại trang." };

  return { ok: true, data: { orderId: item.order_id, from, to } };
}
