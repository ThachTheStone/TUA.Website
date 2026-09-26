import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// /api/cron/* are called by Supabase pg_cron + pg_net (supabase/cron.example.sql) with
// "Authorization: Bearer <CRON_SECRET>". The middleware skips these paths.

const digest = (s: string) => createHash("sha256").update(s).digest();

/** A 401/500 response when the request doesn't carry the cron secret, otherwise null. */
export function rejectUnlessCron(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET is not set; refusing to run");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const header = request.headers.get("authorization") ?? "";
  // Hashing first gives equal-length buffers, so the comparison is constant-time.
  if (!timingSafeEqual(digest(header), digest(`Bearer ${secret}`))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
