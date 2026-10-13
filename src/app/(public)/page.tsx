import {
  HOME_ARTWORK_LIMIT,
  HOME_DONATION_LIMIT,
  getContentBlocks,
  getDonorWall,
  listArtworks,
  listPromotions,
  listSponsors,
} from "@/lib/content";
import { getBlindboxStatus } from "@/lib/blindbox";
import { areShirtsSoldOut } from "@/lib/inventory";
import { getShirtStock } from "@/lib/inventory.server";
import { listCombos } from "@/lib/discounts/queries";
import { getSettings } from "@/lib/settings";
import { ContentBlockView } from "@/components/public/sections";
import { HomeHero } from "@/components/public/home/hero";
import { StorySection } from "@/components/public/home/story";
import { Highlights } from "@/components/public/home/highlights";
import { HonorRoll, SponsorSection } from "@/components/public/home/honor-roll";

// FR01: everything on this page comes from the database, so render per request.
export const dynamic = "force-dynamic";

/**
 * FR01 section order (S01): Hero → Về chúng tôi → Ý nghĩa dự án → Top 5 / Workshop / khuyến mãi
 * → Vinh danh → Nhà tài trợ (just above the footer). Áo mẫu are sold offline, so not shown here.
 */
export default async function HomePage() {
  const [settings, blocks, artworks, promotions, combos, wall, sponsors, stock, box] = await Promise.all([
    getSettings(),
    getContentBlocks(),
    listArtworks(HOME_ARTWORK_LIMIT),
    listPromotions({ visibleOnly: true }),
    listCombos({ liveOnly: true }),
    getDonorWall(HOME_DONATION_LIMIT),
    listSponsors({ activeOnly: true }),
    getShirtStock(),
    getBlindboxStatus(),
  ]);

  const isSoldOut =
    areShirtsSoldOut(stock, settings.colors, settings.sizes, settings.sizes_disabled) &&
    (!box.is_active || box.remaining <= 0);

  return (
    <>
      <HomeHero block={blocks.hero} goal={settings.donation_goal} isSoldOut={isSoldOut} />
      <ContentBlockView id="ve-chung-toi" block={blocks.about} fallbackTitle="Về chúng tôi" />
      <StorySection block={blocks.mission} />
      <Highlights
        artworks={artworks}
        event={blocks.event}
        promotions={promotions}
        combos={isSoldOut ? [] : combos}
        prices={settings.prices}
      />
      <HonorRoll total={wall.total} goal={settings.donation_goal} donations={wall.donations} />
      <SponsorSection sponsors={sponsors} />
    </>
  );
}
