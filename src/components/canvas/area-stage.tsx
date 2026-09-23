"use client";

import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Ellipse, Image as KImage, Layer, Line, Rect, Stage } from "react-konva";
import { floodFill, hexToRgba } from "@/lib/design/flood-fill";
import { cachedImage, lineAttrs, loadImage, shapeKonva } from "@/lib/design/shapes";
import {
  LOGICAL_WIDTH,
  logicalHeight,
  newId,
  type AreaDesign,
  type CanvasPrintArea,
  type DesignShape,
  type RasterShape,
} from "@/lib/design/types";

export type Tool = "brush" | "eraser" | "rect" | "ellipse" | "straight" | "fill";

/** Flood fills are rasterized at this multiple of the logical size. */
const FILL_SCALE = 2;
const EMPTY_POINTS: number[] = [];

type Props = {
  area: CanvasPrintArea;
  design: AreaDesign;
  activeLayerId: string;
  tool: Tool;
  color: string;
  size: number;
  filled: boolean;
  shirtHex: string;
  onCommit: (next: AreaDesign) => void;
  onBlocked: (message: string) => void;
};

type Point = { x: number; y: number };
type Drawing =
  | { kind: "line"; pointerId: number; points: number[] }
  | { kind: "shape"; pointerId: number; start: Point };

