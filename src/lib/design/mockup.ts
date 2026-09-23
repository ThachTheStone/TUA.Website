import type { CanvasPrintArea } from "@/lib/design/types";

// A flat T-shirt drawing used as the mockup (FR04). Print areas are placed on it by their
// centre (`xPct`/`yPct` of the mockup box) and their real size in cm.

export const MOCKUP_WIDTH = 400;
export const MOCKUP_HEIGHT = 330;
const TORSO_LEFT = 95;
const TORSO_RIGHT = 305;
/** Assumed chest width of the drawn shirt; only used to scale areas on the mockup. */
const SHIRT_WIDTH_CM = 54;
const UNITS_PER_CM = (TORSO_RIGHT - TORSO_LEFT) / SHIRT_WIDTH_CM;

function outline(neckDepth: number) {
  return [
    "M140 30",
    `Q200 ${30 + neckDepth * 2} 260 30`,
    "L330 45 L385 110 L345 135 L305 105",
    `L${TORSO_RIGHT} 310 L${TORSO_LEFT} 310 L${TORSO_LEFT} 105`,
    "L55 135 L15 110 L70 45 Z",
  ].join(" ");
}

export function shirtSvg(side: "front" | "back", hex: string): string {
  const neck = side === "front" ? 22 : 7;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MOCKUP_WIDTH} ${MOCKUP_HEIGHT}">
<path d="${outline(neck)}" fill="${hex}" stroke="rgba(0,0,0,0.3)" stroke-width="2" stroke-linejoin="round"/>
<path d="M140 30 Q200 ${30 + neck * 2} 260 30" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="6"/>
<path d="M95 105 L95 300 M305 105 L305 300" stroke="rgba(0,0,0,0.06)" stroke-width="10"/>
</svg>`;
}

export function shirtSvgUrl(side: "front" | "back", hex: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(shirtSvg(side, hex))}`;
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
