"use client";

import { Bold, Brush, Circle, Eraser, ImagePlus, Loader2, Minus, MousePointer2, PaintBucket, Square, Type } from "lucide-react";
import type { Tool } from "@/components/canvas/area-stage";
import { TEXT_FONTS, textFont, type TextFont } from "@/lib/design/fonts";
import { BRUSH_MAX, BRUSH_MIN } from "@/lib/design/types";
import { cn } from "@/lib/utils";

const TOOLS: { tool: Tool; label: string; Icon: typeof Brush }[] = [
  { tool: "select", label: "Chọn, di chuyển, phóng to/thu nhỏ", Icon: MousePointer2 },
  { tool: "brush", label: "Cọ vẽ", Icon: Brush },
  { tool: "eraser", label: "Cục tẩy", Icon: Eraser },
  { tool: "text", label: "Chữ", Icon: Type },
  { tool: "fill", label: "Tô màu", Icon: PaintBucket },
  { tool: "straight", label: "Đường thẳng", Icon: Minus },
  { tool: "rect", label: "Hình chữ nhật", Icon: Square },
  { tool: "ellipse", label: "Hình tròn", Icon: Circle },
];

// Drawing colours only; shirt colours come from settings.
const SWATCHES = [
  "#111111", "#ffffff", "#9ca3af", "#ef4444", "#f97316", "#facc15",
  "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#92400e",
];

type Props = {
  tool: Tool;
  onTool: (tool: Tool) => void;
  color: string;
  onColor: (color: string) => void;
  size: number;
  onSize: (size: number) => void;
  filled: boolean;
  onFilled: (filled: boolean) => void;
  font: TextFont;
  onFont: (font: TextFont) => void;
  bold: boolean;
  onBold: (bold: boolean) => void;
  /** "Chèn ảnh" (BR01): opens the file picker, or a login prompt when signed out. */
  onInsertImage: () => void;
  inserting: boolean;
};

const TAP = "flex size-10 shrink-0 items-center justify-center rounded-md border transition-colors sm:size-11";

export function Toolbar(props: Props) {
  const { tool, onTool, color, onColor, size, onSize, filled, onFilled, font, onFont, bold, onBold, onInsertImage, inserting } = props;
  const isShape = tool === "rect" || tool === "ellipse";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-background px-3 py-1.5 sm:py-2">
      <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Công cụ">
        {TOOLS.map(({ tool: t, label, Icon }) => (
          <button
            key={t}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={tool === t}
            onClick={() => onTool(t)}
            className={cn(TAP, tool === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            <Icon className="size-5" />
          </button>
        ))}
      </div>

      <button
        type="button"
        title="Chèn ảnh hoặc sticker từ thiết bị"
        onClick={onInsertImage}
        disabled={inserting}
        className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary sm:h-11 px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/85 disabled:opacity-60"
      >
        {inserting ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
        {inserting ? "Đang tải ảnh…" : "Chèn ảnh"}
      </button>

      {isShape && (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onFilled(false)}
            className={cn(TAP, "w-auto px-3 text-sm", !filled ? "border-primary bg-muted font-medium" : "hover:bg-muted")}
          >
            Viền
          </button>
          <button
            type="button"
            onClick={() => onFilled(true)}
            className={cn(TAP, "w-auto px-3 text-sm", filled ? "border-primary bg-muted font-medium" : "hover:bg-muted")}
          >
            Tô đặc
          </button>
        </div>
      )}

      {tool === "text" && (
        <div className="flex flex-wrap items-center gap-1">
          <select
            value={font}
            onChange={(e) => onFont(e.target.value as TextFont)}
            className="h-11 rounded-md border bg-background px-2 text-sm"
            aria-label="Kiểu chữ"
          >
            {TEXT_FONTS.map((f) => (
              <option key={f.key} value={f.key} style={{ fontFamily: f.family }}>
                {f.vi ? f.label : `${f.label} (không dấu)`}
              </option>
            ))}
          </select>
          <button
            type="button"
            title="Chữ đậm"
            aria-label="Chữ đậm"
            aria-pressed={bold}
            onClick={() => onBold(!bold)}
            className={cn(TAP, bold ? "border-primary bg-muted" : "hover:bg-muted")}
          >
            <Bold className="size-5" />
          </button>
          {!textFont(font).vi && (
            <span className="max-w-44 text-xs leading-tight text-amber-700 dark:text-amber-400">
              Kiểu chữ này không có dấu tiếng Việt; chữ có dấu sẽ hiển thị bằng kiểu khác.
            </span>
          )}
        </div>
      )}

      <label className="flex min-w-40 flex-1 items-center gap-2 text-sm sm:max-w-60">
        <span className="shrink-0 text-muted-foreground">Cỡ</span>
        <input
          type="range"
          min={BRUSH_MIN}
          max={BRUSH_MAX}
          value={size}
          onChange={(e) => onSize(Number(e.target.value))}
          className="h-11 flex-1 accent-primary"
          aria-label={tool === "text" ? "Cỡ chữ" : "Kích thước cọ"}
        />
        <span className="w-6 text-right tabular-nums">{size}</span>
      </label>

      <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto" aria-label="Bảng màu">
        {SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={`Màu ${hex}`}
            onClick={() => onColor(hex)}
            className={cn(
              "size-8 rounded-full border-2 shadow-sm sm:size-9",
              color.toLowerCase() === hex ? "border-primary ring-2 ring-primary ring-offset-1" : "border-border",
            )}
            style={{ background: hex }}
          />
        ))}
        <label
          className="relative flex size-8 cursor-pointer sm:size-9 items-center justify-center overflow-hidden rounded-full border-2 border-dashed"
          title="Chọn màu khác"
        >
          <span className="size-5 rounded-full" style={{ background: color }} />
          <input
            type="color"
            value={color}
            onChange={(e) => onColor(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Chọn màu khác"
          />
        </label>
      </div>
    </div>
  );
}
