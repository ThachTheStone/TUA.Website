"use client";

import { getAssetUrls } from "@/lib/design/asset-actions";
import { loadImage } from "@/lib/design/shapes";

// Browser side of buyer photos/stickers (BR01): prepare a file before upload, and turn asset
// ids from saved designs back into images (signed URLs, fetched in batches and cached).

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Signed URLs live 60 minutes on the server; refresh a bit earlier. */
const URL_TTL_MS = 50 * 60 * 1000;

const urls = new Map<string, { url: string; at: number }>();
const images = new Map<string, Promise<HTMLImageElement>>();
let pending: { ids: Set<string>; promise: Promise<Record<string, string>> } | null = null;

export function registerAsset(id: string, url: string) {
  urls.set(id, { url, at: Date.now() });
}

/** Collects ids asked for in the same tick into one server call. */
function fetchUrls(id: string): Promise<Record<string, string>> {
  if (!pending) {
    const ids = new Set<string>();
    const promise = Promise.resolve().then(async () => {
      pending = null;
      return getAssetUrls([...ids]);
    });
    pending = { ids, promise };
  }
  pending.ids.add(id);
  return pending.promise;
}

export async function assetUrl(id: string): Promise<string | null> {
  const cached = urls.get(id);
  if (cached && Date.now() - cached.at < URL_TTL_MS) return cached.url;
  const result = await fetchUrls(id);
  if (!result[id]) return null;
  registerAsset(id, result[id]);
  return result[id];
}

/** The decoded image for an asset. Rejects when the buyer can't access it (e.g. logged out). */
export function loadAssetImage(id: string): Promise<HTMLImageElement> {
  let promise = images.get(id);
  if (!promise) {
    promise = assetUrl(id).then((url) => {
      if (!url) throw new Error("Không tải được ảnh. Hãy đăng nhập lại.");
      return loadImage(url);
    });
    images.set(id, promise);
    promise.catch(() => images.delete(id));
  }
  return promise;
}

export function checkImageFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return "Chỉ nhận ảnh JPG, PNG hoặc WebP";
  if (file.size > MAX_UPLOAD_BYTES) return "Ảnh tối đa 10MB";
  return null;
}

/**
 * Shrinks the picture to at most `maxSide` pixels (what the largest print area needs) and
 * re-encodes it. Re-encoding also drops EXIF (GPS, camera data). Photos stay JPEG; PNG/WebP
 * become PNG to keep sticker transparency. Returns the file to upload and its pixel size.
 */
export async function prepareImage(file: File, maxSide: number): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  try {
    const jpeg = file.type === "image/jpeg";
    let scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 5; attempt++) {
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, jpeg ? "image/jpeg" : "image/png", jpeg ? 0.92 : undefined),
      );
      if (!blob) throw new Error("Không xử lý được ảnh");
      if (blob.size <= MAX_UPLOAD_BYTES) return { blob, width, height };
      scale *= 0.8;
    }
    throw new Error("Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn.");
  } finally {
    bitmap.close();
  }
}
