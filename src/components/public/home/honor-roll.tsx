import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DonationList, DonationProgress, Section, SponsorTiers } from "@/components/public/sections";
import { groupSponsorsByTier } from "@/lib/content";
import type { PublicDonation, Sponsor } from "@/types/db";

/**
 * FR01 §6: donation total and progress, the latest confirmed donations and a link to the
 * full donor wall (FR09). Hidden when there is nothing to show.
 */
export function HonorRoll({ total, goal, donations }: {
  total: number;
  goal: number;
  donations: PublicDonation[];
}) {
  if (total <= 0 && goal <= 0 && donations.length === 0) return null;

  return (
    <Section id="vinh-danh" title="Vinh danh">
      <DonationProgress total={total} goal={goal} />
      {donations.length > 0 && <DonationList donations={donations} />}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="cta">
          <Link href="/quyen-gop">Quyên góp</Link>
        </Button>
        <Button asChild size="cta" variant="brand-outline">
          <Link href="/quyen-gop#vinh-danh">Xem tất cả nhà hảo tâm</Link>
        </Button>
      </div>
    </Section>
  );
}

/** FR10 (S01): sponsor logos by tier, the last block above the footer. Hidden when there are none. */
export function SponsorSection({ sponsors }: { sponsors: Sponsor[] }) {
  if (sponsors.length === 0) return null;
  return (
    <section id="nha-tai-tro" className="scroll-mt-(--header-h) border-t border-brand-sand bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl font-bold text-primary">Nhà tài trợ</h2>
          <p className="text-sm text-muted-foreground">Cảm ơn các đơn vị đã đồng hành cùng TỰA.</p>
        </div>
        <SponsorTiers groups={groupSponsorsByTier(sponsors)} />
      </div>
    </section>
  );
}
