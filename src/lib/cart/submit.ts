"use client";

import type { Catalog } from "@/components/cart/catalog";
import type { CartItem } from "@/lib/cart/store";
import { exportPrintFiles, renderMockupPreview } from "@/lib/design/export";
import { newId, type DesignAreas } from "@/lib/design/types";
import { uploadDesignFile } from "@/lib/orders/actions";

// Checkout, browser side: render every custom design to print files and send them to the
// server one file per request (keeps each request small). The server validates and stores
// them; the browser never talks to storage directly.

export type SubmitProgress = { label: string; done: number; total: number };

async function send(uploadId: string, kind: "area" | "preview" | "json", blob: Blob, area?: string) {
  const fd = new FormData();
  fd.set("uploadId", uploadId);
  fd.set("kind", kind);
  if (area) fd.set("area", area);
  fd.set("file", blob, kind === "json" ? "design.json" : `${area ?? kind}.png`);
  const result = await uploadDesignFile(fd);
  if (!result.ok) throw new Error(result.error);
}

const toBlob = (dataUrl: string) => fetch(dataUrl).then((r) => r.blob());

/** Uploads all custom designs. Returns cart item id → upload id. Throws a Vietnamese message. */
export async function uploadCartDesigns(
  items: CartItem[],
  drafts: Record<string, DesignAreas>,
  catalog: Catalog,
  onProgress: (p: SubmitProgress) => void,
): Promise<Map<string, string>> {
  const custom = items.filter((i) => i.type === "CUSTOM");
  const uploads = new Map<string, string>();

  for (const [index, item] of custom.entries()) {
    const label = `Đang xử lý thiết kế ${index + 1}/${custom.length}…`;
    onProgress({ label, done: index, total: custom.length });
    const areas = item.designDraftId ? drafts[item.designDraftId] : undefined;
    if (!areas) throw new Error("Không tìm thấy bản thiết kế của một áo custom trong giỏ hàng");

    const hex = catalog.colors.find((c) => c.key === item.color)?.hex ?? "#ffffff";
    const files = await exportPrintFiles(areas, catalog.printAreas, catalog.dpi);
    if (!files.length) throw new Error("Có áo custom chưa có nét vẽ nào. Vui lòng sửa thiết kế.");

    const uploadId = newId();
    for (const f of files) await send(uploadId, "area", await toBlob(f.dataUrl), f.area);
    await send(uploadId, "preview", await toBlob(await renderMockupPreview(areas, catalog.printAreas, hex)));
    await send(uploadId, "json", new Blob([JSON.stringify(areas)], { type: "application/json" }));
    uploads.set(item.id, uploadId);
  }
  onProgress({ label: "Đang tạo đơn hàng…", done: custom.length, total: custom.length });
  return uploads;
}
