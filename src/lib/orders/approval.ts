import "server-only";
import { MISSING_RPC } from "@/lib/orders/payments";
import { APPROVAL_ALLOWED, APPROVAL_LABEL, CLOSED_STATUSES } from "@/lib/orders/state-machine";
import { syncSheetsLater } from "@/lib/sheets";
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
    .select("id, order_id, type, approval_status, design_link, orders(status), designs(design_files(id))")
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
  // "Cần tư vấn áo" and Workshop shirts without a file: nothing to print until a design exists.
  const files = (item.designs as unknown as { design_files: { id: string }[] } | null)?.design_files ?? [];
  if (to === "APPROVED" && !files.length && !item.design_link) {
    return { ok: false, error: "Áo này chưa có thiết kế. Thêm link thiết kế trước khi duyệt." };
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

  syncSheetsLater();
  return { ok: true, data: { orderId: item.order_id, from, to } };
}

/**
 * FR29 "Link thiết kế": staff add or change the Drive link of a LINK / SELF custom shirt while it
 * is not approved yet. A rejected shirt goes back to "Chờ duyệt" with the new link.
 */
export async function updateDesignLink(itemId: string, link: string | null, userId: string): Promise<ActionResult> {
  const db = createServiceClient();
  const { data: item, error } = await db
    .from("order_items")
    .select("id, order_id, type, approval_status, custom_kind, design_link, orders(status)")
    .eq("id", itemId)
    .maybeSingle();
  if (error) return { ok: false, error: "Không đọc được áo custom" };
  if (!item || item.type !== "CUSTOM") return { ok: false, error: "Không tìm thấy áo custom" };
  if (item.custom_kind === "UPLOAD") return { ok: false, error: "Áo dạng upload dùng file ảnh, không dùng link" };
  if (item.approval_status === "APPROVED") return { ok: false, error: "Thiết kế đã duyệt, không đổi link được" };
  const orderStatus = (item.orders as unknown as { status: OrderStatus } | null)?.status;
  if (orderStatus && CLOSED_STATUSES.includes(orderStatus)) return { ok: false, error: "Đơn đã hủy hoặc hết hạn" };
  if ((item.design_link ?? null) === link) return { ok: false, error: "Link chưa thay đổi" };

  // "Áo 2" like the admin page: lines in id order.
  const { data: lines } = await db.from("order_items").select("id").eq("order_id", item.order_id).order("id");
  const index = (lines ?? []).findIndex((l) => l.id === itemId) + 1;
  const { data: changed, error: rpcError } = await db.rpc("set_design_link", {
    p_item_id: itemId,
    p_link: link,
    p_note: `${link ? "Cập nhật" : "Xóa"} link thiết kế áo ${index}${link ? `: ${link}` : ""}`,
    p_user: userId,
  });
  if (rpcError) {
    console.error("[approval] set_design_link", rpcError.message);
    if (rpcError.code === MISSING_RPC) return { ok: false, error: "Cơ sở dữ liệu chưa cập nhật (cần chạy migration 0017)." };
    return { ok: false, error: "Không lưu được link thiết kế. Vui lòng thử lại." };
  }
  if (!changed) return { ok: false, error: "Không tìm thấy áo custom" };

  if (link && item.approval_status === "REJECTED") {
    const back = await reviewDesign(itemId, "PENDING_APPROVAL", { userId });
    if (!back.ok) return back;
  }
  syncSheetsLater();
  return { ok: true, data: undefined };
}
