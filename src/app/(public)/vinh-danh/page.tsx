import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDonorWall, groupSponsorsByTier, listSponsors } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { DonationList, DonationProgress, Section, SponsorTiers } from "@/components/public/sections";

export const metadata: Metadata = { title: "Bảng vinh danh" };
export const dynamic = "force-dynamic";

/** FR09 donor wall + FR10 sponsors. */
export default async function DonorWallPage() {
  const [settings, wall, sponsors] = await Promise.all([
    getSettings(),
    getDonorWall(),
    listSponsors({ activeOnly: true }),
  ]);

  return (
    <>
      <Section title="Bảng vinh danh nhà hảo tâm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground">
            Cảm ơn những tấm lòng đã cùng TỰA mang yêu thương đến các bé.
          </p>
          <Button asChild>
            <Link href="/quyen-gop">Quyên góp</Link>
          </Button>
        </div>
        <DonationProgress total={wall.total} goal={settings.donation_goal} />

        {wall.donations.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            Chưa có khoản quyên góp nào được xác nhận.
          </p>
        ) : (
          <DonationList donations={wall.donations} />
        )}
      </Section>

      {sponsors.length > 0 && (
        <Section id="nha-tai-tro" title="Nhà tài trợ" muted>
          <SponsorTiers groups={groupSponsorsByTier(sponsors)} />
        </Section>
      )}
    </>
  );
}
