import "server-only";
import { z } from "zod";
import { checkImage, pickFile, removeContentImage, uploadContentImage, type ContentFolder } from "@/lib/storage";
import type { ActionResult } from "@/types/action";

// Shared parsing helpers for admin FormData server actions.

/** Trimmed text; empty becomes null. */
export const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} tối đa ${max} ký tự`)
    .transform((v) => v || null);

export const requiredText = (max: number, label: string) =>
  z.string().trim().min(1, `Vui lòng nhập ${label.toLowerCase()}`).max(max, `${label} tối đa ${max} ký tự`);

export const sortOrder = z.coerce
  .number({ error: "Thứ tự phải là số" })
  .int("Thứ tự phải là số nguyên")
  .min(0, "Thứ tự không được âm")
  .max(9999, "Thứ tự tối đa 9999");

/** Optional http(s) link; empty becomes null. */
export const optionalUrl = z
  .string()
  .trim()
  .transform((v) => v || null)
  .refine((v) => v === null || /^https?:\/\/\S+\.\S+/i.test(v), "Liên kết phải bắt đầu bằng http:// hoặc https://");

/** Plain object of the named string fields; missing fields become "". Checkboxes become booleans. */
export function readForm<T extends string, B extends string = never>(
  formData: FormData,
  fields: readonly T[],
  checkboxes: readonly B[] = [],
): Record<T, string> & Record<B, boolean> {
  const out: Record<string, string | boolean> = {};
  for (const f of fields) {
    const v = formData.get(f);
    out[f] = typeof v === "string" ? v : "";
  }
  for (const c of checkboxes) out[c] = formData.get(c) === "on";
  return out as Record<T, string> & Record<B, boolean>;
}

export function fail(error: z.ZodError | string): { ok: false; error: string } {
  return { ok: false, error: typeof error === "string" ? error : error.issues[0].message };
}

export const OK: ActionResult = { ok: true, data: undefined };

type ImageResult = { ok: true; url: string | null; uploaded: boolean } | { ok: false; error: string };

/**
 * Handles the `image` file field and the `removeImage` checkbox of an admin form.
 * Keeps `current` when neither is set. The caller removes the old image after saving.
 */
export async function resolveImage(
  formData: FormData,
  folder: ContentFolder,
  current: string | null,
): Promise<ImageResult> {
  const file = pickFile(formData, "image");
  if (file) {
    const problem = checkImage(file);
    if (problem) return { ok: false, error: problem };
    try {
      return { ok: true, url: await uploadContentImage(file, folder), uploaded: true };
    } catch (err) {
      console.error("[admin] image upload failed", err);
      return { ok: false, error: "Không tải được ảnh lên. Vui lòng thử lại" };
    }
  }
  if (formData.get("removeImage") === "on") return { ok: true, url: null, uploaded: false };
  return { ok: true, url: current, uploaded: false };
}

/** After a save: drop the replaced image, or the fresh upload when the save failed. */
export async function cleanupImage(previous: string | null, image: ImageResult, saved: boolean) {
  if (!image.ok) return;
  if (!saved) {
    if (image.uploaded) await removeContentImage(image.url);
    return;
  }
  if (previous && previous !== image.url) await removeContentImage(previous);
}
