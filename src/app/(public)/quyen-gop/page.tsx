import type { Metadata } from "next";
import { DonationForm } from "@/components/public/donation-form";
import { PageHeader } from "@/components/public/page-header";
import { DonationList, DonationProgress, Section, SponsorTiers } from "@/components/public/sections";
import { getDonorWall, groupSponsorsByTier, listSponsors } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { isBankConfigured } from "@/lib/vietqr";

export const metadata: Metadata = { title: "Quyên góp" };
export const dynamic = "force-dynamic";

/**
 * FR08 donation form (money goes to the fund account, BR04), then the FR09 donor wall
 * ("Vinh danh", #vinh-danh) and the FR10 sponsors below it.
 */
export default async function DonatePage() {
  const [settings, wall, sponsors] = await Promise.all([getSettings(), getDonorWall(), listSponsors({ activeOnly: true })]);
  const open = isBankConfigured(settings.bank_fund);

  return (
    <>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          <PageHeader
            title="Quyên góp"
            description="Mỗi khoản quyên góp được chuyển thẳng vào tài khoản quỹ của dự án và dùng để hỗ trợ trẻ em có hoàn cảnh đặc biệt."
          />
          {open ? (
            <DonationForm min={settings.donation_min} />
          ) : (
            <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
              Ban tổ chức đang chuẩn bị tài khoản nhận quyên góp. Vui lòng quay lại sau.
            </p>
          )}
        </div>

        <aside className="flex h-fit flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <h2 className="font-semibold">Đã quyên góp</h2>
          <DonationProgress total={wall.total} goal={settings.donation_goal} />
          <p className="text-sm text-muted-foreground">
            Khoản quyên góp hiện ở mục{" "}
            <a href="#vinh-danh" className="underline underline-offset-4">
              Vinh danh
            </a>{" "}
            bên dưới sau khi Ban tổ chức xác nhận đã nhận tiền (trừ khi bạn chọn Không hiển thị).
          </p>
        </aside>
      </div>

      <Section id="vinh-danh" title="Vinh danh nhà hảo tâm" muted>
        <p className="-mt-2 text-muted-foreground">Cảm ơn những tấm lòng đã cùng TỰA mang yêu thương đến các bé.</p>
        {wall.donations.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card/60 p-8 text-center text-muted-foreground">
            Chưa có khoản quyên góp nào được xác nhận.
          </p>
        ) : (
          <DonationList donations={wall.donations} />
        )}
      </Section>

      {sponsors.length > 0 && (
        <Section id="nha-tai-tro" title="Nhà tài trợ">
          <SponsorTiers groups={groupSponsorsByTier(sponsors)} />
        </Section>
      )}
    </>
  );
}
