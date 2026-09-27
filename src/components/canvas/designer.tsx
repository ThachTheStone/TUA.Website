"use client";

import { Download, Eraser, Loader2, PanelRight, Redo2, Send, ShoppingCart, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AreaStage, type Tool } from "@/components/canvas/area-stage";
import { LayersPanel } from "@/components/canvas/layers-panel";
import { ShirtPreview } from "@/components/canvas/shirt-preview";
import { Toolbar } from "@/components/canvas/toolbar";
import { useDesignHistory } from "@/components/canvas/use-design-history";
import { ShirtOptions, type ColorOption } from "@/components/public/shirt-options";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { uploadDesignAsset } from "@/lib/design/asset-actions";
import { checkImageFile, prepareImage, registerAsset } from "@/lib/design/assets";
import { exportPrintFiles } from "@/lib/design/export";
import {
  LOGICAL_WIDTH,
  MAX_IMAGES,
  areaHasContent,
  designHasContent,
  emptyArea,
  logicalHeight,
  newId,
  printSizePx,
  type ImageShape,
  type AreaDesign,
  type CanvasPrintArea,
  type DesignAreas,
  type TextFont,
} from "@/lib/design/types";
import { formatVND } from "@/lib/format";
import { addToCartProblem, shirtsLeft, type ShirtStock } from "@/lib/inventory";
import { cn } from "@/lib/utils";

export type DesignerProps = {
  printAreas: CanvasPrintArea[];
  colors: ColorOption[];
  sizes: string[];
  price: number;
  dpi: number;
  /** Cart item being edited (`/thiet-ke?sua=<id>`), if any. */
  editItemId: string | null;
  /** Called after the design was saved to the cart, to start a fresh one. */
  onSaved: () => void;
  /** "Chèn ảnh" needs an account (BR01). */
  signedIn: boolean;
  /** FR29: editing a rejected shirt of a placed order instead of a cart item. */
  resubmit?: ResubmitOptions;
  /** Blank shirts left per colour × size; sold-out sizes can't be picked. */
  stock?: ShirtStock;
};

