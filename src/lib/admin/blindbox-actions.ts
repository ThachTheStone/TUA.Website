"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { OK, cleanupImage, fail, readForm, requiredText, resolveImage } from "@/lib/admin/form";
import { blindboxSold } from "@/lib/blindbox";
import { getSettings, updateSetting } from "@/lib/settings";
import { requireRole } from "@/lib/supabase/auth";
import type { ActionResult } from "@/types/action";

// FR32: the blindbox product. Staff and Admin (like Áo mẫu); the price is in Cài đặt (Admin).

const blindboxSchema = z.object({
  name: requiredText(100, "Tên sản phẩm"),
  description: z.string().trim().max(2000, "Mô tả tối đa 2000 ký tự"),
  stock: z.coerce
    .number({ error: "Tổng số hộp phải là số" })
    .int("Tổng số hộp phải là số nguyên")
    .min(0, "Tổng số hộp không được âm")
    .max(100000, "Tổng số hộp quá lớn"),
  is_active: z.boolean(),
});

export async function saveBlindbox(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireRole(["ADMIN", "STAFF"]);
  const parsed = blindboxSchema.safeParse(readForm(formData, ["name", "description", "stock"], ["is_active"]));
  if (!parsed.success) return fail(parsed.error);

  const current = (await getSettings()).blindbox;
  const image = await resolveImage(formData, "blindbox", current.image_url);
  if (!image.ok) return image;

  let saved = true;
  try {
    await updateSetting("blindbox", { ...parsed.data, image_url: image.url });
  } catch (err) {
    console.error("[blindbox] save failed", err);
    saved = false;
  }
  await cleanupImage(current.image_url, image, saved);
  if (!saved) return fail("Không lưu được blindbox. Vui lòng thử lại");

  revalidatePath("/admin/blindbox");
  revalidatePath("/blindbox");
  revalidatePath("/");
  return OK;
}

const remainingSchema = z.object({
  remaining: z.coerce
    .number({ error: "Số hộp còn lại phải là số" })
    .int("Số hộp còn lại phải là số nguyên")
    .min(0, "Số hộp còn lại không được âm")
    .max(100000, "Số hộp còn lại quá lớn"),
});

/** Kho hàng: staff enter the boxes physically left; total = boxes in live orders + that number. */
export async function saveBlindboxRemaining(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireRole(["ADMIN", "STAFF"]);
  const parsed = remainingSchema.safeParse(readForm(formData, ["remaining"]));
  if (!parsed.success) return fail(parsed.error);

  try {
    const [current, sold] = await Promise.all([getSettings().then((s) => s.blindbox), blindboxSold()]);
    await updateSetting("blindbox", { ...current, stock: sold + parsed.data.remaining });
  } catch (err) {
    console.error("[blindbox] save remaining failed", err);
    return fail("Không lưu được số hộp còn lại. Vui lòng thử lại");
  }

  revalidatePath("/admin/kho");
  revalidatePath("/admin/blindbox");
  revalidatePath("/blindbox");
  revalidatePath("/cua-hang");
  return OK;
}