function RasterNode({ shape }: { shape: RasterShape }) {
  const [image, setImage] = useState(() => cachedImage(shape.src));
  useEffect(() => {
    if (image?.src === shape.src) return;
    let alive = true;
    loadImage(shape.src).then((img) => alive && setImage(img)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [shape.src, image]);
  return image ? <KImage image={image} {...shapeKonva(shape).attrs} /> : null;
}

function ShapeNode({ shape }: { shape: DesignShape }) {
  if (shape.kind === "raster") return <RasterNode shape={shape} />;
  const { className, attrs } = shapeKonva(shape);
  if (className === "Rect") return <Rect {...attrs} />;
  if (className === "Ellipse") return <Ellipse {...(attrs as Konva.EllipseConfig)} />;
  return <Line {...attrs} />;
}

function shapeFromDrag(tool: Tool, a: Point, b: Point, color: string, size: number, filled: boolean): DesignShape | null {
  const id = newId();
  if (tool === "straight") {
    return { id, kind: "straight", points: [a.x, a.y, b.x, b.y], color, strokeWidth: size };
  }
  const width = Math.abs(b.x - a.x);
  const height = Math.abs(b.y - a.y);
  if (tool === "rect") {
    return { id, kind: "rect", x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width, height, color, strokeWidth: size, filled };
  }
  if (tool === "ellipse") {
    return {
      id,
      kind: "ellipse",
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      radiusX: width / 2,
      radiusY: height / 2,
      color,
      strokeWidth: size,
      filled,
    };
  }
  return null;
}

/**
 * One print area as a drawing surface (FR03). The stage *is* the print area, so strokes
 * outside it are clipped. Brush strokes mutate a Konva node directly and are committed to
 * React state only on pointerup, to keep stroke latency low on tablets (NFR01).
 */
export function AreaStage({ area, design, activeLayerId, tool, color, size, filled, shirtHex, onCommit, onBlocked }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const liveLineRef = useRef<Konva.Line>(null);
  const layerRefs = useRef(new Map<string, Konva.Layer>());
  const pointers = useRef(new Set<number>());
  const drawing = useRef<Drawing | null>(null);
  const busy = useRef(false);
  const [preview, setPreview] = useState<DesignShape | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  const height = logicalHeight(area);
  const scale = box.width && box.height ? Math.min(box.width / LOGICAL_WIDTH, box.height / height) : 0;
  const displayW = Math.floor(LOGICAL_WIDTH * scale);
  const displayH = Math.floor(height * scale);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const activeLayer = design.layers.find((l) => l.id === activeLayerId);

  function toLogical(e: { clientX: number; clientY: number }): Point {
    const rect = surfaceRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  }

  function withShape(shape: DesignShape): AreaDesign {
    return {
      layers: design.layers.map((l) => (l.id === activeLayerId ? { ...l, shapes: [...l.shapes, shape] } : l)),
    };
  }

  function cancelDrawing() {
    drawing.current = null;
    liveLineRef.current?.visible(false);
    liveLineRef.current?.getLayer()?.batchDraw();
    setPreview(null);
  }

  async function fillAt(p: Point) {
    const layer = layerRefs.current.get(activeLayerId);
    if (!layer || busy.current) return;
    busy.current = true;
    try {
      const canvas = layer.toCanvas({
        x: 0,
        y: 0,
        width: displayW,
        height: displayH,
        pixelRatio: (LOGICAL_WIDTH * FILL_SCALE) / displayW,
      });
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const sx = (p.x * canvas.width) / LOGICAL_WIDTH;
      const sy = (p.y * canvas.height) / height;
      if (!floodFill(image, sx, sy, hexToRgba(color))) return;
      ctx.putImageData(image, 0, 0);
      const src = canvas.toDataURL("image/png");
      await loadImage(src);
      const raster: RasterShape = { id: newId(), kind: "raster", src, width: LOGICAL_WIDTH, height };
      onCommit({ layers: design.layers.map((l) => (l.id === activeLayerId ? { ...l, shapes: [raster] } : l)) });
    } finally {
      busy.current = false;
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // The first touch/mouse pointer starts a fresh gesture, in case an `up` was ever missed.
    if (e.isPrimary) pointers.current.clear();
    pointers.current.add(e.pointerId);
    // A second finger means pinch/scroll intent, never drawing: drop the stroke in progress.
    if (pointers.current.size > 1) return cancelDrawing();
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!activeLayer) return;
    if (!activeLayer.visible) return onBlocked("Lớp đang bị ẩn. Hãy hiện lớp này hoặc chọn lớp khác để vẽ.");

    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toLogical(e);

    if (tool === "fill") {
      void fillAt(p);
      return;
    }
    if (tool === "brush" || tool === "eraser") {
      const points = [p.x, p.y, p.x + 0.01, p.y + 0.01];
      drawing.current = { kind: "line", pointerId: e.pointerId, points };
      const line = liveLineRef.current;
      if (line) {
        line.setAttrs({ ...lineAttrs({ points, color, strokeWidth: size, erase: tool === "eraser" }), visible: true });
        line.moveToTop();
        line.getLayer()?.batchDraw();
      }
      return;
    }
    drawing.current = { kind: "shape", pointerId: e.pointerId, start: p };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drawing.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (d.kind === "line") {
      const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
      for (const ev of events.length ? events : [e.nativeEvent]) {
        const p = toLogical(ev);
        d.points.push(p.x, p.y);
      }
      const line = liveLineRef.current;
      line?.points(d.points);
      line?.getLayer()?.batchDraw();
      return;
    }
    setPreview(shapeFromDrag(tool, d.start, toLogical(e), color, size, filled));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    const d = drawing.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (e.type === "pointercancel") return cancelDrawing();

    let shape: DesignShape | null = null;
    if (d.kind === "line") {
      shape = { id: newId(), kind: "line", points: [...d.points], color, strokeWidth: size, erase: tool === "eraser" };
    } else {
      const end = toLogical(e);
      if (Math.hypot(end.x - d.start.x, end.y - d.start.y) >= 2) {
        shape = shapeFromDrag(tool, d.start, end, color, size, filled);
      }
    }
    if (shape) onCommit(withShape(shape));
    cancelDrawing();
  }

  return (
    <div ref={boxRef} className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center">
      {scale > 0 && (
        <div
          ref={surfaceRef}
          className="relative shadow-sm outline-2 outline-offset-2 outline-dashed outline-foreground/40 select-none"
          style={{ width: displayW, height: displayH, background: shirtHex, touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Stage width={displayW} height={displayH} scaleX={scale} scaleY={scale} listening={false}>
            {design.layers.map((layer) => (
              <Layer
                key={layer.id}
                ref={(node) => {
                  if (node) layerRefs.current.set(layer.id, node);
                  else layerRefs.current.delete(layer.id);
                }}
                visible={layer.visible}
                clipX={0}
                clipY={0}
                clipWidth={LOGICAL_WIDTH}
                clipHeight={height}
                listening={false}
              >
                {layer.shapes.map((shape) => (
                  <ShapeNode key={shape.id} shape={shape} />
                ))}
                {layer.id === activeLayerId && (
                  <>
                    {preview && <ShapeNode shape={preview} />}
                    <Line ref={liveLineRef} points={EMPTY_POINTS} visible={false} listening={false} />
                  </>
                )}
              </Layer>
            ))}
          </Stage>
        </div>
      )}
    </div>
  );
}
