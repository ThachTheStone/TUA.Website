import "server-only";
import { z } from "zod";
import { formatReceiveTime, leadDaysFor, phoneSchema, receiveTimeIssue, vietnamDate } from "@/lib/orders/checkout-schema";
import { MISSING_RPC } from "@/lib/orders/payments";
import { CLOSED_STATUSES, STATUS_LABEL } from "@/lib/orders/state-machine";
import { syncSheetsLater } from "@/lib/sheets";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";
import type { FulfillmentType, OrderStatus } from "@/types/db";

// FR15 "Sửa thông tin đơn": staff fix the buyer's contact and delivery details.
// Items and money never change here; the history row lists what changed.

const text = (max: number, label: string) => z.string().trim().max(max, `${label} tối đa ${max} ký tự`);

export const orderInfoSchema = z
  .object({
    customer_name: text(100, "Họ tên").min(2, "Vui lòng nhập họ tên khách"),
    phone: phoneSchema,
    email: text(200, "Email").refine((v) => !v || z.email().safeParse(v).success, "Email không hợp lệ"),
    fulfillment: z.enum(["DELIVERY", "PICKUP"], { error: "Vui lòng chọn hình thức nhận hàng" }),
    address: text(300, "Địa chỉ"),
    /** Both empty = keep the stored time (older orders have free text). */
    receive_date: z.string().trim().max(10),
    receive_time: z.string().trim().max(5),
    pickup_location: text(200, "Địa điểm"),
    note: text(500, "Ghi chú"),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === "DELIVERY" && !v.address) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "Vui lòng nhập địa chỉ nhận hàng" });
    }
    if (v.fulfillment === "PICKUP" && !v.pickup_location) {
      ctx.addIssue({ code: "custom", path: ["pickup_location"], message: "Vui lòng chọn địa điểm hẹn nhận" });
    }
    if (!v.receive_date !== !v.receive_time) {
      ctx.addIssue({ code: "custom", path: ["receive_date"], message: "Vui lòng chọn cả ngày và giờ nhận hàng" });
    }
  });

export type OrderInfo = z.output<typeof orderInfoSchema>;

const FULFILLMENT_LABEL: Record<FulfillmentType, string> = { DELIVERY: "Giao hàng", PICKUP: "Nhận tại campus" };

type Stored = {
  customer_name: string;
  phone: string;
  email: string | null;
  fulfillment: FulfillmentType;
  address: string | null;
  preferred_time: string | null;
  pickup_location: string | null;
  note: string | null;
};

/** Short fields show "cũ → mới" in the history; long ones only their name. */
const FIELDS: { key: keyof Stored; label: string; showValues: boolean }[] = [
  { key: "customer_name", label: "Họ tên", showValues: true },
  { key: "phone", label: "SĐT", showValues: true },
  { key: "email", label: "Email", showValues: true },
  { key: "fulfillment", label: "Nhận hàng", showValues: true },
  { key: "address", label: "Địa chỉ", showValues: false },
  { key: "pickup_location", label: "Địa điểm hẹn", showValues: true },
  { key: "preferred_time", label: "Thời gian", showValues: true },
  { key: "note", label: "Ghi chú", showValues: false },
];

function shown(key: keyof Stored, value: string | null): string {
  if (!value) return "(trống)";
  return key === "fulfillment" ? FULFILLMENT_LABEL[value as FulfillmentType] : value;
}

export async function updateOrderInfo(orderId: string, info: OrderInfo, userId: string): Promise<ActionResult> {
  const db = createServiceClient();
  const { data: order, error } = await db
    .from("orders")
    .select("status, created_at, customer_name, phone, email, fulfillment, address, preferred_time, pickup_location, note, order_items(type)")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return { ok: false, error: "Không đọc được đơn hàng" };
  if (!order) return { ok: false, error: "Không tìm thấy đơn hàng" };

  const status = order.status as OrderStatus;
  if (CLOSED_STATUSES.includes(status)) {
    return { ok: false, error: `Đơn đang ở trạng thái "${STATUS_LABEL[status]}", không sửa thông tin được` };
  }

  // A new time is checked like at checkout: in the future, and a week after the order date for custom shirts.
  let preferredTime = order.preferred_time as string | null;
  if (info.receive_date && info.receive_time) {
    const formatted = formatReceiveTime(info.receive_date, info.receive_time);
    if (formatted !== preferredTime) {
      const items = (order.order_items ?? []) as { type: string }[];
      const issue = receiveTimeIssue(info.receive_date, info.receive_time, leadDaysFor(items), vietnamDate(new Date(order.created_at)));
      if (issue) return { ok: false, error: issue.message };
      preferredTime = formatted;
    }
  }

  // Same shape create_order stores: only the fields of the chosen fulfillment are kept.
  const isDelivery = info.fulfillment === "DELIVERY";
  const next: Stored = {
    customer_name: info.customer_name,
    phone: info.phone,
    email: info.email || null,
    fulfillment: info.fulfillment,
    address: isDelivery ? info.address : null,
    preferred_time: preferredTime,
    pickup_location: isDelivery ? null : info.pickup_location,
    note: info.note || null,
  };
  const before = order as Stored;
  const changes = FIELDS.filter(({ key }) => (before[key] || null) !== next[key]).map(({ key, label, showValues }) =>
    showValues ? `${label}: ${shown(key, before[key])} → ${shown(key, next[key])}` : label,
  );
  if (!changes.length) return { ok: false, error: "Chưa có thông tin nào thay đổi" };

  const { data: changed, error: rpcError } = await db.rpc("update_order_info", {
    p_order_id: orderId,
    p_expected_status: status,
    p_customer_name: next.customer_name,
    p_phone: next.phone,
    p_email: next.email,
    p_fulfillment: next.fulfillment,
    p_address: next.address,
    p_preferred_time: next.preferred_time,
    p_pickup_location: next.pickup_location,
    p_order_note: next.note,
    p_note: `Sửa thông tin đơn · ${changes.join(" · ")}`,
    p_user: userId,
  });
  if (rpcError) {
    console.error("[orders] update_order_info", rpcError.message);
    if (rpcError.code === MISSING_RPC) return { ok: false, error: "Cơ sở dữ liệu chưa cập nhật (cần chạy migration 0016)." };
    return { ok: false, error: "Không lưu được thông tin đơn. Vui lòng thử lại." };
  }
  if (!changed) return { ok: false, error: "Đơn hàng vừa được cập nhật bởi người khác. Vui lòng tải lại trang." };

  syncSheetsLater();
  return { ok: true, data: undefined };
}
