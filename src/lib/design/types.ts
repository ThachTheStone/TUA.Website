// Canvas design model (FR03). Everything is stored in logical units: every print area is
// LOGICAL_WIDTH units wide and keeps its real aspect ratio, whatever size it is shown at.
// Business config (sizes in cm, DPI) comes from `settings.print_areas` / `settings.export_dpi`.

export const LOGICAL_WIDTH = 500;
export const MAX_LAYERS = 5;
export const HISTORY_LIMIT = 40; // FR03 requires at least 30 undo steps
export const BRUSH_MIN = 2;
export const BRUSH_MAX = 60;

/** Only the fields of `settings.print_areas` the canvas needs; safe to pass to the client. */
export type CanvasPrintArea = {
  key: string;
  label: string;
  side: "front" | "back";
  widthCm: number;
  heightCm: number;
  xPct: number;
  yPct: number;
};

export type LineShape = {
  id: string;
  kind: "line";
  points: number[];
  color: string;
  strokeWidth: number;
  erase: boolean;
};
export type RectShape = {
  id: string;
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  filled: boolean;
};
export type EllipseShape = {
  id: string;
  kind: "ellipse";
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  color: string;
  strokeWidth: number;
  filled: boolean;
};
export type StraightShape = {
  id: string;
  kind: "straight";
  points: [number, number, number, number];
  color: string;
  strokeWidth: number;
};
/** Result of a flood fill: the whole layer rasterized into one PNG. */
export type RasterShape = {
  id: string;
  kind: "raster";
  src: string;
  width: number;
  height: number;
};

export type DesignShape = LineShape | RectShape | EllipseShape | StraightShape | RasterShape;

export type DesignLayer = { id: string; name: string; visible: boolean; shapes: DesignShape[] };
export type AreaDesign = { layers: DesignLayer[] };
/** One shirt design: print area key → drawing. Missing keys mean an empty area. */
export type DesignAreas = Record<string, AreaDesign>;

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export function logicalHeight(area: Pick<CanvasPrintArea, "widthCm" | "heightCm">): number {
  return (LOGICAL_WIDTH * area.heightCm) / area.widthCm;
}

export function newLayer(index: number): DesignLayer {
  return { id: newId(), name: `Lớp ${index}`, visible: true, shapes: [] };
}

export function emptyArea(): AreaDesign {
  return { layers: [newLayer(1)] };
}

/** True when a visible layer holds something printable (eraser strokes alone don't count). */
export function areaHasContent(design: AreaDesign | undefined): boolean {
  return !!design?.layers.some(
    (layer) => layer.visible && layer.shapes.some((s) => !(s.kind === "line" && s.erase)),
  );
}

export function designHasContent(areas: DesignAreas): boolean {
  return Object.values(areas).some(areaHasContent);
}
