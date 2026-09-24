"use client";

import type Konva from "konva";
import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Ellipse, Image as KImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { floodFill, hexToRgba } from "@/lib/design/flood-fill";
import { applyTransform, cachedImage, fontFamily, lineAttrs, loadImage, shapeKonva } from "@/lib/design/shapes";
import {
  LOGICAL_WIDTH,
  fontSizeFor,
  isEditable,
  logicalHeight,
  newId,
  type AreaDesign,
  type CanvasPrintArea,
  type DesignShape,
  type EditableShape,
  type RasterShape,
  type TextFont,
  type TextShape,
} from "@/lib/design/types";

export type Tool = "select" | "brush" | "eraser" | "text" | "fill" | "straight" | "rect" | "ellipse";

/** Flood fills are rasterized at this multiple of the logical size. */
const FILL_SCALE = 2;
const EMPTY_POINTS: number[] = [];
const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const ALL_ANCHORS = [...CORNERS, "top-center", "bottom-center", "middle-left", "middle-right"];
const FRAME_HIT = "__frame__";
const FRAME_COLOR = "#2563eb";

type Props = {
  area: CanvasPrintArea;
  design: AreaDesign;
  activeLayerId: string;
  tool: Tool;
  color: string;
  size: number;
  filled: boolean;
  font: TextFont;
  bold: boolean;
  shirtHex: string;
  onCommit: (next: AreaDesign) => void;
  onBlocked: (message: string) => void;
};

type Point = { x: number; y: number };
type Drawing =
  | { kind: "line"; pointerId: number; points: number[] }
  | { kind: "shape"; pointerId: number; start: Point }
  | { kind: "text"; pointerId: number; start: Point };
/** The text box open on the canvas: a new text (`id` null) or an existing one being edited. */
type TextEdit = Omit<TextShape, "id" | "kind"> & { id: string | null };

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

