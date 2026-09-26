"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { OK, cleanupImage, fail, readForm, requiredText, resolveImage } from "@/lib/admin/form";
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
