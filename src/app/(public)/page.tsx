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
import { listPrototypesOnSale } from "@/lib/prototypes/queries";
import { getSettings } from "@/lib/settings";
import { ContentBlockView } from "@/components/public/sections";
import { HomeHero } from "@/components/public/home/hero";
import { PrototypeShowcase } from "@/components/public/home/prototype-showcase";
import { Highlights } from "@/components/public/home/highlights";
import { HonorRoll } from "@/components/public/home/honor-roll";

// FR01: everything on this page comes from the database, so render per request.
export const dynamic = "force-dynamic";

/** FR01 section order: Hero → Áo mẫu → Về chúng tôi → Ý nghĩa dự án → Top 5 / Workshop / khuyến mãi → Vinh danh. */
export default async function HomePage() {
  const [settings, blocks, prototypes, artworks, promotions, combos, wall, sponsors] = await Promise.all([
    getSettings(),
    getContentBlocks(),
    listPrototypesOnSale(),
    listArtworks(HOME_ARTWORK_LIMIT),
    listPromotions({ visibleOnly: true }),
    listCombos({ liveOnly: true }),
    getDonorWall(HOME_DONATION_LIMIT),
    listSponsors({ activeOnly: true }),
  ]);

  return (
    <>
      <HomeHero block={blocks.hero} settings={settings} />
      <PrototypeShowcase prototypes={prototypes} price={settings.prices.CUSTOM} />
      <ContentBlockView id="ve-chung-toi" block={blocks.about} fallbackTitle="Về chúng tôi" muted />
      <ContentBlockView id="y-nghia" block={blocks.mission} fallbackTitle="Ý nghĩa dự án" />
      <Highlights
        artworks={artworks}
        event={blocks.event}
        promotions={promotions}
        combos={combos}
        prices={settings.prices}
      />
      <HonorRoll
        total={wall.total}
        goal={settings.donation_goal}
        donations={wall.donations}
        sponsors={sponsors}
      />
    </>
  );
}
