import "server-only";
import { randomUUID } from "node:crypto";
import { readPngSize } from "@/lib/design/png";
import { DESIGNS_BUCKET } from "@/lib/orders/design-upload";
import { readHead } from "@/lib/storage-head";
import { createServiceClient } from "@/lib/supabase/server";

// FR28 files. Display images (≤ 5MB) go to the public `content` bucket and print PNGs
// (≤ 20MB) to the private `designs` bucket, both under `prototypes/<prototypeId>/`.
// They are too big for a server action body, so after requireRole the server hands out a
// signed upload URL for one exact path; the browser uploads straight to storage, and the
// server then checks the real bytes before the path is saved (BR01: admin uploads only).

export const CONTENT_BUCKET = "content";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PRINT_BYTES = 20 * 1024 * 1024;
export const MAX_PROTO_IMAGES = 4;

const IMAGE_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export type ProtoFileKind = "image" | "print";

export const folderOf = (prototypeId: string) => `prototypes/${prototypeId}/`;
export const bucketOf = (kind: ProtoFileKind) => (kind === "image" ? CONTENT_BUCKET : DESIGNS_BUCKET);

/** Validates the declared file and returns a one-time upload slot, or a Vietnamese error. */
export async function createUploadSlot(input: {
  prototypeId: string;
  kind: ProtoFileKind;
  area?: string;
  contentType: string;
  size: number;
}): Promise<{ ok: true; path: string; token: string; bucket: string } | { ok: false; error: string }> {
  const { prototypeId, kind, contentType, size } = input;
  let path: string;
  if (kind === "image") {
    const ext = IMAGE_EXT[contentType];
    if (!ext) return { ok: false, error: "Ảnh hiển thị phải là JPG, PNG hoặc WebP" };
    if (size > MAX_IMAGE_BYTES) return { ok: false, error: "Ảnh hiển thị tối đa 5MB" };
    path = `${folderOf(prototypeId)}${randomUUID()}.${ext}`;
  } else {
    if (contentType !== "image/png") return { ok: false, error: "File in phải là PNG" };
    if (size > MAX_PRINT_BYTES) return { ok: false, error: "File in tối đa 20MB" };
    path = `${folderOf(prototypeId)}${input.area}-${randomUUID()}.png`;
  }
  const bucket = bucketOf(kind);
  const { data, error } = await createServiceClient().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[prototypes] signed upload url", error?.message);
    return { ok: false, error: "Không chuẩn bị được việc tải file. Vui lòng thử lại." };
  }
  return { ok: true, path: data.path, token: data.token, bucket };
}

function imageType(b: Uint8Array): string | null {
  if (readPngSize(b)) return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

/** Checks an uploaded display image by its bytes. Returns a Vietnamese error or null. */
export async function verifyImage(path: string): Promise<string | null> {
  const head = await readHead(CONTENT_BUCKET, path);
  if (!head) return "Không tìm thấy ảnh vừa tải lên. Vui lòng thử lại.";
  if (!imageType(head)) return "Ảnh hiển thị phải là JPG, PNG hoặc WebP";
  return null;
}

/** Checks an uploaded print file is a real PNG and returns its pixel size. */
export async function verifyPrint(path: string): Promise<{ ok: true; width: number; height: number } | { ok: false; error: string }> {
  const head = await readHead(DESIGNS_BUCKET, path);
  if (!head) return { ok: false, error: "Không tìm thấy file in vừa tải lên. Vui lòng thử lại." };
  const size = readPngSize(head);
  if (!size || !size.width || !size.height) return { ok: false, error: "File in phải là ảnh PNG" };
  return { ok: true, width: size.width, height: size.height };
}

export function publicImageUrl(path: string): string {
  return createServiceClient().storage.from(CONTENT_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Storage path inside the content bucket for one of our public URLs, or null. */
export function imagePathOf(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${CONTENT_BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(publicUrl.slice(i + marker.length));
}

/** Best-effort removal (hard rule 7: never fails the main action). */
export async function removeFiles(bucket: string, paths: string[]) {
  if (!paths.length) return;
  try {
    const { error } = await createServiceClient().storage.from(bucket).remove(paths);
    if (error) console.error("[prototypes] remove files", bucket, error.message);
  } catch (err) {
    console.error("[prototypes] remove files", err);
  }
}

/** Every stored file of a prototype in one bucket (used when the prototype is deleted). */
export async function listFolder(bucket: string, prototypeId: string): Promise<string[]> {
  const { data, error } = await createServiceClient().storage.from(bucket).list(folderOf(prototypeId).slice(0, -1), { limit: 1000 });
  if (error) {
    console.error("[prototypes] list folder", error.message);
    return [];
  }
  return (data ?? []).map((f) => `${folderOf(prototypeId)}${f.name}`);
}
