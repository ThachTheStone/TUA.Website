import type { Metadata } from "next";
import Image from "next/image";
import { requireRole } from "@/lib/supabase/auth";
import { listSponsors } from "@/lib/content";
import { createSponsor, deleteSponsor, updateSponsor } from "@/lib/admin/sponsor-actions";
import { SponsorForm } from "@/components/admin/sponsor-form";
import { EditPanel } from "@/components/admin/edit-panel";
import { ConfirmActionButton } from "@/components/admin/form-kit";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Nhà tài trợ" };

export default async function SponsorsPage() {
  await requireRole(["ADMIN"]);
  const sponsors = await listSponsors();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Nhà tài trợ</h1>
        <p className="text-sm text-muted-foreground">
          Hiển thị trên trang chủ và trang Vinh danh, nhóm theo hạng và sắp theo thứ tự (số nhỏ đứng trước).
        </p>
      </div>

      <EditPanel summary={<span className="font-medium">+ Thêm nhà tài trợ</span>} defaultOpen={sponsors.length === 0}>
        <SponsorForm action={createSponsor} />
      </EditPanel>

      {sponsors.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có nhà tài trợ nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sponsors.map((sponsor) => (
            <EditPanel
              key={sponsor.id}
              summary={
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-white">
                    {sponsor.logo_url && (
                      <Image
                        src={sponsor.logo_url}
                        alt=""
                        width={44}
                        height={44}
                        className="max-h-11 w-auto object-contain"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{sponsor.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {sponsor.tier || "Chưa xếp hạng"} · Thứ tự {sponsor.sort_order}
                    </div>
                  </div>
                  {sponsor.is_active ? <Badge>Đang hiển thị</Badge> : <Badge variant="outline">Đã tắt</Badge>}
                </div>
              }
              actions={
                <ConfirmActionButton
                  action={deleteSponsor.bind(null, sponsor.id)}
                  confirmText={`Xóa nhà tài trợ "${sponsor.name}"?`}
                  successMessage="Đã xóa nhà tài trợ"
                >
                  Xóa nhà tài trợ
                </ConfirmActionButton>
              }
            >
              <SponsorForm action={updateSponsor.bind(null, sponsor.id)} sponsor={sponsor} />
            </EditPanel>
          ))}
        </div>
      )}
    </div>
  );
}
