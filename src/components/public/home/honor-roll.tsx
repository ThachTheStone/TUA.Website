import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DonationList, DonationProgress, Section, SponsorTiers } from "@/components/public/sections";
import { groupSponsorsByTier } from "@/lib/content";
import type { PublicDonation, Sponsor } from "@/types/db";

/**
 * FR01 §6: donation total and progress, the latest confirmed donations, a link to the
 * full donor wall (FR09) and sponsor logos by tier (FR10). Hidden when there is nothing to show.
 */
export function HonorRoll({ total, goal, donations, sponsors }: {
  total: number;
  goal: number;
  donations: PublicDonation[];
  sponsors: Sponsor[];
}) {
  const hasDonations = total > 0 || goal > 0 || donations.length > 0;
  if (!hasDonations && sponsors.length === 0) return null;

  return (
    <Section id="vinh-danh" title="Vinh danh" muted>
      {hasDonations && (
        <>
          <DonationProgress total={total} goal={goal} />
          {donations.length > 0 && <DonationList donations={donations} />}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/quyen-gop">Quyên góp</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/vinh-danh">Xem tất cả nhà hảo tâm</Link>
            </Button>
          </div>
        </>
      )}

      {sponsors.length > 0 && (
        <div className="flex flex-col gap-6 pt-6">
          <h3 className="text-center text-xl font-semibold">Nhà tài trợ</h3>
          <SponsorTiers groups={groupSponsorsByTier(sponsors)} />
        </div>
      )}
    </Section>
  );
}
