"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { OK, fail, optionalText, readForm, requiredText } from "@/lib/admin/form";
import { reviewDesign, updateDesignLink } from "@/lib/orders/approval";
import { designLinkSchema } from "@/lib/orders/checkout-schema";
import { notifyOrder } from "@/lib/orders/notify";
import { orderInfoSchema, updateOrderInfo } from "@/lib/orders/edit-info";
import { adjustPaidAmount, confirmPayment } from "@/lib/orders/payments";
import { transitionOrder } from "@/lib/orders/transition";
import { syncSheetsLater } from "@/lib/sheets";
import { requireRole } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";
import type { ApprovalStatus, OrderStatus } from "@/types/db";

// FR14, FR15, FR29: staff actions on one order. Every action checks the role itself
// (hard rule 8); rules live in lib/orders (payments.ts, approval.ts, transition.ts).

const idSchema = z.uuid();

function refresh(code: string) {
  revalidatePath("/admin/don-hang");
  revalidatePath(`/admin/don-hang/${code}`);
  revalidatePath("/admin");
}

const methodSchema = z.enum(["TRANSFER", "CASH"], { error: "Vui lòng chọn phương thức" });

const depositSchema = z.object({
  amount: z.coerce.number({ error: "Số tiền không hợp lệ" }).int("Số tiền phải là số nguyên").positive("Vui lòng nhập số tiền"),
  method: methodSchema,
  note: optionalText(300, "Ghi chú"),
});

/** "Đã cọc": the buyer paid 50%/75%; staff enters what actually arrived. */
export async function recordDeposit(orderId: string, code: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const staff = await requireRole();
  if (!idSchema.safeParse(orderId).success) return fail("Đơn hàng không hợp lệ");
  const parsed = depositSchema.safeParse(readForm(formData, ["amount", "method", "note"]));
  if (!parsed.success) return fail(parsed.error);

  const result = await confirmPayment(orderId, { kind: "DEPOSIT", ...parsed.data, userId: staff.userId });
  if (!result.ok) return result;
  after(() => notifyOrder(orderId, { kind: "DEPOSIT_PAID" }));
  refresh(code);
  return OK;
}

const fullSchema = z.object({ method: methodSchema, note: optionalText(300, "Ghi chú") });

/** "Đã thanh toán 100%": records whatever is still owed. */
export async function recordFullPayment(orderId: string, code: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const staff = await requireRole();
  if (!idSchema.safeParse(orderId).success) return fail("Đơn hàng không hợp lệ");
  const parsed = fullSchema.safeParse(readForm(formData, ["method", "note"]));
  if (!parsed.success) return fail(parsed.error);

  const result = await confirmPayment(orderId, { kind: "FULL", ...parsed.data, userId: staff.userId });
  if (!result.ok) return result;
  after(() => notifyOrder(orderId, { kind: "FULLY_PAID" }));
  refresh(code);
  return OK;
}

const adjustSchema = z.object({
  amount: z.coerce.number({ error: "Số tiền không hợp lệ" }).int("Số tiền phải là số nguyên").min(0, "Số tiền không được âm"),
  reason: requiredText(300, "Lý do sửa"),
});

/** "Sửa số tiền đã nhận": replaces the total received (history keeps old → new, who, why). */
export async function adjustPaid(orderId: string, code: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const staff = await requireRole();
  if (!idSchema.safeParse(orderId).success) return fail("Đơn hàng không hợp lệ");
  const parsed = adjustSchema.safeParse(readForm(formData, ["amount", "reason"]));
  if (!parsed.success) return fail(parsed.error);

  const result = await adjustPaidAmount(orderId, { ...parsed.data, userId: staff.userId });
  if (!result.ok) return result;
  refresh(code);
  return OK;
}

/** "Sửa thông tin đơn": buyer contact and delivery details, Staff and Admin. */
export async function editOrderInfo(orderId: string, code: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const staff = await requireRole();
  if (!idSchema.safeParse(orderId).success) return fail("Đơn hàng không hợp lệ");
  const parsed = orderInfoSchema.safeParse(
    readForm(formData, ["customer_name", "phone", "email", "fulfillment", "address", "receive_date", "receive_time", "pickup_location", "note"]),
  );
  if (!parsed.success) return fail(parsed.error);

  const result = await updateOrderInfo(orderId, parsed.data, staff.userId);
  if (!result.ok) return result;
  refresh(code);
  return OK;
}

