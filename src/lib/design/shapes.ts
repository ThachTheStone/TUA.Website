import type { DesignShape, LineShape } from "@/lib/design/types";

// One mapping from our shapes to Konva attributes, shared by the editor (react-konva)
// and the offscreen exporter, so what the customer sees is exactly what gets printed.

export type KonvaClass = "Line" | "Rect" | "Ellipse" | "Image";

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
        attrs: { points: shape.points, stroke: shape.color, strokeWidth: shape.strokeWidth, ...ROUND, listening: false },
      };
    case "rect":
      return {
        className: "Rect",
        attrs: {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
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
          ...(shape.filled ? { fill: shape.color } : { stroke: shape.color, strokeWidth: shape.strokeWidth }),
          listening: false,
        },
      };
    case "raster":
      return { className: "Image", attrs: { x: 0, y: 0, width: shape.width, height: shape.height, listening: false } };
  }
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
