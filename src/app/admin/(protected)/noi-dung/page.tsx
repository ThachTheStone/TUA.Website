import type { Metadata } from "next";
import { requireRole } from "@/lib/supabase/auth";
import { CONTENT_BLOCKS, getContentBlocks } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { updateContentBlock } from "@/lib/admin/content-actions";
import { ContentBlockForm } from "@/components/admin/content-block-form";

export const metadata: Metadata = { title: "Nội dung" };

export default async function ContentBlocksPage() {
  await requireRole(["ADMIN"]);
  const blocks = await getContentBlocks();

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Mục nào để trống cả nội dung và ảnh sẽ được ẩn khỏi trang chủ (riêng Hero luôn hiển thị).
      </p>
      {CONTENT_BLOCKS.map((def) => {
        const { key, label, bodyLabel, imageLabel } = def;
        const block = blocks[key];
        return (
          <section key={key} className="flex flex-col gap-4 rounded-xl border bg-card p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">{label}</h2>
              {block?.updated_at && (
                <span className="text-xs text-muted-foreground">Cập nhật {formatDate(block.updated_at)}</span>
              )}
            </div>
            <ContentBlockForm
              blockKey={key}
              action={updateContentBlock.bind(null, key)}
              title={block?.title ?? null}
              body={block?.body ?? null}
              imageUrl={block?.image_url ?? null}
              bodyLabel={bodyLabel}
              bodyHint={"bodyHint" in def ? def.bodyHint : undefined}
              imageLabel={imageLabel}
            />
          </section>
        );
      })}
    </div>
  );
}
