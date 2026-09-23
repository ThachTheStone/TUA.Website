"use client";

import type Konva from "konva";
import { MOCKUP_HEIGHT, MOCKUP_WIDTH, areaOnMockup, shirtSvgUrl } from "@/lib/design/mockup";
import { loadImage, shapeKonva } from "@/lib/design/shapes";
import {
  LOGICAL_WIDTH,
  areaHasContent,
  logicalHeight,
  type AreaDesign,
  type CanvasPrintArea,
  type DesignAreas,
} from "@/lib/design/types";

// Browser-only rendering of saved designs: print files (NFR05) and previews (FR04).
// Designs are rebuilt from JSON on an offscreen stage, so the export never depends on
// the editor being mounted or on the size of the customer's screen.

export type AreaExport = { area: string; dataUrl: string; widthPx: number; heightPx: number };

/** Print-file size of an area: real size in cm at the configured DPI. */
export function printSizePx(area: CanvasPrintArea, dpi: number) {
  return {
    widthPx: Math.round((area.widthCm / 2.54) * dpi),
    heightPx: Math.round((area.heightCm / 2.54) * dpi),
  };
}

/**
 * Renders one area to a transparent PNG of exactly `widthPx` × `heightPx` (height defaults to the
 * area's aspect ratio). Hidden layers are not printed.
 */
export async function renderArea(
  area: CanvasPrintArea,
  design: AreaDesign,
  widthPx: number,
  heightPx = Math.round((widthPx * area.heightCm) / area.widthCm),
): Promise<string> {
  const { default: K } = await import("konva");
  const width = LOGICAL_WIDTH;
  const height = logicalHeight(area);
  const container = document.createElement("div");
  // Size the stage in real pixels and scale the logical drawing into it, so the file size is exact.
  const scale = widthPx / width;
  const stage = new K.Stage({ container, width: widthPx, height: heightPx, scaleX: scale, scaleY: scale });
  try {
    for (const layer of design.layers) {
      if (!layer.visible) continue;
      const kLayer = new K.Layer({ clip: { x: 0, y: 0, width, height } });
      for (const shape of layer.shapes) {
        const { className, attrs } = shapeKonva(shape);
        let node: Konva.Shape;
        if (className === "Image" && shape.kind === "raster") {
          node = new K.Image({ ...attrs, image: await loadImage(shape.src) });
        } else if (className === "Rect") node = new K.Rect(attrs);
        else if (className === "Ellipse") node = new K.Ellipse(attrs as Konva.EllipseConfig);
        else node = new K.Line(attrs);
        kLayer.add(node);
      }
      stage.add(kLayer);
    }
    return stage.toDataURL({ mimeType: "image/png", pixelRatio: 1 });
  } finally {
    stage.destroy();
  }
}

/** One 200 DPI (settings.export_dpi) transparent PNG per non-empty area. */
export async function exportPrintFiles(
  areas: DesignAreas,
  printAreas: CanvasPrintArea[],
  dpi: number,
): Promise<AreaExport[]> {
  const files: AreaExport[] = [];
  for (const area of printAreas) {
    const design = areas[area.key];
    if (!design || !areaHasContent(design)) continue;
    const { widthPx, heightPx } = printSizePx(area, dpi);
    files.push({ area: area.key, dataUrl: await renderArea(area, design, widthPx, heightPx), widthPx, heightPx });
  }
  return files;
}

/** Low-resolution PNG images per non-empty area, for on-screen previews. */
export async function renderAreaPreviews(
  areas: DesignAreas,
  printAreas: CanvasPrintArea[],
  widthPx = 400,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const area of printAreas) {
    const design = areas[area.key];
    if (design && areaHasContent(design)) out[area.key] = await renderArea(area, design, widthPx);
  }
  return out;
}

/** Front and back mockups side by side in one PNG, for the cart and the admin order page. */
export async function renderMockupPreview(
  areas: DesignAreas,
  printAreas: CanvasPrintArea[],
  colorHex: string,
  scale = 1.5,
): Promise<string> {
  const images = await renderAreaPreviews(areas, printAreas, 300);
  const canvas = document.createElement("canvas");
  canvas.width = MOCKUP_WIDTH * 2 * scale;
  canvas.height = MOCKUP_HEIGHT * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  for (const [i, side] of (["front", "back"] as const).entries()) {
    const offsetX = i * MOCKUP_WIDTH;
    ctx.drawImage(await loadImage(shirtSvgUrl(side, colorHex)), offsetX, 0, MOCKUP_WIDTH, MOCKUP_HEIGHT);
    for (const area of printAreas) {
      if (area.side !== side || !images[area.key]) continue;
      const r = areaOnMockup(area);
      ctx.drawImage(await loadImage(images[area.key], { cache: false }), offsetX + r.x, r.y, r.width, r.height);
    }
  }
  return canvas.toDataURL("image/png");
}
