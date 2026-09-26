import { NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/cron";
import { UPLOADS_BUCKET } from "@/lib/design/assets.server";
import { createServiceClient } from "@/lib/supabase/server";

// NFR06: buyer photos are kept only to print their orders. Once a day, delete photos older
// than 30 days that no live order uses (never ordered, or only in Hết hạn / Đã hủy orders).
// Rows are deleted only after their files are gone, so a failed run is retried next time.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RETENTION_DAYS = 30;
const BATCH = 500;
/** storage.remove() takes up to 1000 paths; smaller chunks keep each request short. */
const CHUNK = 100;
const MAX_ROUNDS = 5;

async function run(request: Request) {
  const denied = rejectUnlessCron(request);
  if (denied) return denied;

  const db = createServiceClient();
  const before = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  let deleted = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data, error } = await db.rpc("stale_design_assets", { p_before: before, p_limit: BATCH });
    if (error) {
      console.error("[cron] cleanup-uploads query failed", error.message);
      return NextResponse.json({ error: error.message, deleted }, { status: 500 });
    }
    const rows = (data ?? []) as { id: string; file_path: string }[];

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error: removeError } = await db.storage.from(UPLOADS_BUCKET).remove(chunk.map((r) => r.file_path));
      if (removeError) {
        console.error("[cron] cleanup-uploads storage remove failed", removeError.message);
        return NextResponse.json({ error: removeError.message, deleted }, { status: 500 });
      }
      const { error: deleteError } = await db.from("design_assets").delete().in("id", chunk.map((r) => r.id));
      if (deleteError) {
        console.error("[cron] cleanup-uploads row delete failed", deleteError.message);
        return NextResponse.json({ error: deleteError.message, deleted }, { status: 500 });
      }
      deleted += chunk.length;
    }
    if (rows.length < BATCH) break;
  }

  if (deleted) console.info(`[cron] cleanup-uploads deleted ${deleted} photos`);
  return NextResponse.json({ deleted });
}

export const GET = run;
export const POST = run;