/** Status buttons other than payment and cancel. PAYMENT_REVIEW → PENDING_PAYMENT = "chưa thấy tiền". */
const ADVANCE_TARGETS: OrderStatus[] = ["PENDING_PAYMENT", "PRINTING", "QC", "READY", "DELIVERED"];

export async function advanceOrder(orderId: string, code: string, to: OrderStatus): Promise<ActionResult> {
  const staff = await requireRole();
  if (!idSchema.safeParse(orderId).success || !ADVANCE_TARGETS.includes(to)) return fail("Thao tác không hợp lệ");

  const note = to === "PENDING_PAYMENT" ? "Chưa thấy tiền trong sao kê" : null;
  const result = await transitionOrder(orderId, to, { userId: staff.userId, note });
  if (!result.ok) return result;
  if (to === "READY" || to === "DELIVERED") after(() => notifyOrder(orderId, { kind: to }));
  refresh(code);
  return OK;
}

const cancelSchema = z.object({ reason: requiredText(300, "Lý do hủy") });

export async function cancelOrder(orderId: string, code: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const staff = await requireRole();
  if (!idSchema.safeParse(orderId).success) return fail("Đơn hàng không hợp lệ");
  const parsed = cancelSchema.safeParse(readForm(formData, ["reason"]));
  if (!parsed.success) return fail(parsed.error);

  const { reason } = parsed.data;
  const result = await transitionOrder(orderId, "CANCELLED", { userId: staff.userId, note: reason, cancelReason: reason });
  if (!result.ok) return result;
  after(() => notifyOrder(orderId, { kind: "CANCELLED", reason }));
  refresh(code);
  return OK;
}

/** BR06: the refund decided for a cancelled order has been paid back. */
export async function markRefunded(orderId: string, code: string): Promise<ActionResult> {
  await requireRole();
  if (!idSchema.safeParse(orderId).success) return fail("Đơn hàng không hợp lệ");
  const { data, error } = await createServiceClient()
    .from("orders")
    .update({ refund_status: "DONE" })
    .eq("id", orderId)
    .eq("refund_status", "REQUIRED")
    .select("id");
  if (error) return fail("Không cập nhật được trạng thái hoàn tiền");
  if (!data?.length) return fail("Đơn không ở trạng thái cần hoàn tiền");
  syncSheetsLater();
  refresh(code);
  return OK;
}

const REVIEW_TARGETS: ApprovalStatus[] = ["UNDER_REVIEW", "APPROVED", "PENDING_APPROVAL"];

/** FR29 "Xem xét" / "Duyệt" / "Trả lại hàng chờ". Rejection has its own form (reason required). */
export async function setDesignStatus(itemId: string, code: string, to: ApprovalStatus): Promise<ActionResult> {
  const staff = await requireRole();
  if (!idSchema.safeParse(itemId).success || !REVIEW_TARGETS.includes(to)) return fail("Thao tác không hợp lệ");
  const result = await reviewDesign(itemId, to, { userId: staff.userId });
  if (!result.ok) return result;
  refresh(code);
  return OK;
}

const rejectSchema = z.object({ reason: requiredText(500, "Lý do từ chối") });

export async function rejectDesign(itemId: string, code: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const staff = await requireRole();
  if (!idSchema.safeParse(itemId).success) return fail("Thiết kế không hợp lệ");
  const parsed = rejectSchema.safeParse(readForm(formData, ["reason"]));
  if (!parsed.success) return fail(parsed.error);

  const result = await reviewDesign(itemId, "REJECTED", { reason: parsed.data.reason, userId: staff.userId });
  if (!result.ok) return result;
  const { orderId } = result.data;
  after(() => notifyOrder(orderId, { kind: "DESIGN_REJECTED", itemId, reason: parsed.data.reason }));
  refresh(code);
  return OK;
}

const linkSchema = z.object({ link: designLinkSchema });

/** FR29: the Drive link of a "Link Drive" / "Tự thiết kế" custom shirt (Staff and Admin). */
export async function setDesignLink(itemId: string, code: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const staff = await requireRole();
  if (!idSchema.safeParse(itemId).success) return fail("Áo không hợp lệ");
  const parsed = linkSchema.safeParse(readForm(formData, ["link"]));
  if (!parsed.success) return fail(parsed.error);

  const result = await updateDesignLink(itemId, parsed.data.link || null, staff.userId);
  if (!result.ok) return result;
  refresh(code);
  return OK;
}
