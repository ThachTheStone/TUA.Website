import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { Artwork, ContentBlock, Promotion, PublicDonation, Sponsor } from "@/types/db";

// Reads for the public site (FR01, FR09, FR10) and the content admin (FR17, FR19).
// Public pages render dynamically, so admin edits show up without a redeploy.

/** Editable text blocks on the home page. Keys match the `content_blocks` seed rows. */
export const CONTENT_BLOCKS = [
  { key: "story", label: "Câu chuyện dự án" },
  { key: "event", label: "Campus Workshop / sự kiện" },
] as const;

export type ContentBlockKey = (typeof CONTENT_BLOCKS)[number]["key"];

/** Number of artworks shown on the home page ("Top 5 tranh của các bé"). */
export const HOME_ARTWORK_LIMIT = 5;

function orThrow<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Không đọc được ${what}: ${result.error.message}`);
  return result.data as T;
}

export async function getContentBlocks(): Promise<Partial<Record<ContentBlockKey, ContentBlock>>> {
  const rows = orThrow(
    await createServiceClient().from("content_blocks").select("*").returns<ContentBlock[]>(),
    "nội dung",
  );
  return Object.fromEntries(rows.map((row) => [row.key, row]));
}

export async function listArtworks(limit?: number): Promise<Artwork[]> {
  let query = createServiceClient()
    .from("artworks")
    .select("*")
    .order("sort_order")
    .order("id");
  if (limit) query = query.limit(limit);
  return orThrow(await query.returns<Artwork[]>(), "tranh");
}

/** All promotions for the admin, or only the ones visible right now for the public site. */
export async function listPromotions({ visibleOnly = false } = {}): Promise<Promotion[]> {
  let query = createServiceClient().from("promotions").select("*");
  if (visibleOnly) query = query.eq("is_active", true);
  const rows = orThrow(
    await query.order("starts_at", { ascending: false, nullsFirst: true }).returns<Promotion[]>(),
    "khuyến mãi",
  );
  return visibleOnly ? rows.filter((p) => isPromotionLive(p)) : rows;
}

/** Same rule as the "public read active promotions" RLS policy. */
export function isPromotionLive(p: Promotion, now = Date.now()): boolean {
  return (
    p.is_active &&
    (!p.starts_at || new Date(p.starts_at).getTime() <= now) &&
    (!p.ends_at || new Date(p.ends_at).getTime() >= now)
  );
}

/** Sponsors sorted by display order. Public pages pass `activeOnly`. */
export async function listSponsors({ activeOnly = false } = {}): Promise<Sponsor[]> {
  let query = createServiceClient().from("sponsors").select("*");
  if (activeOnly) query = query.eq("is_active", true);
  return orThrow(await query.order("sort_order").order("name").returns<Sponsor[]>(), "nhà tài trợ");
}

/** Groups sponsors by tier, keeping the order in which tiers first appear (FR10). */
export function groupSponsorsByTier(sponsors: Sponsor[]): { tier: string | null; sponsors: Sponsor[] }[] {
  const groups = new Map<string | null, Sponsor[]>();
  for (const s of sponsors) {
    const tier = s.tier?.trim() || null;
    groups.set(tier, [...(groups.get(tier) ?? []), s]);
  }
  return [...groups].map(([tier, list]) => ({ tier, sponsors: list }));
}

/** Donor wall (FR09): confirmed, not-hidden donations plus the confirmed total. */
export async function getDonorWall(): Promise<{ donations: PublicDonation[]; total: number }> {
  const supabase = createServiceClient();
  const [wall, confirmed] = await Promise.all([
    supabase
      .from("public_donations")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<PublicDonation[]>(),
    // Hidden donations are only hidden from the wall; their money still counts.
    supabase.from("donations").select("amount").eq("status", "CONFIRMED").returns<{ amount: number }[]>(),
  ]);
  const donations = orThrow(wall, "bảng vinh danh");
  const total = orThrow(confirmed, "tổng quyên góp").reduce((sum, d) => sum + d.amount, 0);
  return { donations, total };
}
