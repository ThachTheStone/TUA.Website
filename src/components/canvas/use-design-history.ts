"use client";

import { useCallback, useState } from "react";
import { HISTORY_LIMIT, type AreaDesign, type DesignAreas } from "@/lib/design/types";

// Undo/redo per print area (FR03). Area designs are immutable, so a history entry is just
// a reference to the previous object; no deep copies needed.

type HistoryState = {
  areas: DesignAreas;
  past: Record<string, AreaDesign[]>;
  future: Record<string, AreaDesign[]>;
};

export function useDesignHistory(initial: () => DesignAreas) {
  const [state, setState] = useState<HistoryState>(() => ({ areas: initial(), past: {}, future: {} }));

  const commit = useCallback((key: string, next: AreaDesign) => {
    setState((s) => {
      const prev = s.areas[key];
      if (prev === next) return s;
      const past = [...(s.past[key] ?? []), prev].slice(-HISTORY_LIMIT);
      return {
        areas: { ...s.areas, [key]: next },
        past: { ...s.past, [key]: past },
        future: { ...s.future, [key]: [] },
      };
    });
  }, []);

  const undo = useCallback((key: string) => {
    setState((s) => {
      const past = s.past[key] ?? [];
      if (!past.length) return s;
      return {
        areas: { ...s.areas, [key]: past[past.length - 1] },
        past: { ...s.past, [key]: past.slice(0, -1) },
        future: { ...s.future, [key]: [s.areas[key], ...(s.future[key] ?? [])] },
      };
    });
  }, []);

  const redo = useCallback((key: string) => {
    setState((s) => {
      const [next, ...rest] = s.future[key] ?? [];
      if (!next) return s;
      return {
        areas: { ...s.areas, [key]: next },
        past: { ...s.past, [key]: [...(s.past[key] ?? []), s.areas[key]].slice(-HISTORY_LIMIT) },
        future: { ...s.future, [key]: rest },
      };
    });
  }, []);

  return {
    areas: state.areas,
    commit,
    undo,
    redo,
    canUndo: (key: string) => (state.past[key]?.length ?? 0) > 0,
    canRedo: (key: string) => (state.future[key]?.length ?? 0) > 0,
  };
}
