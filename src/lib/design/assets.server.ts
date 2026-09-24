import "server-only";
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action";

// BR01: buyer photos/stickers for the canvas. Private bucket, one folder per buyer, served
// only through short-lived signed URLs. The browser has already downscaled and re-encoded
// the image (which drops EXIF); here we trust nothing and check the real bytes again.

export const UPLOADS_BUCKET = "uploads";
export const MAX_ASSET_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 8000;
/** Abuse guard: uploads per buyer per 24 hours. */
const DAILY_LIMIT = 100;
const SIGNED_URL_SECONDS = 60 * 60;

export type AssetInfo = { id: string; url: string; width: number; height: number };

type ImageMeta = { ext: "png" | "jpg"; width: number; height: number };

/** Type and pixel size from the file header, or null if it is not a PNG/JPEG. */
export function readImageMeta(b: Uint8Array): ImageMeta | null {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 24 && png.every((v, i) => b[i] === v)) {
    const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { ext: "png", width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    // Walk the JPEG segments to the first SOF marker, which holds the size.
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const length = (b[i + 2] << 8) | b[i + 3];
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { ext: "jpg", height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + length;
    }
  }
  return null;
}

export async function saveDesignAsset(customerId: string, file: File): Promise<ActionResult<AssetInfo>> {
  if (file.size > MAX_ASSET_BYTES) return { ok: false, error: "Ảnh tối đa 10MB" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const meta = readImageMeta(bytes);
  if (!meta) return { ok: false, error: "Chỉ nhận ảnh JPG, PNG hoặc WebP" };
  if (!meta.width || !meta.height || meta.width > MAX_SIDE || meta.height > MAX_SIDE) {
    return { ok: false, error: "Kích thước ảnh không hợp lệ" };
  }

  const db = createServiceClient();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db
    .from("design_assets")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) return { ok: false, error: "Bạn đã tải lên quá nhiều ảnh hôm nay. Vui lòng thử lại vào ngày mai." };

  const id = randomUUID();
  const path = `${customerId}/${id}.${meta.ext}`;
  const { error: upError } = await db.storage
    .from(UPLOADS_BUCKET)
    .upload(path, bytes, { contentType: meta.ext === "png" ? "image/png" : "image/jpeg", upsert: false });
  if (upError) {
    console.error("[assets] upload failed", upError.message);
    return { ok: false, error: "Không tải được ảnh lên. Vui lòng thử lại." };
  }
  const { error } = await db
    .from("design_assets")
    .insert({ id, customer_id: customerId, file_path: path, width_px: meta.width, height_px: meta.height, bytes: bytes.length });
  if (error) {
    console.error("[assets] insert failed", error.message);
    await db.storage.from(UPLOADS_BUCKET).remove([path]);
    return { ok: false, error: "Không lưu được ảnh. Vui lòng thử lại." };
  }

  const { data } = await db.storage.from(UPLOADS_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  return { ok: true, data: { id, url: data?.signedUrl ?? "", width: meta.width, height: meta.height } };
}

/**
 * Signed URLs for assets. With `customerId`, only that buyer's assets are returned (buyer pages);
 * with null, any asset (staff pages, after requireRole).
 */
export async function signedAssetUrls(ids: string[], customerId: string | null): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const db = createServiceClient();
  let query = db.from("design_assets").select("id, file_path").in("id", ids);
  if (customerId) query = query.eq("customer_id", customerId);
  const { data, error } = await query;
  if (error || !data?.length) return {};
  const { data: signed } = await db.storage.from(UPLOADS_BUCKET).createSignedUrls(
    data.map((a) => a.file_path),
    SIGNED_URL_SECONDS,
  );
  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return Object.fromEntries(data.flatMap((a) => (byPath.get(a.file_path) ? [[a.id, byPath.get(a.file_path)!]] : [])));
}

/** Ids from `ids` that do not belong to `customerId` (or do not exist). */
export async function foreignAssets(ids: string[], customerId: string): Promise<string[]> {
  if (!ids.length) return [];
  const { data } = await createServiceClient().from("design_assets").select("id").in("id", ids).eq("customer_id", customerId);
  const own = new Set((data ?? []).map((a) => a.id));
  return ids.filter((id) => !own.has(id));
}
