import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

// Files that browsers upload straight to storage through one-time signed upload URLs
// (admin prototype files, workshop scans) are checked by their real bytes afterwards.

/** First bytes of a stored object (enough for the file signature and PNG size), or null if missing. */
export async function readHead(bucket: string, path: string): Promise<Uint8Array | null> {
  const { data, error } = await createServiceClient().storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data) return null;
  const res = await fetch(data.signedUrl, { headers: { Range: "bytes=0-63" }, cache: "no-store" });
  if (!res.ok || !res.body) return null;
  // A server that ignores Range sends the whole file: read one chunk and stop.
  const reader = res.body.getReader();
  const { value } = await reader.read();
  await reader.cancel().catch(() => {});
  return value ?? null;
}
