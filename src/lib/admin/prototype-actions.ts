"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { OK, fail } from "@/lib/admin/form";
import { DESIGNS_BUCKET } from "@/lib/orders/design-upload";
import {
  CONTENT_BUCKET,
  MAX_PROTO_IMAGES,
  createUploadSlot,
  folderOf,
  imagePathOf,
  listFolder,
  publicImageUrl,
  removeFiles,
  verifyImage,
  verifyPrint,
} from "@/lib/prototypes/files";
import { resolutionWarning } from "@/lib/prototypes/resolution";
import { getSettings } from "@/lib/settings";
import { SLUG_RE } from "@/lib/slug";
import { requireRole } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";

// FR28: prototype ("Áo mẫu") management. Staff and Admin (hard rule 8), checked in every action.

const slotSchema = z.object({
  prototypeId: z.uuid(),
  kind: z.enum(["image", "print"]),
  area: z.string().max(50).optional(),
  contentType: z.string().max(100),
  size: z.number().int().positive(),
});

export type UploadSlot = { bucket: string; path: string; token: string };

/** Step 1 of an upload: a signed URL for exactly one file under `prototypes/<id>/`. */
export async function prepareProtoUpload(input: z.input<typeof slotSchema>): Promise<ActionResult<UploadSlot>> {
  await requireRole();
  const parsed = slotSchema.safeParse(input);
  if (!parsed.success) return fail("Dữ liệu file không hợp lệ");
  if (parsed.data.kind === "print") {
    const settings = await getSettings();
    if (!settings.print_areas.some((a) => a.key === parsed.data.area)) return fail("Vùng in không hợp lệ");
  }
  const slot = await createUploadSlot(parsed.data);
  return slot.ok ? { ok: true, data: { bucket: slot.bucket, path: slot.path, token: slot.token } } : slot;
}

const saveSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Vui lòng nhập tên mẫu").max(120, "Tên mẫu tối đa 120 ký tự"),
  slug: z.string().trim().max(80, "Đường dẫn tối đa 80 ký tự").regex(SLUG_RE, "Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang"),
  description: z
    .string()
    .trim()
    .max(2000, "Mô tả tối đa 2000 ký tự")
    .transform((v) => v || null),
  color: z.string().min(1, "Vui lòng chọn màu áo").max(50),
  sort_order: z.number().int().min(0).max(9999),
  stock_limit: z
    .number({ error: "Giới hạn số lượng phải là số" })
    .int("Giới hạn số lượng phải là số nguyên")
    .min(0, "Giới hạn số lượng không được âm")
    .max(100000, "Giới hạn số lượng quá lớn")
    .nullable(),
  is_active: z.boolean(),
  /** In display order: a URL already saved on this prototype, or the path of a fresh upload. */
  images: z
    .array(z.union([z.object({ url: z.string().max(1000) }), z.object({ path: z.string().max(300) })]))
    .min(1, "Cần ít nhất 1 ảnh hiển thị")
    .max(MAX_PROTO_IMAGES, `Tối đa ${MAX_PROTO_IMAGES} ảnh hiển thị`),
  /** Print file changes only: a fresh upload path for an area, or null to drop that area. */
  prints: z.record(z.string().max(50), z.string().max(300).nullable()),
});

export type SavePrototypeInput = z.input<typeof saveSchema>;

function refresh() {
  revalidatePath("/admin/mau-ao");
  revalidatePath("/gio-hang");
  revalidatePath("/");
}

/**
 * Step 2: saves the prototype with the files uploaded in step 1. Returns resolution warnings
 * for the print files (FR28), which never block saving.
 */
