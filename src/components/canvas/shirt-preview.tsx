"use client";

/* eslint-disable @next/next/no-img-element -- data URLs generated in the browser */
import { useEffect, useState } from "react";
import { renderAreaPreviews } from "@/lib/design/export";
import { MOCKUP_HEIGHT, MOCKUP_WIDTH, areaOnMockup, shirtSvgUrl } from "@/lib/design/mockup";
import type { CanvasPrintArea, DesignAreas } from "@/lib/design/types";

type Props = {
  areas: DesignAreas;
  printAreas: CanvasPrintArea[];
  colorHex: string;
  /** Delay before re-rendering after the design changes. */
  debounceMs?: number;
};

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** FR04: the drawing on the shirt mockup, front and back, in the chosen colour. */
export function ShirtPreview({ areas, printAreas, colorHex, debounceMs = 400 }: Props) {
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      renderAreaPreviews(areas, printAreas, 300)
        .then((next) => alive && setImages(next))
        .catch((err) => console.error("Không tạo được bản xem trước", err));
    }, debounceMs);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [areas, printAreas, debounceMs]);

  return (
    <div className="grid grid-cols-2 gap-2">
      {(["front", "back"] as const).map((side) => (
        <figure key={side} className="flex flex-col items-center gap-1">
          <div className="relative w-full" style={{ aspectRatio: `${MOCKUP_WIDTH} / ${MOCKUP_HEIGHT}` }}>
            <img src={shirtSvgUrl(side, colorHex)} alt="" className="absolute inset-0 size-full" />
            {printAreas
              .filter((a) => a.side === side && images[a.key])
              .map((a) => {
                const r = areaOnMockup(a);
                return (
                  <img
                    key={a.key}
                    src={images[a.key]}
                    alt={a.label}
                    className="absolute"
                    style={{
                      left: pct(r.x, MOCKUP_WIDTH),
                      top: pct(r.y, MOCKUP_HEIGHT),
                      width: pct(r.width, MOCKUP_WIDTH),
                      height: pct(r.height, MOCKUP_HEIGHT),
                    }}
                  />
                );
              })}
          </div>
          <figcaption className="text-xs text-muted-foreground">{side === "front" ? "Mặt trước" : "Mặt sau"}</figcaption>
        </figure>
      ))}
    </div>
  );
}
