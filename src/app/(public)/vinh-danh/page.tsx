import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/public/page-header";
import { DonationList, DonationProgress, Section, SponsorTiers } from "@/components/public/sections";
import { Button } from "@/components/ui/button";
import { getDonorWall, groupSponsorsByTier, listSponsors } from "@/lib/content";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Bảng vinh danh" };
export const dynamic = "force-dynamic";

/** FR09 donor wall on its own page (the "Vinh danh" links), plus FR10 sponsors. */
export default async function DonorWallPage() {
  const [settings, wall, sponsors] = await Promise.all([getSettings(), getDonorWall(), listSponsors({ activeOnly: true })]);

  return (
    <>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
        <PageHeader title="Bảng vinh danh nhà hảo tâm" description="Cảm ơn những tấm lòng đã cùng TỰA mang yêu thương đến các bé.">
          <Button asChild size="cta">
            <Link href="/quyen-gop">Quyên góp</Link>
          </Button>
        </PageHeader>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <DonationProgress total={wall.total} goal={settings.donation_goal} />
        </div>
        {wall.donations.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            Chưa có khoản quyên góp nào được xác nhận.
          </p>
        ) : (
          <DonationList donations={wall.donations} />
        )}
      </div>

      {sponsors.length > 0 && (
        <Section id="nha-tai-tro" title="Nhà tài trợ" muted>
          <SponsorTiers groups={groupSponsorsByTier(sponsors)} />
        </Section>
      )}
    </>
  );
}
