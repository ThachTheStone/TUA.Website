import type { Metadata } from "next";
import Image from "next/image";
import { requireRole } from "@/lib/supabase/auth";
import { HOME_ARTWORK_LIMIT, listArtworks } from "@/lib/content";
import { createArtwork, deleteArtwork, updateArtwork } from "@/lib/admin/content-actions";
import { ArtworkForm } from "@/components/admin/artwork-form";
import { EditPanel } from "@/components/admin/edit-panel";
import { ConfirmActionButton } from "@/components/admin/form-kit";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Top 5 tranh" };

export default async function ArtworksPage() {
  await requireRole(["ADMIN"]);
  const artworks = await listArtworks();

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Trang chủ hiển thị {HOME_ARTWORK_LIMIT} tranh đầu tiên theo thứ tự (số nhỏ đứng trước). Chỉ dùng tên
        hoặc biệt danh của bé, có sự đồng ý của mái ấm (NFR06).
      </p>

      <EditPanel summary={<span className="font-medium">+ Thêm tranh mới</span>} defaultOpen={artworks.length === 0}>
        <ArtworkForm action={createArtwork} />
      </EditPanel>

      {artworks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có tranh nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {artworks.map((artwork, index) => (
            <EditPanel
              key={artwork.id}
              summary={
                <div className="flex items-center gap-3">
                  <Image
                    src={artwork.image_url}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 rounded-md border bg-muted object-cover"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{artwork.child_name || "Chưa đặt tên"}</div>
                    <div className="text-xs text-muted-foreground">Thứ tự {artwork.sort_order}</div>
                  </div>
                  {index < HOME_ARTWORK_LIMIT ? (
                    <Badge>Trên trang chủ</Badge>
                  ) : (
                    <Badge variant="outline">Không hiển thị</Badge>
                  )}
                </div>
              }
              actions={
                <ConfirmActionButton
                  action={deleteArtwork.bind(null, artwork.id)}
                  confirmText="Xóa tranh này?"
                  successMessage="Đã xóa tranh"
                >
                  Xóa tranh
                </ConfirmActionButton>
              }
            >
              <ArtworkForm action={updateArtwork.bind(null, artwork.id)} artwork={artwork} />
            </EditPanel>
          ))}
        </div>
      )}
    </div>
  );
}