/** `extra` carries editor-only props (hit area, dragging, events) on top of the shared attributes. */
function ShapeNode({ shape, extra }: { shape: DesignShape; extra?: Record<string, unknown> }) {
  if (shape.kind === "raster") return <RasterNode shape={shape} />;
  const { className, attrs } = shapeKonva(shape);
  if (className === "Rect") return <Rect {...attrs} {...extra} />;
  if (className === "Ellipse") return <Ellipse {...(attrs as Konva.EllipseConfig)} {...extra} />;
  if (className === "Text") return <Text {...attrs} {...extra} />;
  return <Line {...attrs} {...extra} />;
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
 *
 * Shapes and texts get a dashed selection frame right after they are drawn (or when tapped with
 * the select tool): drag to move, corner handles to resize, the top handle to rotate.
 */
export function AreaStage(props: Props) {
  const { area, design, activeLayerId, tool, color, size, filled, font, bold, shirtHex, onCommit, onBlocked } = props;
  const boxRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const liveLineRef = useRef<Konva.Line>(null);
  const layerRefs = useRef(new Map<string, Konva.Layer>());
  const pointers = useRef(new Set<number>());
  const drawing = useRef<Drawing | null>(null);
  const busy = useRef(false);
  const editRef = useRef<TextEdit | null>(null);
  const [preview, setPreview] = useState<DesignShape | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textEdit, setTextEdit] = useState<TextEdit | null>(null);

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
  // Only a shape on the active, visible layer can stay selected (undo or a layer switch drops it).
  const selected = activeLayer?.visible
    ? activeLayer.shapes.find((s): s is EditableShape => s.id === selectedId && isEditable(s))
    : undefined;

  // Attach the selection frame to the selected Konva node.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const node = selected && !textEdit ? stageRef.current?.findOne((n: Konva.Node) => n.id() === selected.id) : undefined;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selected, textEdit, scale]);

  function removeShape(id: string) {
    onCommit({ layers: design.layers.map((l) => ({ ...l, shapes: l.shapes.filter((s) => s.id !== id) })) });
    setSelectedId(null);
  }

  // Delete / Backspace removes the selected shape.
  useEffect(() => {
    if (!selected || textEdit) return;
    function onKey(e: KeyboardEvent) {
      if ((e.key !== "Delete" && e.key !== "Backspace") || (e.target as HTMLElement)?.closest("input, textarea")) return;
      e.preventDefault();
      removeShape(selected!.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function toLogical(e: { clientX: number; clientY: number }): Point {
    const rect = surfaceRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  }

  function withShape(shape: DesignShape): AreaDesign {
    return {
      layers: design.layers.map((l) => (l.id === activeLayerId ? { ...l, shapes: [...l.shapes, shape] } : l)),
    };
  }

  function replaceShape(shape: DesignShape): AreaDesign {
    return {
      layers: design.layers.map((l) => ({ ...l, shapes: l.shapes.map((s) => (s.id === shape.id ? shape : s)) })),
    };
  }

  function cancelDrawing() {
    drawing.current = null;
    liveLineRef.current?.visible(false);
    liveLineRef.current?.getLayer()?.batchDraw();
    setPreview(null);
  }

  /** Saves a move/resize/rotate made with the selection frame (one undo step). */
  function commitTransform(shape: EditableShape, node: Konva.Node) {
    const next = applyTransform(shape, {
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation(),
    });
    // The scale is now baked into the shape's size, so the node goes back to scale 1.
    node.scale({ x: 1, y: 1 });
    onCommit(replaceShape(next));
  }

  function openTextEdit(edit: TextEdit) {
    editRef.current = edit;
    setTextEdit(edit);
    setSelectedId(null);
  }

  /** Closes the text box, saving its text (an emptied existing text is removed). */
  function finishTextEdit(save = true) {
    const edit = editRef.current;
    if (!edit) return;
    editRef.current = null;
    setTextEdit(null);
    const text = (textareaRef.current?.value ?? "").replace(/\s+$/, "");
    if (!save) return;
    if (edit.id) {
      const shape = design.layers.flatMap((l) => l.shapes).find((s) => s.id === edit.id);
      if (shape?.kind !== "text") return;
      if (!text.trim()) return removeShape(shape.id);
      if (text !== shape.text) onCommit(replaceShape({ ...shape, text }));
      setSelectedId(shape.id);
    } else if (text.trim()) {
      const shape: TextShape = { ...edit, id: newId(), kind: "text", text };
      onCommit(withShape(shape));
      setSelectedId(shape.id);
    }
  }

  /** Editor-only props for a shape: selectable ones listen for drags, the frame and double taps. */
  function editorProps(shape: DesignShape, layerActive: boolean): Record<string, unknown> | undefined {
    if (!layerActive || !isEditable(shape)) return undefined;
    const selectable = tool === "select" || shape.id === selected?.id;
    const unfilled = (shape.kind === "rect" || shape.kind === "ellipse") && !shape.filled;
    const editText = shape.kind === "text" ? () => openTextEdit({ ...shape }) : undefined;
    return {
      id: shape.id,
      listening: selectable,
      draggable: selectable,
      visible: textEdit?.id !== shape.id,
      // Thin lines and outlines are easy to grab, including inside an unfilled shape.
      hitStrokeWidth: 20,
      ...(unfilled && { fill: "rgba(0,0,0,0)" }),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => commitTransform(shape, e.target),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => commitTransform(shape, e.target),
      onDblClick: editText,
      onDblTap: editText,
    };
  }

  /** What Konva has under the pointer: the selection frame, a selectable shape's id, or nothing. */
  function hitTest(e: { clientX: number; clientY: number }): string | null {
    const stage = stageRef.current;
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!stage || !rect) return null;
    const hit = stage.getIntersection({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (!hit) return null;
    if (hit.getParent()?.getClassName() === "Transformer") return FRAME_HIT;
    return hit.id() || null;
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
    // Presses inside the open text box are typing, not drawing.
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    // The first touch/mouse pointer starts a fresh gesture, in case an `up` was ever missed.
    if (e.isPrimary) pointers.current.clear();
    pointers.current.add(e.pointerId);
    // A second finger means pinch/scroll intent, never drawing: drop the stroke in progress.
    if (pointers.current.size > 1) return cancelDrawing();
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Tapping outside an open text box just closes it.
    if (editRef.current) return finishTextEdit();

    // Presses on the frame or a selectable shape are handled by Konva (move / resize / rotate).
    const hit = hitTest(e);
    if (hit) {
      if (hit !== FRAME_HIT) setSelectedId(hit);
      return;
    }
    setSelectedId(null);
    if (tool === "select") return;
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
    // The text box opens on pointerup: tablets only show the keyboard for focus inside a tap.
    drawing.current = { kind: tool === "text" ? "text" : "shape", pointerId: e.pointerId, start: p };
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
    if (d.kind === "shape") setPreview(shapeFromDrag(tool, d.start, toLogical(e), color, size, filled));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    const d = drawing.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (e.type === "pointercancel") return cancelDrawing();

    if (d.kind === "text") {
      cancelDrawing();
      const fontSize = fontSizeFor(size);
      // The tap marks the middle of the first line.
      return openTextEdit({ id: null, x: d.start.x, y: d.start.y - fontSize / 2, text: "", fontSize, font, bold, color });
    }
    let shape: DesignShape | null = null;
    if (d.kind === "line") {
      shape = { id: newId(), kind: "line", points: [...d.points], color, strokeWidth: size, erase: tool === "eraser" };
    } else {
      const end = toLogical(e);
      if (Math.hypot(end.x - d.start.x, end.y - d.start.y) >= 2) {
        shape = shapeFromDrag(tool, d.start, end, color, size, filled);
      }
    }
    if (shape) {
      onCommit(withShape(shape));
      // A freshly drawn shape is selected right away, ready to be moved or resized.
      if (isEditable(shape)) setSelectedId(shape.id);
    }
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
          // Keep focus in the text box: a press on the canvas would otherwise blur it first.
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== "TEXTAREA") e.preventDefault();
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Stage ref={stageRef} width={displayW} height={displayH} scaleX={scale} scaleY={scale}>
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
                listening={layer.id === activeLayerId}
              >
                {layer.shapes.map((shape) => (
                  <ShapeNode key={shape.id} shape={shape} extra={editorProps(shape, layer.id === activeLayerId)} />
                ))}
                {layer.id === activeLayerId && (
                  <>
                    {preview && <ShapeNode shape={preview} />}
                    <Line ref={liveLineRef} points={EMPTY_POINTS} visible={false} listening={false} />
                  </>
                )}
              </Layer>
            ))}
            <Layer>
              <Transformer
                ref={transformerRef}
                borderStroke={FRAME_COLOR}
                borderDash={[6, 4]}
                anchorStroke={FRAME_COLOR}
                anchorFill="#ffffff"
                anchorSize={16}
                anchorCornerRadius={8}
                padding={6}
                rotateAnchorOffset={28}
                flipEnabled={false}
                keepRatio
                // Texts only scale evenly, from the corners.
                enabledAnchors={selected?.kind === "text" ? CORNERS : ALL_ANCHORS}
                // Don't let a shape shrink to nothing.
                boundBoxFunc={(oldBox, newBox) =>
                  (newBox.width < 8 && newBox.width < oldBox.width) || (newBox.height < 8 && newBox.height < oldBox.height)
                    ? oldBox
                    : newBox
                }
              />
            </Layer>
          </Stage>

          {textEdit && (
            <textarea
              ref={textareaRef}
              autoFocus
              defaultValue={textEdit.text}
              rows={1}
              wrap="off"
              aria-label="Nhập chữ"
              placeholder="Nhập chữ…"
              className="absolute min-w-16 resize-none overflow-hidden border-0 bg-transparent p-0 outline-2 outline-offset-2 outline-dashed outline-blue-600 placeholder:text-current placeholder:opacity-40"
              style={{
                left: textEdit.x * scale,
                top: textEdit.y * scale,
                color: textEdit.color,
                fontFamily: fontFamily(textEdit.font),
                fontWeight: textEdit.bold ? 700 : 400,
                fontSize: textEdit.fontSize * scale,
                lineHeight: 1.15,
                transform: textEdit.rotation ? `rotate(${textEdit.rotation}deg)` : undefined,
                transformOrigin: "top left",
              }}
              onFocus={(e) => autosize(e.currentTarget)}
              onInput={(e) => autosize(e.currentTarget)}
              onBlur={() => finishTextEdit()}
              onKeyDown={(e) => {
                if (e.key === "Escape") finishTextEdit(false);
                else if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  finishTextEdit();
                }
              }}
            />
          )}
        </div>
      )}

      {selected && !textEdit && (
        <div className="absolute top-0 right-0 flex gap-1 rounded-md border bg-background p-1 shadow-sm">
          <button
            type="button"
            onClick={() => removeShape(selected.id)}
            className="flex h-10 items-center gap-1.5 rounded px-3 text-sm hover:bg-muted"
          >
            <Trash2 className="size-4" /> Xóa hình
          </button>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="flex h-10 items-center rounded px-3 text-sm hover:bg-muted"
          >
            Xong
          </button>
        </div>
      )}
    </div>
  );
}

/** Grows the text box with its content (one line per row, no wrapping). */
function autosize(el: HTMLTextAreaElement) {
  el.style.width = "0";
  el.style.height = "0";
  el.style.width = `${el.scrollWidth + 4}px`;
  el.style.height = `${el.scrollHeight}px`;
}
