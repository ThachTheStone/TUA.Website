import "server-only";
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";

// Public `content` bucket: story/event images, artworks, promotion images, sponsor logos.
// Uploads happen only from admin server actions after requireRole (BR01: never from customers).

const CONTENT_BUCKET = "content";
const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket's file_size_limit
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export type ContentFolder = "story" | "artworks" | "promotions" | "sponsors";

/** Reads an optional file field. Browsers send an empty File when nothing was picked. */
export function pickFile(formData: FormData, name: string): File | null {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

/** Returns a Vietnamese error message, or null when the file is acceptable. */
export function checkImage(file: File): string | null {
  if (!EXT_BY_TYPE[file.type]) return "Ảnh phải là PNG, JPG, WEBP hoặc SVG";
  if (file.size > MAX_BYTES) return "Ảnh tối đa 5MB";
  return null;
}

/** Uploads an image and returns its public URL. Call checkImage() first. */
export async function uploadContentImage(file: File, folder: ContentFolder): Promise<string> {
  const path = `${folder}/${randomUUID()}.${EXT_BY_TYPE[file.type]}`;
  const storage = createServiceClient().storage.from(CONTENT_BUCKET);
  const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Không tải được ảnh lên: ${error.message}`);
  return storage.getPublicUrl(path).data.publicUrl;
}

/** Best-effort removal of an image we uploaded earlier. Never throws (hard rule 7). */
export async function removeContentImage(publicUrl: string | null | undefined) {
  if (!publicUrl) return;
  const marker = `/storage/v1/object/public/${CONTENT_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return;
  try {
    const path = decodeURIComponent(publicUrl.slice(index + marker.length));
    const { error } = await createServiceClient().storage.from(CONTENT_BUCKET).remove([path]);
    if (error) console.error("[storage] remove failed", path, error.message);
  } catch (err) {
    console.error("[storage] remove failed", err);
  }
}
