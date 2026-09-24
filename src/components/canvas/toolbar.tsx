"use client";

import { Bold, Brush, Circle, Eraser, Minus, MousePointer2, PaintBucket, Square, Type } from "lucide-react";
import type { Tool } from "@/components/canvas/area-stage";
import { BRUSH_MAX, BRUSH_MIN, TEXT_FONTS, type TextFont } from "@/lib/design/types";
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
};

const TAP = "flex size-11 shrink-0 items-center justify-center rounded-md border transition-colors";

export function Toolbar(props: Props) {
  const { tool, onTool, color, onColor, size, onSize, filled, onFilled, font, onFont, bold, onBold } = props;
  const isShape = tool === "rect" || tool === "ellipse";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t bg-background px-3 py-2">
      <div className="flex gap-1" role="toolbar" aria-label="Công cụ">
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
        <div className="flex gap-1">
          <select
            value={font}
            onChange={(e) => onFont(e.target.value as TextFont)}
            className="h-11 rounded-md border bg-background px-2 text-sm"
            aria-label="Kiểu chữ"
          >
            {TEXT_FONTS.map((f) => (
              <option key={f.key} value={f.key} style={{ fontFamily: f.family }}>
                {f.label}
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

      <div className="flex flex-wrap items-center gap-1" aria-label="Bảng màu">
        {SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={`Màu ${hex}`}
            onClick={() => onColor(hex)}
            className={cn(
              "size-9 rounded-full border-2 shadow-sm",
              color.toLowerCase() === hex ? "border-primary ring-2 ring-primary ring-offset-1" : "border-border",
            )}
            style={{ background: hex }}
          />
        ))}
        <label
          className="relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed"
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
