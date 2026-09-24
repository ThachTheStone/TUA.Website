import "server-only";
import { foreignAssets } from "@/lib/design/assets.server";
import type { DesignAreas } from "@/lib/design/types";
import { DESIGNS_BUCKET, collectUploadedDesign } from "@/lib/orders/design-upload";
import { CLOSED_STATUSES } from "@/lib/orders/state-machine";
import { getSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";
import type { OrderStatus } from "@/types/db";

// FR29: the buyer fixes a REJECTED custom shirt and sends it back for approval.
// Only the design changes; type, color, size, quantity and price stay as ordered.

export type ResubmitTarget = {
  orderId: string;
  code: string;
  itemId: string;
  color: string;
  size: string;
  rejectReason: string | null;
  areas: DesignAreas;
};

type ItemRow = {
  id: string;
  type: string;
  color: string;
  size: string;
  approval_status: string | null;
  reject_reason: string | null;
  orders: { id: string; code: string; status: OrderStatus; customer_id: string | null } | null;
  designs: { source: string; canvas_json: { file?: string } | null } | null;
};

/** The rejected shirt with its current design, or a Vietnamese reason why it can't be edited. */
export async function getResubmitTarget(customerId: string, code: string, itemId: string): Promise<ActionResult<ResubmitTarget>> {
  const db = createServiceClient();
  const { data } = await db
    .from("order_items")
    .select("id, type, color, size, approval_status, reject_reason, orders(id, code, status, customer_id), designs(source, canvas_json)")
    .eq("id", itemId)
    .maybeSingle();
  const item = data as unknown as ItemRow | null;
  const order = item?.orders;
  if (!item || !order || order.customer_id !== customerId || order.code !== code.toUpperCase()) {
    return { ok: false, error: "Không tìm thấy áo trong đơn của bạn" };
  }
  if (CLOSED_STATUSES.includes(order.status)) return { ok: false, error: "Đơn đã hủy hoặc hết hạn" };
  if (item.type !== "CUSTOM" || item.approval_status !== "REJECTED") {
    return { ok: false, error: "Chỉ sửa được thiết kế đang bị từ chối" };
  }
  const file = item.designs?.source === "CANVAS" ? item.designs.canvas_json?.file : undefined;
  if (!file) return { ok: false, error: "Thiết kế này không sửa được trên website. Vui lòng liên hệ Ban tổ chức." };

  const { data: json, error } = await db.storage.from(DESIGNS_BUCKET).download(file);
  if (error || !json) return { ok: false, error: "Không tải được thiết kế cũ. Vui lòng thử lại." };
  let areas: DesignAreas;
  try {
    areas = JSON.parse(await json.text()) as DesignAreas;
  } catch {
    return { ok: false, error: "Thiết kế cũ bị lỗi. Vui lòng liên hệ Ban tổ chức." };
  }

  return {
    ok: true,
    data: { orderId: order.id, code: order.code, itemId: item.id, color: item.color, size: item.size, rejectReason: item.reject_reason, areas },
  };
}

export async function resubmitDesign(customerId: string, code: string, itemId: string, uploadId: string): Promise<ActionResult> {
  const target = await getResubmitTarget(customerId, code, itemId);
  if (!target.ok) return target;

  const design = await collectUploadedDesign(uploadId, await getSettings());
  if (!design) return { ok: false, error: "Thiết kế chưa được tải lên đầy đủ. Vui lòng thử lại." };
  if ((await foreignAssets(design.canvas_json.assets, customerId)).length) {
    return { ok: false, error: "Thiết kế có ảnh không thuộc tài khoản của bạn. Vui lòng chèn lại ảnh." };
  }

  const db = createServiceClient();
  const { count } = await db
    .from("design_files")
    .select("id", { count: "exact", head: true })
    .in("file_path", design.files.map((f) => f.file_path));
  if (count) return { ok: false, error: "Thiết kế này đã được gửi. Vui lòng tải lại trang." };

  const { data: changed, error } = await db.rpc("resubmit_design", { p_item_id: itemId, p_design: design });
  if (error) {
    console.error("[resubmit] rpc", error.message);
    return { ok: false, error: "Không gửi lại được thiết kế. Vui lòng thử lại." };
  }
  if (!changed) return { ok: false, error: "Thiết kế vừa được cập nhật. Vui lòng tải lại trang." };
  return { ok: true, data: undefined };
}
