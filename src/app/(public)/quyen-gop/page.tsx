import type { Metadata } from "next";
import Link from "next/link";
import { DonationForm } from "@/components/public/donation-form";
import { DonationProgress } from "@/components/public/sections";
import { getDonorWall } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { isBankConfigured } from "@/lib/vietqr";

export const metadata: Metadata = { title: "Quyên góp" };
export const dynamic = "force-dynamic";

/** FR08: donation form. Money goes to the fund account, separate from shirt sales (BR04). */
export default async function DonatePage() {
  const [settings, wall] = await Promise.all([getSettings(), getDonorWall()]);
  const open = isBankConfigured(settings.bank_fund);

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Quyên góp</h1>
          <p className="text-muted-foreground">
            Mỗi khoản quyên góp được chuyển thẳng vào tài khoản quỹ của dự án và dùng để hỗ trợ trẻ em có hoàn cảnh đặc biệt.
          </p>
        </div>
        {open ? (
          <DonationForm min={settings.donation_min} />
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            Ban tổ chức đang chuẩn bị tài khoản nhận quyên góp. Vui lòng quay lại sau.
          </p>
        )}
      </div>

      <aside className="flex h-fit flex-col gap-4 rounded-xl border p-5 lg:sticky lg:top-20">
        <h2 className="font-semibold">Đã quyên góp</h2>
        <DonationProgress total={wall.total} goal={settings.donation_goal} />
        <p className="text-sm text-muted-foreground">
          Khoản quyên góp hiện trên{" "}
          <Link href="/vinh-danh" className="underline underline-offset-4">
            Bảng vinh danh
          </Link>{" "}
          sau khi Ban tổ chức xác nhận đã nhận tiền.
        </p>
      </aside>
    </div>
  );
}
