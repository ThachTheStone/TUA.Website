"use client";

import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_LAYERS, newLayer, type AreaDesign } from "@/lib/design/types";
import { cn } from "@/lib/utils";

type Props = {
  design: AreaDesign;
  activeLayerId: string;
  onSelect: (layerId: string) => void;
  onChange: (next: AreaDesign) => void;
};

const ICON_BTN = "flex size-11 items-center justify-center rounded-md hover:bg-muted disabled:opacity-30";

/** FR03 layers: add, delete, show/hide, reorder. Listed top layer first. */
export function LayersPanel({ design, activeLayerId, onSelect, onChange }: Props) {
  const { layers } = design;

  function add() {
    if (layers.length >= MAX_LAYERS) return;
    const nextIndex = Math.max(0, ...layers.map((l) => Number(l.name.replace(/\D/g, "")) || 0)) + 1;
    const layer = newLayer(nextIndex);
    onChange({ layers: [...layers, layer] });
    onSelect(layer.id);
  }

  function remove(id: string) {
    const layer = layers.find((l) => l.id === id);
    if (!layer || layers.length <= 1) return;
    if (layer.shapes.length && !window.confirm(`Xóa "${layer.name}" cùng toàn bộ nét vẽ trên lớp?`)) return;
    const rest = layers.filter((l) => l.id !== id);
    onChange({ layers: rest });
    if (id === activeLayerId) onSelect(rest[rest.length - 1].id);
  }

  function toggle(id: string) {
    onChange({ layers: layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)) });
  }

  /** `dir` 1 = move up (towards the front), -1 = down. */
  function move(id: string, dir: 1 | -1) {
    const i = layers.findIndex((l) => l.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= layers.length) return;
    const next = [...layers];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ layers: next });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Lớp ({layers.length}/{MAX_LAYERS})
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={layers.length >= MAX_LAYERS}>
          <Plus /> Thêm lớp
        </Button>
      </div>
      <ul className="flex flex-col gap-1">
        {[...layers].reverse().map((layer, idx) => {
          const index = layers.length - 1 - idx;
          const active = layer.id === activeLayerId;
          return (
            <li
              key={layer.id}
              className={cn(
                "flex items-center rounded-md border pl-1",
                active ? "border-primary bg-primary/5" : "border-transparent bg-muted/40",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(layer.id)}
                className={cn("h-11 flex-1 truncate px-2 text-left text-sm", active && "font-semibold")}
              >
                {layer.name}
                {!layer.visible && <span className="ml-1 text-xs text-muted-foreground">(đang ẩn)</span>}
              </button>
              <button
                type="button"
                className={ICON_BTN}
                onClick={() => toggle(layer.id)}
                aria-label={layer.visible ? "Ẩn lớp" : "Hiện lớp"}
                title={layer.visible ? "Ẩn lớp" : "Hiện lớp"}
              >
                {layer.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
              <button
                type="button"
                className={ICON_BTN}
                onClick={() => move(layer.id, 1)}
                disabled={index === layers.length - 1}
                aria-label="Đưa lên trên"
                title="Đưa lên trên"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                className={ICON_BTN}
                onClick={() => move(layer.id, -1)}
                disabled={index === 0}
                aria-label="Đưa xuống dưới"
                title="Đưa xuống dưới"
              >
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                className={ICON_BTN}
                onClick={() => remove(layer.id)}
                disabled={layers.length <= 1}
                aria-label="Xóa lớp"
                title="Xóa lớp"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
