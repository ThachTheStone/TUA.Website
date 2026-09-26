import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { checkBlindboxQuantity } from "@/lib/blindbox";
import { checkStock, stockRpcError } from "@/lib/inventory.server";
import { discountRpcError, resolveDiscount } from "@/lib/discounts/queries";
import { phoneSchema } from "@/lib/orders/checkout-schema";
import { PREPAY_PERCENTS, prepayAmount, unitPrice } from "@/lib/orders/pricing";
import { orderablePrototypes } from "@/lib/prototypes/queries";
import { getSettings } from "@/lib/settings";
import { readHead } from "@/lib/storage-head";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";

// FR16: orders staff create at the Campus Workshop. Scans of paper drawings go to the
// private `scans` bucket (BR01: staff upload inside the admin portal). Scans are approved
// on creation because staff saw the drawing in person (FR16, FR29). Prototype lines use the
// prototype's colour and print files, like on the website.

export const SCANS_BUCKET = "scans";
const MAX_SCAN_BYTES = 10 * 1024 * 1024;
const SCAN_PATH_RE = /^workshop\/[0-9a-f-]{36}\.(png|jpg)$/;

function scanType(bytes: Uint8Array): "png" | "jpg" | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  return null;
}

/**
 * Step 1 of a scan upload: a one-time signed URL for one path in the private `scans` bucket.
 * Scans (up to 10MB) go straight from the browser to storage: sent through a server action
 * they were cut off by the middleware's 10MB body limit ("Unexpected end of form") and would
 * also exceed the hosting request limit.
 */
export async function createScanSlot(contentType: string, size: number): Promise<ActionResult<{ path: string; token: string }>> {
  const ext = contentType === "image/png" ? "png" : contentType === "image/jpeg" ? "jpg" : null;
  if (!ext) return { ok: false, error: "Ảnh scan phải là JPG hoặc PNG" };
  if (size > MAX_SCAN_BYTES) return { ok: false, error: "Ảnh scan tối đa 10MB" };

  const { data, error } = await createServiceClient()
    .storage.from(SCANS_BUCKET)
    .createSignedUploadUrl(`workshop/${randomUUID()}.${ext}`);
  if (error || !data) {
    console.error("[workshop] signed upload url", error?.message);
    return { ok: false, error: "Không chuẩn bị được việc tải ảnh scan. Vui lòng thử lại." };
  }
  return { ok: true, data: { path: data.path, token: data.token } };
}

/** Step 2 (on order creation): the uploaded scan exists and really is the image its name says. */
async function verifyScan(path: string): Promise<string | null> {
  const head = await readHead(SCANS_BUCKET, path);
  if (!head) return "Không tìm thấy ảnh scan vừa tải lên. Vui lòng tải lại.";
  if (scanType(head) !== path.split(".").pop()) return "Ảnh scan phải là JPG hoặc PNG";
  return null;
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
    /** FR31: optional promo code; combos apply by themselves. */
    promoCode: z.string().trim().max(30).optional(),
    items: z
      .array(
        z.object({
          type: z.enum(["PLAIN", "CUSTOM", "PROTOTYPE", "BLINDBOX"]),
          color: z.string().max(50),
          size: z.string().max(20),
          quantity: z.number().int().min(1, "Số lượng tối thiểu là 1").max(50, "Số lượng tối đa 50"),
          area: z.string().max(50).optional(),
          scanPath: z.string().regex(SCAN_PATH_RE).optional(),
          /** PROTOTYPE only: no scan needed, colour comes from the prototype (FR16). */
          prototypeId: z.uuid().optional(),
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
    if (v.items.some((i) => i.type === "PROTOTYPE" && !i.prototypeId)) {
      ctx.addIssue({ code: "custom", message: "Vui lòng chọn áo mẫu" });
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

  const protos = await orderablePrototypes(
    v.items.flatMap((i) => (i.type === "PROTOTYPE" && i.prototypeId ? [i.prototypeId] : [])),
    settings,
  );
  if (!protos.ok) return protos;

  const colors = new Set(settings.colors.map((c) => c.key));
  const areas = new Set(settings.print_areas.map((a) => a.key));
  for (const item of v.items) {
    if (item.type === "BLINDBOX") {
      item.color = "";
      item.size = "";
      continue;
    }
    if (item.type === "PROTOTYPE") item.color = protos.colors.get(item.prototypeId!)!;
    if (!colors.has(item.color) || !settings.sizes.includes(item.size)) return { ok: false, error: "Màu hoặc size không hợp lệ" };
    if (item.type === "CUSTOM" && !areas.has(item.area!)) return { ok: false, error: "Vùng in không hợp lệ" };
  }
  const scanPaths = v.items.flatMap((i) => (i.scanPath ? [i.scanPath] : []));
  if (new Set(scanPaths).size !== scanPaths.length) return { ok: false, error: "Mỗi ảnh scan chỉ dùng cho một áo" };

  for (const path of scanPaths) {
    const problem = await verifyScan(path);
    if (problem) return { ok: false, error: problem };
  }

  const boxProblem = await checkBlindboxQuantity(v.items.reduce((n, i) => n + (i.type === "BLINDBOX" ? i.quantity : 0), 0));
  if (boxProblem) return { ok: false, error: boxProblem };
  const stockProblem = await checkStock(v.items, settings, protos.rows);
  if (stockProblem) return { ok: false, error: stockProblem };

  const discount = await resolveDiscount(v.items, settings, v.promoCode);
  if (!discount.ok) return discount;

  const db = createServiceClient();
  if (scanPaths.length) {
    const { count } = await db.from("design_files").select("id", { count: "exact", head: true }).in("file_path", scanPaths);
    if (count) return { ok: false, error: "Ảnh scan đã được dùng cho đơn khác. Vui lòng tải lại." };
  }

  const { itemsTotal, discount: discountAmount, total: subtotal, note: discountNote, promo } = discount.data;
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
      items_total: itemsTotal,
      discount_amount: discountAmount,
      discount_note: discountNote,
      promo_code_id: promo?.id ?? null,
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
      prototype_id: item.type === "PROTOTYPE" ? item.prototypeId : null,
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
    const known = discountRpcError(error?.message) ?? (await stockRpcError(error?.message, settings));
    if (known) return { ok: false, error: known };
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
