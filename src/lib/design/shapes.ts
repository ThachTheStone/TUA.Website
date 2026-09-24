import { TEXT_FONTS, type DesignShape, type EditableShape, type LineShape } from "@/lib/design/types";

// One mapping from our shapes to Konva attributes, shared by the editor (react-konva)
// and the offscreen exporter, so what the customer sees is exactly what gets printed.

export type KonvaClass = "Line" | "Rect" | "Ellipse" | "Text" | "Image";

const ROUND = { lineCap: "round", lineJoin: "round" } as const;

export function lineAttrs(shape: Pick<LineShape, "points" | "color" | "strokeWidth" | "erase">) {
  return {
    points: shape.points,
    stroke: shape.color,
    strokeWidth: shape.strokeWidth,
    tension: 0.5,
    ...ROUND,
    globalCompositeOperation: shape.erase ? ("destination-out" as const) : ("source-over" as const),
    listening: false,
  };
}

export function shapeKonva(shape: DesignShape): { className: KonvaClass; attrs: Record<string, unknown> } {
  switch (shape.kind) {
    case "line":
      return { className: "Line", attrs: lineAttrs(shape) };
    case "straight":
      return {
        className: "Line",
        attrs: {
          x: shape.x ?? 0,
          y: shape.y ?? 0,
          rotation: shape.rotation ?? 0,
          points: shape.points,
          stroke: shape.color,
          strokeWidth: shape.strokeWidth,
          ...ROUND,
          listening: false,
        },
      };
    case "rect":
      return {
        className: "Rect",
        attrs: {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          rotation: shape.rotation ?? 0,
          ...(shape.filled ? { fill: shape.color } : { stroke: shape.color, strokeWidth: shape.strokeWidth }),
          lineJoin: "round",
          listening: false,
        },
      };
    case "ellipse":
      return {
        className: "Ellipse",
        attrs: {
          x: shape.x,
          y: shape.y,
          radiusX: shape.radiusX,
          radiusY: shape.radiusY,
          rotation: shape.rotation ?? 0,
          ...(shape.filled ? { fill: shape.color } : { stroke: shape.color, strokeWidth: shape.strokeWidth }),
          listening: false,
        },
      };
    case "text":
      return {
        className: "Text",
        attrs: {
          x: shape.x,
          y: shape.y,
          rotation: shape.rotation ?? 0,
          text: shape.text,
          fontSize: shape.fontSize,
          fontFamily: fontFamily(shape.font),
          fontStyle: shape.bold ? "bold" : "normal",
          fill: shape.color,
          lineHeight: 1.15,
          listening: false,
        },
      };
    case "raster":
      return { className: "Image", attrs: { x: 0, y: 0, width: shape.width, height: shape.height, listening: false } };
  }
}

export type NodeTransform = { x: number; y: number; scaleX: number; scaleY: number; rotation: number };

/**
 * Bakes a move/resize/rotate from the selection frame into the shape. Scale is folded into the
 * shape's own size (not kept as a scale factor) so outlines keep an even stroke width.
 */
export function applyTransform(shape: EditableShape, t: NodeTransform): EditableShape {
  const sx = Math.abs(t.scaleX);
  const sy = Math.abs(t.scaleY);
  const base = { x: t.x, y: t.y, rotation: t.rotation };
  switch (shape.kind) {
    case "rect":
      return { ...shape, ...base, width: shape.width * sx, height: shape.height * sy };
    case "ellipse":
      return { ...shape, ...base, radiusX: shape.radiusX * sx, radiusY: shape.radiusY * sy };
    case "straight": {
      const [x1, y1, x2, y2] = shape.points;
      return { ...shape, ...base, points: [x1 * sx, y1 * sy, x2 * sx, y2 * sy] };
    }
    case "text":
      return { ...shape, ...base, fontSize: Math.max(4, shape.fontSize * sy) };
  }
}

export function fontFamily(font: string): string {
  return (TEXT_FONTS.find((f) => f.key === font) ?? TEXT_FONTS[0]).family;
}

const imageCache = new Map<string, HTMLImageElement>();

/** Loads a data-URL image we generated ourselves (never a user file), cached unless told not to. */
export function loadImage(src: string, { cache = true }: { cache?: boolean } = {}): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached?.complete) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = cached ?? new Image();
    img.addEventListener("load", () => resolve(img), { once: true });
    img.addEventListener("error", () => reject(new Error("Không tải được hình")), { once: true });
    if (!cached) {
      if (cache) imageCache.set(src, img);
      img.src = src;
    }
  });
}

export function cachedImage(src: string): HTMLImageElement | undefined {
  const img = imageCache.get(src);
  return img?.complete ? img : undefined;
}
