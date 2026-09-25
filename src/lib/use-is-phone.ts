"use client";

import { useSyncExternalStore } from "react";

// FR03, NFR02: self-design needs a computer or tablet. A phone is a device whose shorter
// screen side is under 600 CSS px (so rotating a phone doesn't unlock the canvas).

export const PHONE_MAX_SHORT_SIDE = 600;

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

const isPhone = () => Math.min(window.screen.width, window.screen.height) < PHONE_MAX_SHORT_SIDE;

/** True on phones, false on tablets/computers, null during SSR and the hydration render. */
export function useIsPhone(): boolean | null {
  return useSyncExternalStore(subscribe, isPhone, () => null);
}
