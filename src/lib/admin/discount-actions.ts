"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { OK, fail, optionalText, readForm, requiredText, sortOrder } from "@/lib/admin/form";
import { normalizeCode } from "@/lib/discounts/queries";
import { vnLocalToISO } from "@/lib/format";
import { requireRole } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";

// FR31: promo codes and combos (Admin only, like prices in Cài đặt).

const PATH = "/admin/giam-gia";

function refresh() {
  revalidatePath(PATH, "layout");
  revalidatePath("/");
  revalidatePath("/blindbox");
}

const money = (label: string) =>
  z.coerce.number({ error: `${label} phải là số` }).int(`${label} phải là số nguyên`).min(0, `${label} không được âm`).max(100_000_000, `${label} quá lớn`);

/** Empty input → null (no limit). */
const optionalPositive = (label: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0), `${label} phải là số nguyên dương hoặc để trống`);

const period = {
  starts_at: z.string().transform(vnLocalToISO),
  ends_at: z.string().transform(vnLocalToISO),
};
const periodOk = (p: { starts_at: string | null; ends_at: string | null }) => !p.starts_at || !p.ends_at || p.starts_at <= p.ends_at;
const PERIOD_ERROR = { message: "Thời gian kết thúc phải sau thời gian bắt đầu" };

// ─── Promo codes ────────────────────────────────────────────────────────────

const promoSchema = z
  .object({
    code: z
      .string()
      .transform(normalizeCode)
      .refine((v) => /^[A-Z0-9_-]{3,30}$/.test(v), "Mã gồm 3–30 ký tự: chữ không dấu, số, gạch ngang hoặc gạch dưới"),
    description: optionalText(500, "Mô tả"),
    kind: z.enum(["PERCENT", "AMOUNT"], { error: "Vui lòng chọn kiểu giảm" }),
    value: money("Mức giảm").min(1, "Mức giảm phải lớn hơn 0"),
    max_discount: optionalPositive("Giảm tối đa"),
    min_subtotal: money("Đơn tối thiểu"),
    max_uses: optionalPositive("Số lượt dùng"),
    ...period,
    is_active: z.boolean(),
  })
  .refine((p) => p.kind !== "PERCENT" || p.value <= 100, { message: "Giảm theo % tối đa 100%" })
  .refine(periodOk, PERIOD_ERROR)
  .transform((p) => ({ ...p, max_discount: p.kind === "PERCENT" ? p.max_discount : null }));

function readPromo(formData: FormData) {
  return promoSchema.safeParse(
    readForm(
      formData,
      ["code", "description", "kind", "value", "max_discount", "min_subtotal", "max_uses", "starts_at", "ends_at"],
      ["is_active"],
    ),
  );
}

const DUPLICATE = "23505";

export async function createPromoCode(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = readPromo(formData);
  if (!parsed.success) return fail(parsed.error);
  const { error } = await createServiceClient().from("promo_codes").insert(parsed.data);
  if (error) return fail(error.code === DUPLICATE ? `Mã ${parsed.data.code} đã tồn tại` : "Không thêm được mã giảm giá. Vui lòng thử lại");
  refresh();
  return OK;
}

export async function updatePromoCode(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = readPromo(formData);
  if (!parsed.success) return fail(parsed.error);
  const { error, count } = await createServiceClient().from("promo_codes").update(parsed.data, { count: "exact" }).eq("id", id);
  if (error) return fail(error.code === DUPLICATE ? `Mã ${parsed.data.code} đã tồn tại` : "Không lưu được mã giảm giá. Vui lòng thử lại");
  if (!count) return fail("Mã giảm giá không tồn tại");
  refresh();
  return OK;
}

export async function deletePromoCode(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const { error } = await createServiceClient().from("promo_codes").delete().eq("id", id);
  if (error) {
    // orders.promo_code_id is "on delete restrict".
    return fail(error.code === "23503" ? "Mã đã được dùng trong đơn hàng nên không xóa được. Hãy tắt mã thay vì xóa" : "Không xóa được mã. Vui lòng thử lại");
  }
  refresh();
  return OK;
}

// ─── Combos ─────────────────────────────────────────────────────────────────

const comboItemsSchema = z
  .array(
    z.object({
      type: z.enum(["CUSTOM", "PROTOTYPE", "PLAIN", "BLINDBOX"]),
      quantity: z.number().int().min(1, "Số lượng tối thiểu là 1").max(20, "Số lượng tối đa 20"),
    }),
  )
  .min(1, "Combo cần ít nhất 1 sản phẩm")
  .max(6, "Combo tối đa 6 dòng")
  .refine((items) => new Set(items.map((i) => i.type)).size === items.length, "Mỗi loại sản phẩm chỉ chọn một lần trong combo");

const comboSchema = z
  .object({
    name: requiredText(100, "Tên combo"),
    description: optionalText(1000, "Mô tả"),
    price: money("Giá combo").min(1000, "Giá combo tối thiểu 1.000đ"),
    items: z.string().transform((v, ctx) => {
      try {
        return JSON.parse(v) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Danh sách sản phẩm không hợp lệ" });
        return z.NEVER;
      }
    }).pipe(comboItemsSchema),
    ...period,
    sort_order: sortOrder,
    is_active: z.boolean(),
  })
  .refine(periodOk, PERIOD_ERROR);

function readCombo(formData: FormData) {
  return comboSchema.safeParse(
    readForm(formData, ["name", "description", "price", "items", "starts_at", "ends_at", "sort_order"], ["is_active"]),
  );
}

export async function createCombo(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = readCombo(formData);
  if (!parsed.success) return fail(parsed.error);
  const { error } = await createServiceClient().from("combos").insert(parsed.data);
  if (error) return fail("Không thêm được combo. Vui lòng thử lại");
  refresh();
  return OK;
}

export async function updateCombo(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = readCombo(formData);
  if (!parsed.success) return fail(parsed.error);
  const { error, count } = await createServiceClient().from("combos").update(parsed.data, { count: "exact" }).eq("id", id);
  if (error) return fail("Không lưu được combo. Vui lòng thử lại");
  if (!count) return fail("Combo không tồn tại");
  refresh();
  return OK;
}

/** Orders keep their discount note, so deleting a combo never changes a past order. */
export async function deleteCombo(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const { error } = await createServiceClient().from("combos").delete().eq("id", id);
  if (error) return fail("Không xóa được combo. Vui lòng thử lại");
  refresh();
  return OK;
}
