import type { CanvasPrintArea } from "@/lib/design/types";

// The shirt mockup (FR04): photos of the black shirt in public/mockup, front and back cut to the
// same 900×943 box. Print areas are placed on it by their centre (`xPct`/`yPct` of the box) and
// their real size in cm.

export const MOCKUP_WIDTH = 900;
export const MOCKUP_HEIGHT = 943;
/** Torso edges below the sleeves in the photos, and the chest width they stand for. */
const TORSO_LEFT = 174;
const TORSO_RIGHT = 726;
const SHIRT_WIDTH_CM = 54;
const UNITS_PER_CM = (TORSO_RIGHT - TORSO_LEFT) / SHIRT_WIDTH_CM;

/** True for dark shirt colours; those use the black shirt photo. */
function isDark(hex: string): boolean {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 < 0.35;
}

/** Flat drawing for light colours (the photo is black), fitted into the same box. */
function drawnShirtSvg(side: "front" | "back", hex: string): string {
  const neck = side === "front" ? 22 : 7;
  const outline = `M140 30 Q200 ${30 + neck * 2} 260 30 L330 45 L385 110 L345 135 L305 105 L305 310 L95 310 L95 105 L55 135 L15 110 L70 45 Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MOCKUP_WIDTH} ${MOCKUP_HEIGHT}">
<g transform="translate(0 100) scale(2.25)">
<path d="${outline}" fill="${hex}" stroke="rgba(0,0,0,0.3)" stroke-width="2" stroke-linejoin="round"/>
<path d="M140 30 Q200 ${30 + neck * 2} 260 30" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="6"/>
</g>
</svg>`;
}

/** The shirt picture for a side and colour: the photo for dark colours, a drawing otherwise. */
export function shirtImageUrl(side: "front" | "back", hex: string): string {
  if (isDark(hex)) return `/mockup/shirt-${side}.webp`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawnShirtSvg(side, hex))}`;
}

/** Where a print area sits on the mockup, in mockup units. */
export function areaOnMockup(area: CanvasPrintArea) {
  const width = area.widthCm * UNITS_PER_CM;
  const height = area.heightCm * UNITS_PER_CM;
  return {
    x: area.xPct * MOCKUP_WIDTH - width / 2,
    y: area.yPct * MOCKUP_HEIGHT - height / 2,
    width,
    height,
  };
}