/** A brush colour that shows on the shirt: white on dark shirts, near-black on light ones. */
function contrastBrush(shirtHex: string): string {
  const n = parseInt(shirtHex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const luminance = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luminance < 0.5 ? "#ffffff" : "#111111";
}

export type ResubmitOptions = {
  areas: DesignAreas;
  color: string;
  size: string;
  /** Why staff rejected it, shown above the send button. */
  rejectReason: string | null;
  /** Uploads the new design; throws a Vietnamese message on failure. */
  submit: (areas: DesignAreas) => Promise<void>;
};

const countImages = (areas: DesignAreas) =>
  Object.values(areas).reduce((n, a) => n + a.layers.reduce((m, l) => m + l.shapes.filter((s) => s.kind === "image").length, 0), 0);

function fillAreas(printAreas: CanvasPrintArea[], saved?: DesignAreas): DesignAreas {
  return Object.fromEntries(printAreas.map((a) => [a.key, saved?.[a.key] ?? emptyArea()]));
}

/** Loads the design to start from: the cart item being edited, else the unsaved work in progress. */
function initialState(props: DesignerProps) {
  if (props.resubmit) {
    const { areas, color, size } = props.resubmit;
    return { editingItemId: null, areas: fillAreas(props.printAreas, areas), color, size };
  }
  const { items, drafts, wip } = useCart.getState();
  const item = props.editItemId ? items.find((i) => i.id === props.editItemId && i.type === "CUSTOM") : undefined;
  const editingItemId = item?.id ?? null;
  const fromWip = wip && wip.editingItemId === editingItemId ? wip : null;
  const areas = fromWip?.areas ?? (item?.designDraftId ? drafts[item.designDraftId] : undefined);
  const validColor = (c?: string) => (c && props.colors.some((x) => x.key === c) ? c : undefined);
  const validSize = (s?: string) => (s && props.sizes.includes(s) ? s : undefined);
  return {
    editingItemId,
    areas: fillAreas(props.printAreas, areas),
    color: validColor(fromWip?.color) ?? validColor(item?.color) ?? props.colors[0].key,
    size: validSize(fromWip?.size) ?? validSize(item?.size) ?? props.sizes[Math.floor(props.sizes.length / 2)],
  };
}

/** FR02–FR05: draw on each print area, preview on the shirt, then add to the cart. */
export function Designer(props: DesignerProps) {
  const { printAreas, colors, sizes, price, dpi } = props;
  const [init] = useState(() => initialState(props));
  const editingItemId = init.editingItemId;
  const history = useDesignHistory(() => init.areas);
  const { areas, commit, undo, redo, canUndo, canRedo } = history;

  const [areaKey, setAreaKey] = useState(printAreas[0].key);
  const [activeLayers, setActiveLayers] = useState<Record<string, string>>({});
  const [tool, setTool] = useState<Tool>("brush");
  const hexOf = (key: string) => colors.find((c) => c.key === key)?.hex ?? "#ffffff";
  // Starts visible on the shirt (a black brush on a black shirt draws nothing you can see).
  const [brushColor, setBrushColor] = useState(() => contrastBrush(hexOf(init.color)));
  const [brushSize, setBrushSize] = useState(8);
  const [filled, setFilled] = useState(false);
  const [font, setFont] = useState<TextFont>("sans");
  const [bold, setBold] = useState(false);
  const [shirtColor, setShirtColor] = useState(init.color);
  const [size, setSize] = useState(init.size);
  const [agreed, setAgreed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resubmit = props.resubmit;

  const saveCustom = useCart((s) => s.saveCustom);
  const cart = useCart((s) => s.items);
  const setWip = useCart((s) => s.setWip);

  const area = printAreas.find((a) => a.key === areaKey) ?? printAreas[0];
  const design: AreaDesign = areas[area.key];
  const activeLayerId =
    design.layers.find((l) => l.id === activeLayers[area.key])?.id ?? design.layers[design.layers.length - 1].id;
  const shirtHex = hexOf(shirtColor);

  /** Changing the shirt also flips the brush, unless the buyer already picked a brush colour. */
  function changeShirtColor(key: string) {
    if (brushColor === contrastBrush(shirtHex)) setBrushColor(contrastBrush(hexOf(key)));
    setShirtColor(key);
  }
  const hasContent = useMemo(() => designHasContent(areas), [areas]);

  // Keep unsaved work across reloads (debounced; fill images can be large). Not for resubmits.
  useEffect(() => {
    if (resubmit) return;
    const timer = setTimeout(() => setWip({ editingItemId, color: shirtColor, size, areas }), 500);
    return () => clearTimeout(timer);
  }, [areas, shirtColor, size, editingItemId, setWip, resubmit]);

  // Desktop shortcuts: Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement)?.closest("input, textarea")) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) undo(area.key);
      else if (key === "y" || (key === "z" && e.shiftKey)) redo(area.key);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [area.key, undo, redo]);

  function clearArea() {
    if (!areaHasContent(design) && design.layers.every((l) => !l.shapes.length)) return;
    if (!window.confirm(`Xóa toàn bộ nét vẽ ở vùng "${area.label}"? Bạn vẫn có thể hoàn tác.`)) return;
    commit(area.key, { layers: design.layers.map((l) => ({ ...l, shapes: [] })) });
  }

  function openImagePicker() {
    if (!props.signedIn) return setLoginPrompt(true);
    if (countImages(areas) >= MAX_IMAGES) return toast.error(`Mỗi áo tối đa ${MAX_IMAGES} ảnh`);
    fileRef.current?.click();
  }

  /** BR01: prepare, upload and place a buyer photo/sticker on the active layer of this area. */
  async function insertImage(file: File) {
    const problem = checkImageFile(file);
    if (problem) return toast.error(problem);
    const layer = design.layers.find((l) => l.id === activeLayerId);
    if (!layer?.visible) return toast.warning("Lớp đang bị ẩn. Hãy hiện lớp này hoặc chọn lớp khác.");
    const targetArea = area;
    const targetLayer = activeLayerId;
    setInserting(true);
    try {
      const maxSide = Math.max(
        ...printAreas.map((a) => {
          const px = printSizePx(a, dpi);
          return Math.max(px.widthPx, px.heightPx);
        }),
      );
      const prepared = await prepareImage(file, maxSide);
      const fd = new FormData();
      fd.set("file", prepared.blob, prepared.blob.type === "image/png" ? "anh.png" : "anh.jpg");
      const result = await uploadDesignAsset(fd);
      if (!result.ok) throw new Error(result.error);
      const asset = result.data;
      registerAsset(asset.id, asset.url);

      // Fit inside 80% of the area, centred, keeping the picture's proportions.
      const areaH = logicalHeight(targetArea);
      const ratio = asset.width / asset.height;
      let width = LOGICAL_WIDTH * 0.8;
      let height = width / ratio;
      if (height > areaH * 0.8) {
        height = areaH * 0.8;
        width = height * ratio;
      }
      const shape: ImageShape = {
        id: newId(),
        kind: "image",
        assetId: asset.id,
        x: (LOGICAL_WIDTH - width) / 2,
        y: (areaH - height) / 2,
        width,
        height,
        naturalWidth: asset.width,
        naturalHeight: asset.height,
      };
      // Added to the design as it is now: strokes drawn during the upload are kept.
      commit(targetArea.key, (current) => ({
        layers: current.layers.map((l) => (l.id === targetLayer ? { ...l, shapes: [...l.shapes, shape] } : l)),
      }));
      setTool("select");
      toast.success("Đã chèn ảnh. Chạm vào ảnh để kéo, phóng to/thu nhỏ hoặc xoay.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không chèn được ảnh");
    } finally {
      setInserting(false);
    }
  }

  async function submitResubmit() {
    if (!resubmit || !agreed || !hasContent) return;
    setSubmitting(true);
    try {
      await resubmit.submit(areas);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gửi lại được thiết kế");
      setSubmitting(false);
    }
  }

  function addToCart() {
    if (!agreed || !hasContent) return;
    if (props.stock) {
      const quantity = cart.find((i) => i.id === editingItemId)?.quantity ?? 1;
      const problem = addToCartProblem(cart, props.stock, { color: shirtColor, size, quantity, replaceId: editingItemId ?? undefined });
      if (problem) return toast.error(problem);
    }
    saveCustom({ itemId: editingItemId, color: shirtColor, size, areas });
    toast.success(editingItemId ? "Đã cập nhật áo trong giỏ hàng" : "Đã thêm áo vào giỏ hàng", {
      action: { label: "Xem giỏ hàng", onClick: () => window.location.assign("/gio-hang") },
    });
    // saveCustom already cleared the work in progress, so the next mount starts empty.
    props.onSaved();
  }

  async function downloadPrintFiles() {
    setExporting(true);
    try {
      const files = await exportPrintFiles(areas, printAreas, dpi);
      for (const f of files) {
        const a = document.createElement("a");
        a.href = f.dataUrl;
        a.download = `thiet-ke-${f.area}-${f.widthPx}x${f.heightPx}.png`;
        a.click();
      }
      toast.success(`Đã xuất ${files.length} file PNG ${dpi} DPI`);
    } catch (err) {
      console.error(err);
      toast.error("Không xuất được file in");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] overflow-hidden overscroll-none">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <div className="flex gap-1" role="tablist" aria-label="Vùng in">
            {printAreas.map((a) => (
              <button
                key={a.key}
                type="button"
                role="tab"
                aria-selected={a.key === area.key}
                onClick={() => setAreaKey(a.key)}
                className={cn(
                  "relative h-11 rounded-md border px-3 text-sm font-medium",
                  a.key === area.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {a.label}
                {areaHasContent(areas[a.key]) && (
                  <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-emerald-500" aria-label="đã vẽ" />
                )}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1">
            <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => undo(area.key)} disabled={!canUndo(area.key)} aria-label="Hoàn tác" title="Hoàn tác">
              <Undo2 />
            </Button>
            <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => redo(area.key)} disabled={!canRedo(area.key)} aria-label="Làm lại" title="Làm lại">
              <Redo2 />
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={clearArea} title="Xóa toàn bộ vùng">
              <Eraser /> <span className="hidden sm:inline">Xóa vùng</span>
            </Button>
            <Button type="button" className="h-11 lg:hidden" onClick={() => setPanelOpen(true)}>
              <PanelRight /> Lớp & đặt áo
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 bg-neutral-200 p-4">
          <AreaStage
            key={area.key}
            area={area}
            design={design}
            activeLayerId={activeLayerId}
            tool={tool}
            color={brushColor}
            size={brushSize}
            filled={filled}
            font={font}
            bold={bold}
            shirtHex={shirtHex}
            onCommit={(next) => commit(area.key, next)}
            onBlocked={(msg) => toast.warning(msg)}
          />
        </div>
        <p className="border-t bg-background px-3 pt-1 text-xs text-muted-foreground">
          {area.label}: {area.widthCm}×{area.heightCm} cm. Nét vẽ ra ngoài khung sẽ bị cắt. Chạm vào hình hoặc chữ
          vừa vẽ để kéo, phóng to/thu nhỏ bằng khung nét đứt; chạm đúp vào chữ để sửa.
        </p>

        <Toolbar
          tool={tool}
          onTool={setTool}
          color={brushColor}
          onColor={setBrushColor}
          size={brushSize}
          onSize={setBrushSize}
          filled={filled}
          onFilled={setFilled}
          font={font}
          onFont={setFont}
          bold={bold}
          onBold={setBold}
          onInsertImage={openImagePicker}
          inserting={inserting}
        />
        {/* BR01: the only place a buyer can pick a file; signed-in only, checked again on the server. */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void insertImage(file);
          }}
        />
      </div>

      {loginPrompt && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="flex max-w-sm flex-col gap-4 rounded-xl bg-background p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Đăng nhập để chèn ảnh</h2>
            <p className="text-sm text-muted-foreground">
              Bạn cần đăng nhập để chèn ảnh hoặc sticker của mình. Bản vẽ hiện tại được giữ nguyên trên trình duyệt.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setLoginPrompt(false)}>
                Để sau
              </Button>
              <Button asChild>
                <Link href="/dang-nhap?next=/thiet-ke">Đăng nhập</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {panelOpen && (
        <button
          type="button"
          aria-label="Đóng"
          className="absolute inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setPanelOpen(false)}
        />
      )}
      <aside
        className={cn(
          "z-30 w-80 shrink-0 flex-col gap-6 overflow-y-auto border-l bg-background p-4 lg:static lg:flex",
          panelOpen ? "absolute inset-y-0 right-0 flex shadow-xl" : "hidden",
        )}
      >
        <div className="flex items-center justify-between lg:hidden">
          <h2 className="font-semibold">Lớp & đặt áo</h2>
          <Button type="button" variant="ghost" size="icon" className="size-11" onClick={() => setPanelOpen(false)} aria-label="Đóng">
            <X />
          </Button>
        </div>

        <LayersPanel
          design={design}
          activeLayerId={activeLayerId}
          onSelect={(id) => setActiveLayers((s) => ({ ...s, [area.key]: id }))}
          onChange={(next) => commit(area.key, next)}
        />

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Xem trước</h3>
          <ShirtPreview areas={areas} printAreas={printAreas} colorHex={shirtHex} />
        </section>

        {resubmit?.rejectReason && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
            Lý do bị từ chối: <strong>{resubmit.rejectReason}</strong>
          </p>
        )}
        {resubmit ? (
          <p className="text-sm">
            Áo: <strong>{colors.find((c) => c.key === shirtColor)?.label ?? shirtColor}</strong> · Size <strong>{size}</strong>
            <span className="block text-xs text-muted-foreground">Chỉ sửa được thiết kế; màu và size giữ nguyên.</span>
          </p>
        ) : (
          <ShirtOptions
            colors={colors}
            sizes={sizes}
            color={shirtColor}
            size={size}
            onColor={changeShirtColor}
            onSize={setSize}
            left={props.stock ? (s) => shirtsLeft(props.stock!, shirtColor, s) : undefined}
          />
        )}

        <section className="flex flex-col gap-3 border-t pt-4">
          {!resubmit && (
            <p className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Áo custom</span>
              <span className="text-lg font-bold">{formatVND(price)}</span>
            </p>
          )}
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <span>
              Tôi cam kết nội dung do tôi tự vẽ hoặc tôi có quyền sử dụng (kể cả ảnh tải lên), không bạo lực, không phản
              cảm, không vi phạm bản quyền. Tôi hiểu thiết kế sẽ được Ban tổ chức duyệt và có thể bị từ chối.
            </span>
          </label>
          {!hasContent && <p className="text-sm text-muted-foreground">Hãy vẽ ở ít nhất 1 vùng in.</p>}
          {resubmit ? (
            <Button type="button" size="lg" className="h-12" disabled={!agreed || !hasContent || submitting} onClick={submitResubmit}>
              {submitting ? <Loader2 className="animate-spin" /> : <Send />} {submitting ? "Đang gửi…" : "Gửi lại thiết kế"}
            </Button>
          ) : (
            <Button type="button" size="lg" className="h-12" disabled={!agreed || !hasContent} onClick={addToCart}>
              <ShoppingCart /> {editingItemId ? "Cập nhật giỏ hàng" : "Thêm vào giỏ"}
            </Button>
          )}
          {process.env.NODE_ENV !== "production" && (
            <Button type="button" variant="outline" size="sm" disabled={!hasContent || exporting} onClick={downloadPrintFiles}>
              <Download /> Tải file in {dpi} DPI (chỉ bản dev)
            </Button>
          )}
        </section>
      </aside>
    </div>
  );
}
