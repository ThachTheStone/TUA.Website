"use client";

import { Download, Eraser, PanelRight, Redo2, ShoppingCart, Undo2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AreaStage, type Tool } from "@/components/canvas/area-stage";
import { LayersPanel } from "@/components/canvas/layers-panel";
import { ShirtPreview } from "@/components/canvas/shirt-preview";
import { Toolbar } from "@/components/canvas/toolbar";
import { useDesignHistory } from "@/components/canvas/use-design-history";
import { ShirtOptions, type ColorOption } from "@/components/public/shirt-options";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { exportPrintFiles } from "@/lib/design/export";
import {
  areaHasContent,
  designHasContent,
  emptyArea,
  type AreaDesign,
  type CanvasPrintArea,
  type DesignAreas,
} from "@/lib/design/types";
import { formatVND } from "@/lib/format";
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
};

function fillAreas(printAreas: CanvasPrintArea[], saved?: DesignAreas): DesignAreas {
  return Object.fromEntries(printAreas.map((a) => [a.key, saved?.[a.key] ?? emptyArea()]));
}

/** Loads the design to start from: the cart item being edited, else the unsaved work in progress. */
function initialState(props: DesignerProps) {
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
  const [brushColor, setBrushColor] = useState("#111111");
  const [brushSize, setBrushSize] = useState(8);
  const [filled, setFilled] = useState(false);
  const [shirtColor, setShirtColor] = useState(init.color);
  const [size, setSize] = useState(init.size);
  const [agreed, setAgreed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const saveCustom = useCart((s) => s.saveCustom);
  const setWip = useCart((s) => s.setWip);

  const area = printAreas.find((a) => a.key === areaKey) ?? printAreas[0];
  const design: AreaDesign = areas[area.key];
  const activeLayerId =
    design.layers.find((l) => l.id === activeLayers[area.key])?.id ?? design.layers[design.layers.length - 1].id;
  const shirtHex = colors.find((c) => c.key === shirtColor)?.hex ?? "#ffffff";
  const hasContent = useMemo(() => designHasContent(areas), [areas]);

  // Keep unsaved work across reloads (debounced; fill images can be large).
  useEffect(() => {
    const timer = setTimeout(() => setWip({ editingItemId, color: shirtColor, size, areas }), 500);
    return () => clearTimeout(timer);
  }, [areas, shirtColor, size, editingItemId, setWip]);

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

  function addToCart() {
    if (!agreed || !hasContent) return;
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
            shirtHex={shirtHex}
            onCommit={(next) => commit(area.key, next)}
            onBlocked={(msg) => toast.warning(msg)}
          />
        </div>
        <p className="border-t bg-background px-3 pt-1 text-xs text-muted-foreground">
          {area.label}: {area.widthCm}×{area.heightCm} cm. Nét vẽ ra ngoài khung sẽ bị cắt.
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
        />
      </div>

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

        <ShirtOptions colors={colors} sizes={sizes} color={shirtColor} size={size} onColor={setShirtColor} onSize={setSize} />

        <section className="flex flex-col gap-3 border-t pt-4">
          <p className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Áo custom</span>
            <span className="text-lg font-bold">{formatVND(price)}</span>
          </p>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <span>
              Tôi cam kết nội dung do tôi tự vẽ, không bạo lực, không phản cảm và không vi phạm bản quyền.
            </span>
          </label>
          {!hasContent && <p className="text-sm text-muted-foreground">Hãy vẽ ở ít nhất 1 vùng in.</p>}
          <Button type="button" size="lg" className="h-12" disabled={!agreed || !hasContent} onClick={addToCart}>
            <ShoppingCart /> {editingItemId ? "Cập nhật giỏ hàng" : "Thêm vào giỏ"}
          </Button>
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
