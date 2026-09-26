import { NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/cron";
import { notifyOrder } from "@/lib/orders/notify";
import { transitionOrder } from "@/lib/orders/transition";
import { requestSheetSync } from "@/lib/sheets";
import { createServiceClient } from "@/lib/supabase/server";

// FR25 / BR07: every 15 minutes, unpaid orders past their deadline become Hết hạn.
// Each goes through transitionOrder() (history + state machine, hard rule 5), then the
// ORDER_EXPIRED email, then one Sheets resync.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Enough for any real backlog; the next run picks up the rest. */
const BATCH = 200;

async function run(request: Request) {
  const denied = rejectUnlessCron(request);
  if (denied) return denied;

  const { data, error } = await createServiceClient()
    .from("orders")
    .select("id, code")
    .eq("status", "PENDING_PAYMENT")
    .lt("expires_at", new Date().toISOString())
    .order("expires_at")
    .limit(BATCH);
  if (error) {
    console.error("[cron] expire-orders query failed", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const expired: string[] = [];
  const skipped: { code: string; error: string }[] = [];
  for (const order of data ?? []) {
    // A buyer pressing "Tôi đã chuyển khoản" at the same moment wins; that order is skipped.
    const result = await transitionOrder(order.id, "EXPIRED", { note: "Tự động hết hạn do quá hạn thanh toán" });
    if (!result.ok) {
      skipped.push({ code: order.code, error: result.error });
      continue;
    }
    expired.push(order.code);
    await notifyOrder(order.id, { kind: "EXPIRED" });
  }
  if (skipped.length) console.warn("[cron] expire-orders skipped", skipped);

  // Also heals the sheet if an earlier sync failed (FR23): at most 15 minutes stale.
  await requestSheetSync();
  return NextResponse.json({ expired, skipped: skipped.length });
}

export const GET = run;
export const POST = run;
