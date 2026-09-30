import {
  HOME_ARTWORK_LIMIT,
  HOME_DONATION_LIMIT,
  getContentBlocks,
  getDonorWall,
  listArtworks,
  listPromotions,
  listSponsors,
} from "@/lib/content";
import { listCombos } from "@/lib/discounts/queries";
import { getSettings } from "@/lib/settings";
import { ContentBlockView } from "@/components/public/sections";
import { HomeHero } from "@/components/public/home/hero";
import { Highlights } from "@/components/public/home/highlights";
import { HonorRoll, SponsorSection } from "@/components/public/home/honor-roll";

// FR01: everything on this page comes from the database, so render per request.
export const dynamic = "force-dynamic";

/**
 * FR01 section order (S01): Hero → Về chúng tôi → Ý nghĩa dự án → Top 5 / Workshop / khuyến mãi
 * → Vinh danh → Nhà tài trợ (just above the footer). Áo mẫu are sold offline, so not shown here.
 */
export default async function HomePage() {
  const [settings, blocks, artworks, promotions, combos, wall, sponsors] = await Promise.all([
    getSettings(),
    getContentBlocks(),
    listArtworks(HOME_ARTWORK_LIMIT),
    listPromotions({ visibleOnly: true }),
    listCombos({ liveOnly: true }),
    getDonorWall(HOME_DONATION_LIMIT),
    listSponsors({ activeOnly: true }),
  ]);

  return (
    <>
      <HomeHero block={blocks.hero} goal={settings.donation_goal} />
      <ContentBlockView id="ve-chung-toi" block={blocks.about} fallbackTitle="Về chúng tôi" />
      <ContentBlockView id="y-nghia" block={blocks.mission} fallbackTitle="Ý nghĩa dự án" muted />
      <Highlights
        artworks={artworks}
        event={blocks.event}
        promotions={promotions}
        combos={combos}
        prices={settings.prices}
      />
      <HonorRoll total={wall.total} goal={settings.donation_goal} donations={wall.donations} />
      <SponsorSection sponsors={sponsors} />
    </>
  );
}
