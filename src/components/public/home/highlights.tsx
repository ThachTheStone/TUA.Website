import { ComboList } from "@/components/public/combo-list";
import { ArtworkGrid, ContentBlockView, PromotionList, Section } from "@/components/public/sections";
import { comboSaving } from "@/lib/orders/discounts";
import type { Prices } from "@/lib/orders/pricing";
import type { Artwork, Combo, ContentBlock, Promotion } from "@/types/db";

/** FR01 §5: Top 5 artworks, Campus Workshop, live promotions and combos. Each part hides when empty. */
export function Highlights({ artworks, event, promotions, combos, prices }: {
  artworks: Artwork[];
  event?: ContentBlock;
  promotions: Promotion[];
  combos: Combo[];
  prices: Prices;
}) {
  const shownCombos = combos.filter((c) => comboSaving(c, prices) > 0);
  return (
    <>
      {artworks.length > 0 && (
        <Section id="top-5" title="Top 5 tranh của các bé" muted>
          <ArtworkGrid artworks={artworks} />
        </Section>
      )}

      <ContentBlockView id="su-kien" block={event} fallbackTitle="Campus Workshop" />

      {promotions.length > 0 && (
        <Section id="khuyen-mai" title="Khuyến mãi" muted>
          <PromotionList promotions={promotions} />
        </Section>
      )}

      {shownCombos.length > 0 && (
        <Section id="combo" title="Combo ưu đãi">
          <ComboList combos={shownCombos} prices={prices} />
        </Section>
      )}
    </>
  );
}
