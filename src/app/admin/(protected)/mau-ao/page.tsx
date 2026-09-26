/* eslint-disable @next/next/no-img-element -- admin thumbnails */
import type { Metadata } from "next";
import { ConfirmActionButton } from "@/components/admin/form-kit";
import { EditPanel } from "@/components/admin/edit-panel";
import { PrototypeForm, type ProtoFormData } from "@/components/admin/prototype-form";
import { Badge } from "@/components/ui/badge";
import { deletePrototype, setPrototypeActive } from "@/lib/admin/prototype-actions";
import { formatVND } from "@/lib/format";
import { DESIGNS_BUCKET } from "@/lib/orders/design-upload";
import { listPrototypes, prototypeFiles } from "@/lib/prototypes/queries";
import { resolutionWarning } from "@/lib/prototypes/resolution";
import { getSettings } from "@/lib/settings";
import { requireRole } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Áo mẫu" };
export const dynamic = "force-dynamic";

/** Number of order lines per prototype: those can't be deleted, only deactivated (FR28). */
async function orderCounts(): Promise<Map<string, number>> {
  const { data, error } = await createServiceClient().from("order_items").select("prototype_id").not("prototype_id", "is", null);
  if (error) throw new Error(`Không đọc được đơn áo mẫu: ${error.message}`);
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(row.prototype_id, (counts.get(row.prototype_id) ?? 0) + 1);
  return counts;
}

/** FR28: prototype management (Staff and Admin). */
export default async function PrototypesPage() {
  await requireRole();
  const [settings, prototypes, counts] = await Promise.all([getSettings(), listPrototypes(), orderCounts()]);
  const files = await prototypeFiles(prototypes);

  // Signed download links for the private print files (1 hour).
  const paths = [...files.values()].flat().map((f) => f.filePath);
  const { data: signed } = paths.length
    ? await createServiceClient().storage.from(DESIGNS_BUCKET).createSignedUrls(paths, 3600, { download: true })
    : { data: [] };
  const urlOf = (path: string) => signed?.find((s) => s.path === path)?.signedUrl ?? null;

  const colorLabel = (key: string) => settings.colors.find((c) => c.key === key)?.label ?? key;
  const formProps = { colors: settings.colors, printAreas: settings.print_areas, dpi: settings.export_dpi };

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Áo mẫu</h1>
        <p className="text-sm text-muted-foreground">
          Thiết kế có sẵn do Ban tổ chức đăng, bán với giá áo custom ({formatVND(settings.prices.CUSTOM)}). Sắp theo thứ tự (số nhỏ đứng trước). Mẫu đã có
          trong đơn hàng không xóa được, chỉ tắt bán.
        </p>
      </div>

      <EditPanel summary={<span className="font-medium">+ Thêm mẫu áo</span>} defaultOpen={prototypes.length === 0}>
        <PrototypeForm {...formProps} />
      </EditPanel>

      {prototypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có mẫu áo nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {prototypes.map((p) => {
            const protoFiles = files.get(p.id) ?? [];
            const warnings = protoFiles.flatMap((f) => resolutionWarning(f, settings) ?? []);
            const orders = counts.get(p.id) ?? 0;
            const colorMissing = !settings.colors.some((c) => c.key === p.color);
            const data: ProtoFormData = {
              id: p.id,
              name: p.name,
              slug: p.slug,
              description: p.description,
              color: colorMissing ? (settings.colors[0]?.key ?? p.color) : p.color,
              sort_order: p.sort_order,
              is_active: p.is_active,
              image_urls: p.image_urls,
              files: protoFiles.map((f) => ({ area: f.area, widthPx: f.widthPx, heightPx: f.heightPx, url: urlOf(f.filePath) })),
            };
            return (
              <EditPanel
                key={p.id}
                summary={
                  <div className="flex items-center gap-3">
                    <div className="size-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {p.image_urls[0] && <img src={p.image_urls[0]} alt="" className="size-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {colorLabel(p.color)} · {protoFiles.length} vùng in · Thứ tự {p.sort_order}
                        {orders > 0 && ` · ${orders} dòng đơn hàng`}
                      </div>
                      {(warnings.length > 0 || colorMissing) && (
                        <div className="text-xs text-amber-700 dark:text-amber-400">
                          {colorMissing ? "Màu áo không còn trong Cài đặt: khách không đặt được mẫu này" : "File in chưa đủ độ phân giải"}
                        </div>
                      )}
                    </div>
                    {p.is_active ? <Badge>Đang bán</Badge> : <Badge variant="outline">Đã tắt</Badge>}
                  </div>
                }
                actions={
                  <div className="flex flex-wrap gap-2">
                    <a href={`/mau-ao/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-md px-3 text-sm underline underline-offset-4">
                      Xem trang mẫu
                    </a>
                    <ConfirmActionButton
                      action={setPrototypeActive.bind(null, p.id, !p.is_active)}
                      successMessage={p.is_active ? "Đã tắt bán" : "Đã bật bán"}
                      variant="outline"
                    >
                      {p.is_active ? "Tắt bán" : "Bật bán"}
                    </ConfirmActionButton>
                    {orders === 0 && (
                      <ConfirmActionButton
                        action={deletePrototype.bind(null, p.id)}
                        confirmText={`Xóa mẫu "${p.name}" cùng ảnh và file in?`}
                        successMessage="Đã xóa mẫu áo"
                      >
                        Xóa mẫu
                      </ConfirmActionButton>
                    )}
                  </div>
                }
              >
                {warnings.map((w) => (
                  <p key={w} className="rounded-md bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    {w}
                  </p>
                ))}
                <PrototypeForm key={p.updated_at} prototype={data} {...formProps} />
              </EditPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
