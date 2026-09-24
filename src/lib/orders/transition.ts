import "server-only";
import { canTransition, STATUS_LABEL } from "@/lib/orders/state-machine";
import { createServiceClient } from "@/lib/supabase/server";
import type { OrderStatus, RefundStatus } from "@/types/db";
import type { ActionResult } from "@/types/action";

// Hard rule 5: every order status change goes through transitionOrder().

export type TransitionOptions = {
  note?: string | null;
  /** Staff profile id; null/undefined means the customer or the system. */
  userId?: string | null;
  cancelReason?: string | null;
};

export type TransitionResult = { from: OrderStatus; to: OrderStatus };

export async function transitionOrder(
  orderId: string,
  to: OrderStatus,
  { note = null, userId = null, cancelReason = null }: TransitionOptions = {},
): Promise<ActionResult<TransitionResult>> {
  const db = createServiceClient();
  const { data: order, error } = await db
    .from("orders")
    .select("id, status, subtotal, paid_amount")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return { ok: false, error: `Không đọc được đơn hàng: ${error.message}` };
  if (!order) return { ok: false, error: "Không tìm thấy đơn hàng" };

  const from = order.status as OrderStatus;
  if (!canTransition(from, to)) {
    return {
      ok: false,
      error: `Không thể chuyển đơn từ "${STATUS_LABEL[from]}" sang "${STATUS_LABEL[to]}"`,
    };
  }

  // §5.1: an order is confirmed only by recording money (confirmPayment in payments.ts).
  if (to === "CONFIRMED") {
    return { ok: false, error: 'Dùng nút "Đã cọc" hoặc "Đã thanh toán 100%" để xác nhận đơn' };
  }

  // BR12: printing starts only when every custom design is approved.
  if (to === "PRINTING") {
    const { count, error: countError } = await db
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId)
      .eq("type", "CUSTOM")
      .neq("approval_status", "APPROVED");
    if (countError) return { ok: false, error: "Không kiểm tra được trạng thái duyệt thiết kế" };
    if (count) return { ok: false, error: `Còn ${count} thiết kế chưa được duyệt. Duyệt hết trước khi in.` };
  }

  const patch: { refund_status?: RefundStatus; cancel_reason?: string } = {};
  if (to === "CANCELLED") {
    if (cancelReason) patch.cancel_reason = cancelReason;
    // BR06: money already received must be tracked for a refund decision.
    if (order.paid_amount > 0) patch.refund_status = "REQUIRED";
  }

  const { data: changed, error: rpcError } = await db.rpc("transition_order", {
    p_order_id: orderId,
    p_from: from,
    p_to: to,
    p_note: note,
    p_changed_by: userId,
    p_patch: patch,
  });
  if (rpcError) return { ok: false, error: `Không cập nhật được trạng thái: ${rpcError.message}` };
  if (!changed) return { ok: false, error: "Đơn hàng vừa được cập nhật bởi người khác. Vui lòng tải lại trang." };

  // Emails are sent by the caller (lib/orders/notify.ts); the Sheets sync (Phase 8) hooks in here.
  return { ok: true, data: { from, to } };
}