export async function savePrototype(input: SavePrototypeInput): Promise<ActionResult<{ warnings: string[] }>> {
  await requireRole();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const v = parsed.data;
  const settings = await getSettings();
  if (!settings.colors.some((c) => c.key === v.color)) return fail("Màu áo không có trong Cài đặt");

  const db = createServiceClient();
  const { data: current } = await db.from("prototypes").select("slug, image_urls, design_id").eq("id", v.id).maybeSingle();
  const folder = folderOf(v.id);
  const newPaths = v.images.flatMap((i) => ("path" in i ? [i.path] : []));
  const newPrints = Object.values(v.prints).filter((p): p is string => !!p);
  // Fresh uploads that this save doesn't keep are removed on failure.
  const discard = async () => {
    await removeFiles(CONTENT_BUCKET, newPaths);
    await removeFiles(DESIGNS_BUCKET, newPrints);
  };

  // Display images: kept URLs must already belong to this prototype; new ones are checked by their bytes.
  for (const image of v.images) {
    if ("url" in image ? !current?.image_urls.includes(image.url) : !image.path.startsWith(folder)) {
      return fail("Ảnh hiển thị không hợp lệ. Vui lòng tải lại trang.");
    }
  }
  for (const [area, path] of Object.entries(v.prints)) {
    if (!settings.print_areas.some((a) => a.key === area)) return fail("Vùng in không hợp lệ");
    if (path !== null && !path.startsWith(`${folder}${area}-`)) return fail("File in không hợp lệ");
  }

  // Byte checks of every new upload, plus the current print files, all at once.
  const [imageProblems, printChecks, { data: currentFiles }] = await Promise.all([
    Promise.all(v.images.map((image) => ("path" in image ? verifyImage(image.path) : null))),
    Promise.all(Object.entries(v.prints).map(async ([area, path]) => [area, path, path ? await verifyPrint(path) : null] as const)),
    current
      ? db.from("design_files").select("area, file_path, width_px, height_px").eq("design_id", current.design_id)
      : Promise.resolve({ data: [] as { area: string; file_path: string; width_px: number | null; height_px: number | null }[] }),
  ]);
  const problem = imageProblems.find(Boolean) ?? printChecks.flatMap(([, , png]) => (png && !png.ok ? [png.error] : []))[0];
  if (problem) {
    await discard();
    return fail(problem);
  }
  const imageUrls = v.images.map((image) => ("url" in image ? image.url : publicImageUrl(image.path)));

  // Print files: start from the current design, apply the changes.
  const files = new Map((currentFiles ?? []).map((f) => [f.area, f]));
  for (const [area, path, png] of printChecks) {
    if (path === null || !png?.ok) files.delete(area);
    else files.set(area, { area, file_path: path, width_px: png.width, height_px: png.height });
  }
  if (!files.size) {
    await discard();
    return fail("Cần file in cho ít nhất 1 vùng in");
  }
  const printsChanged = !current || Object.keys(v.prints).length > 0;

  const { error } = await db.rpc("save_prototype", {
    p_id: v.id,
    p_fields: {
      slug: v.slug,
      name: v.name,
      description: v.description,
      color: v.color,
      image_urls: imageUrls,
      sort_order: v.sort_order,
      is_active: v.is_active,
    },
    // Keep the area order of the settings so downloads are listed consistently.
    p_files: printsChanged
      ? settings.print_areas.flatMap((a) => (files.has(a.key) ? [files.get(a.key)!] : []))
      : null,
  });
  if (error) {
    await discard();
    if (error.code === "23505") return fail(`Đường dẫn "${v.slug}" đã được dùng cho mẫu khác`);
    console.error("[prototypes] save failed", error.message);
    return fail("Không lưu được mẫu áo. Vui lòng thử lại");
  }

  // Inventory: the cap isn't a save_prototype field, so it is set right after.
  const { error: limitError } = await db.from("prototypes").update({ stock_limit: v.stock_limit }).eq("id", v.id);
  if (limitError) {
    console.error("[prototypes] stock limit save failed", limitError.message);
    return fail("Đã lưu mẫu áo nhưng chưa lưu được giới hạn số lượng. Vui lòng lưu lại");
  }

  // Display images the admin removed. Old print files stay: earlier orders still print from them.
  const dropped = ((current?.image_urls ?? []) as string[]).filter((u) => !imageUrls.includes(u)).flatMap((u) => imagePathOf(u) ?? []);
  await removeFiles(CONTENT_BUCKET, dropped);

  const warnings = [...files.values()].flatMap(
    (f) => resolutionWarning({ area: f.area, widthPx: f.width_px, heightPx: f.height_px }, settings) ?? [],
  );
  refresh();
  return { ok: true, data: { warnings } };
}

/** Quick on/off from the list (FR28). */
export async function setPrototypeActive(id: string, isActive: boolean): Promise<ActionResult> {
  await requireRole();
  const { data, error } = await createServiceClient()
    .from("prototypes")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error || !data) return fail("Không cập nhật được mẫu áo. Vui lòng thử lại");
  refresh();
  return OK;
}

/** Deletes a prototype that no order uses (FR28); otherwise the admin must deactivate it. */
export async function deletePrototype(id: string): Promise<ActionResult> {
  await requireRole();
  const db = createServiceClient();
  const { count, error: countError } = await db
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("prototype_id", id);
  if (countError) return fail("Không kiểm tra được đơn hàng. Vui lòng thử lại");
  if (count) return fail("Mẫu này đã có trong đơn hàng nên không xóa được. Hãy tắt bán thay vì xóa.");

  const { data: designRows } = await db.from("design_files").select("design_id").like("file_path", `${folderOf(id)}%`);
  const { error } = await db.from("prototypes").delete().eq("id", id);
  if (error) {
    // 23503: an order was placed in the meantime (order_items.prototype_id is ON DELETE RESTRICT).
    return fail(error.code === "23503" ? "Mẫu này vừa có đơn hàng nên không xóa được. Hãy tắt bán." : "Không xóa được mẫu áo. Vui lòng thử lại");
  }

  // No order refers to this prototype, so none of its designs are in use either.
  const designIds = [...new Set((designRows ?? []).map((r) => r.design_id))];
  if (designIds.length) {
    const { error: designError } = await db.from("designs").delete().in("id", designIds);
    if (designError) console.error("[prototypes] delete designs", designError.message);
  }
  await removeFiles(CONTENT_BUCKET, await listFolder(CONTENT_BUCKET, id));
  await removeFiles(DESIGNS_BUCKET, await listFolder(DESIGNS_BUCKET, id));

  refresh();
  return OK;
}
