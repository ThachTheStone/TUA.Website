import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  HOME_ARTWORK_LIMIT,
  getContentBlocks,
  getDonorWall,
  listArtworks,
  listPromotions,
  listSponsors,
} from "@/lib/content";
import { formatVND } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import {
  ArtworkGrid,
  ContentBlockView,
  DonationProgress,
  PromotionList,
  Section,
  SponsorStrip,
} from "@/components/public/sections";

// FR01: everything on this page comes from the database, so render per request.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, blocks, artworks, promotions, sponsors, wall] = await Promise.all([
    getSettings(),
    getContentBlocks(),
    listArtworks(HOME_ARTWORK_LIMIT),
    listPromotions({ visibleOnly: true }),
    listSponsors({ activeOnly: true }),
    getDonorWall(),
  ]);

  return (
    <>
      <section className="border-b bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">TỰA – Nét Vẽ Yêu Thương</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Tự tay vẽ chiếc áo của riêng bạn, và cùng chúng mình hỗ trợ trẻ em có hoàn cảnh đặc biệt.
          </p>
          <p className="text-sm">
            Áo trơn <strong>{formatVND(settings.prices.PLAIN)}</strong> · Áo custom{" "}
            <strong>{formatVND(settings.prices.CUSTOM)}</strong>
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <a href="#cau-chuyen">Câu chuyện của TỰA</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/vinh-danh">Bảng vinh danh</Link>
            </Button>
          </div>
        </div>
      </section>

      <ContentBlockView id="cau-chuyen" block={blocks.story} fallbackTitle="Câu chuyện TỰA" />

      {artworks.length > 0 && (
        <Section id="top-5" title="Top 5 tranh của các bé" muted>
          <ArtworkGrid artworks={artworks} />
        </Section>
      )}

      <ContentBlockView id="su-kien" block={blocks.event} fallbackTitle="Campus Workshop" />

      {promotions.length > 0 && (
        <Section id="khuyen-mai" title="Khuyến mãi" muted>
          <PromotionList promotions={promotions} />
        </Section>
      )}

      <Section title="Cùng góp yêu thương">
        <DonationProgress total={wall.total} goal={settings.donation_goal} />
        <Link href="/vinh-danh" className="self-start text-sm font-medium underline underline-offset-4">
          Xem Bảng vinh danh nhà hảo tâm
        </Link>
      </Section>

      {sponsors.length > 0 && (
        <Section title="Nhà tài trợ" muted>
          <SponsorStrip sponsors={sponsors} />
        </Section>
      )}
    </>
  );
}
