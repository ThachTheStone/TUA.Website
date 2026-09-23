import type { Metadata } from "next";
import { getDonorWall, groupSponsorsByTier, listSponsors } from "@/lib/content";
import { formatDate, formatVND } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { DonationProgress, Section, SponsorTiers } from "@/components/public/sections";

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
        <p className="text-muted-foreground">
          Cảm ơn những tấm lòng đã cùng TỰA mang yêu thương đến các bé.
        </p>
        <DonationProgress total={wall.total} goal={settings.donation_goal} />

        {wall.donations.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            Chưa có khoản quyên góp nào được xác nhận.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {wall.donations.map((d) => (
              <li key={d.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{d.display_name}</span>
                  <span className="shrink-0 font-medium text-primary">{formatVND(d.amount)}</span>
                </div>
                {d.message && <p className="whitespace-pre-line text-sm text-muted-foreground">“{d.message}”</p>}
                <span className="mt-auto text-xs text-muted-foreground">{formatDate(d.created_at, { time: false })}</span>
              </li>
            ))}
          </ul>
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
