import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { phoneSchema } from "@/lib/orders/checkout-schema";
import { PREPAY_PERCENTS, prepayAmount, subtotalOf, unitPrice } from "@/lib/orders/pricing";
import { getSettings } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";

// FR16: orders staff create at the Campus Workshop. Scans of paper drawings go to the
// private `scans` bucket (BR01: staff upload inside the admin portal). Scans are approved
// on creation because staff saw the drawing in person (FR16, FR29).

export const SCANS_BUCKET = "scans";
const MAX_SCAN_BYTES = 10 * 1024 * 1024;
const SCAN_PATH_RE = /^workshop\/[0-9a-f-]{36}\.(png|jpg)$/;

function scanType(bytes: Uint8Array): "png" | "jpg" | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  return null;
}

/** Stores one scan and returns its storage path. Checks the real file type, not the name. */
export async function saveScan(file: File): Promise<ActionResult<{ path: string }>> {
  if (file.size > MAX_SCAN_BYTES) return { ok: false, error: "Ảnh scan tối đa 10MB" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = scanType(bytes);
  if (!ext) return { ok: false, error: "Ảnh scan phải là JPG hoặc PNG" };

  const path = `workshop/${randomUUID()}.${ext}`;
  const { error } = await createServiceClient()
    .storage.from(SCANS_BUCKET)
    .upload(path, bytes, { contentType: ext === "png" ? "image/png" : "image/jpeg", upsert: false });
  if (error) {
    console.error("[workshop] scan upload failed", error.message);
    return { ok: false, error: "Không tải được ảnh scan lên. Vui lòng thử lại." };
  }
  return { ok: true, data: { path } };
}

const text = (max: number, label: string) => z.string().trim().max(max, `${label} tối đa ${max} ký tự`);

export const workshopOrderSchema = z
  .object({
    customer_name: text(100, "Họ tên").min(2, "Vui lòng nhập họ tên khách"),
    phone: phoneSchema,
    email: z
      .string()
      .trim()
      .max(200)
      .refine((v) => !v || z.email().safeParse(v).success, "Email không hợp lệ"),
    fulfillment: z.enum(["DELIVERY", "PICKUP"]),
    address: text(300, "Địa chỉ"),
    preferred_time: text(200, "Thời gian"),
    pickup_location: text(200, "Địa điểm"),
    note: text(500, "Ghi chú"),
    prepay_percent: z.number().refine((v) => (PREPAY_PERCENTS as readonly number[]).includes(v), "Mức trả trước không hợp lệ"),
    method: z.enum(["CASH", "TRANSFER"]),
    items: z
      .array(
        z.object({
          type: z.enum(["PLAIN", "CUSTOM"]),
          color: z.string().min(1).max(50),
          size: z.string().min(1).max(20),
          quantity: z.number().int().min(1, "Số lượng tối thiểu là 1").max(50, "Số lượng tối đa 50"),
          area: z.string().max(50).optional(),
          scanPath: z.string().regex(SCAN_PATH_RE).optional(),
        }),
      )
      .min(1, "Thêm ít nhất 1 áo")
      .max(20, "Tối đa 20 dòng"),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === "DELIVERY" && !v.address) ctx.addIssue({ code: "custom", message: "Vui lòng nhập địa chỉ giao hàng" });
    if (v.fulfillment === "PICKUP" && !v.pickup_location) ctx.addIssue({ code: "custom", message: "Vui lòng nhập địa điểm hẹn nhận" });
    if (v.items.some((i) => i.type === "CUSTOM" && (!i.scanPath || !i.area))) {
      ctx.addIssue({ code: "custom", message: "Mỗi áo custom cần ảnh scan và vùng in" });
    }
  });

export type WorkshopOrderInput = z.input<typeof workshopOrderSchema>;
export type CreatedWorkshopOrder = {
  id: string;
  code: string;
  accessToken: string;
  method: "CASH" | "TRANSFER";
  prepay: number;
  subtotal: number;
  expiresAt: string | null;
  email: string | null;
  customerName: string;
  fullyPaid: boolean;
};

export async function createWorkshopOrder(input: WorkshopOrderInput, staffId: string): Promise<ActionResult<CreatedWorkshopOrder>> {
  const parsed = workshopOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  const settings = await getSettings();

  const colors = new Set(settings.colors.map((c) => c.key));
  const areas = new Set(settings.print_areas.map((a) => a.key));
  for (const item of v.items) {
    if (!colors.has(item.color) || !settings.sizes.includes(item.size)) return { ok: false, error: "Màu hoặc size không hợp lệ" };
    if (item.type === "CUSTOM" && !areas.has(item.area!)) return { ok: false, error: "Vùng in không hợp lệ" };
  }
  const scanPaths = v.items.flatMap((i) => (i.scanPath ? [i.scanPath] : []));
  if (new Set(scanPaths).size !== scanPaths.length) return { ok: false, error: "Mỗi ảnh scan chỉ dùng cho một áo" };

  const db = createServiceClient();
  if (scanPaths.length) {
    const { count } = await db.from("design_files").select("id", { count: "exact", head: true }).in("file_path", scanPaths);
    if (count) return { ok: false, error: "Ảnh scan đã được dùng cho đơn khác. Vui lòng tải lại." };
  }

  const subtotal = subtotalOf(v.items, settings.prices);
  const prepay = Math.min(subtotal, prepayAmount(subtotal, v.prepay_percent));
  const cash = v.method === "CASH";
  const fullyPaid = cash && prepay >= subtotal;
  const expiresAt = cash ? null : new Date(Date.now() + settings.order_expire_hours * 3600_000).toISOString();
  const isDelivery = v.fulfillment === "DELIVERY";

  const { data, error } = await db.rpc("create_order", {
    p_order: {
      source: "WORKSHOP",
      customer_name: v.customer_name,
      phone: v.phone,
      email: v.email || null,
      fulfillment: v.fulfillment,
      address: isDelivery ? v.address : null,
      preferred_time: v.preferred_time || null,
      pickup_location: isDelivery ? null : v.pickup_location,
      note: v.note || null,
      subtotal,
      prepay_percent: v.prepay_percent,
      prepay_amount: prepay,
      expires_at: expiresAt,
      created_by: staffId,
      history_note: cash ? "Staff tạo đơn Workshop, khách trả tiền mặt" : "Staff tạo đơn Workshop, khách chuyển khoản",
      ...(cash && {
        status: "CONFIRMED",
        payment_status: fullyPaid ? "FULLY_PAID" : "DEPOSIT_PAID",
        paid_amount: prepay,
        payment: { amount: prepay, method: "CASH", note: "Tiền mặt tại Workshop" },
      }),
    },
    p_items: v.items.map((item) => ({
      type: item.type,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      unit_price: unitPrice(item.type, settings.prices), // BR09
      approval_status: item.type === "CUSTOM" ? "APPROVED" : undefined,
      design:
        item.type === "CUSTOM"
          ? {
              source: "SCAN",
              canvas_json: null,
              preview_url: item.scanPath,
              files: [{ area: item.area, file_path: item.scanPath, width_px: null, height_px: null }],
            }
          : null,
    })),
  });
  if (error || !data) {
    console.error("[workshop] create_order failed", error?.message);
    return { ok: false, error: "Không tạo được đơn Workshop. Vui lòng thử lại." };
  }

  const created = data as { id: string; code: string; access_token: string };
  return {
    ok: true,
    data: {
      id: created.id,
      code: created.code,
      accessToken: created.access_token,
      method: v.method,
      prepay,
      subtotal,
      expiresAt,
      email: v.email || null,
      customerName: v.customer_name,
      fullyPaid,
    },
  };
}
