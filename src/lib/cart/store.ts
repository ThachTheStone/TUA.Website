"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { newId, type DesignAreas } from "@/lib/design/types";

// FR06: the cart lives in localStorage. It holds no prices: the server recomputes every
// amount from `settings` at checkout (hard rule 4). Custom shirts keep their design as JSON
// so the customer can reopen and edit it. Prototype lines keep only the prototype id; the
// server takes the colour and print files from the prototype itself.

export type CartItem = {
  id: string;
  type: "PLAIN" | "CUSTOM" | "PROTOTYPE";
  /** settings.colors[].key. PROTOTYPE: a copy of the prototype's colour, for display only. */
  color: string;
  size: string;
  quantity: number;
  designDraftId?: string;
  /** PROTOTYPE only (FR27). */
  prototypeId?: string;
};

/** The design currently open in the canvas, kept so a reload doesn't lose the drawing. */
export type DesignWip = { editingItemId: string | null; color: string; size: string; areas: DesignAreas };

type CartState = {
  items: CartItem[];
  drafts: Record<string, DesignAreas>;
  wip: DesignWip | null;
  /** FR26: customer id whose saved cart this is; null for a guest cart. */
  owner: string | null;
  /** Local changes not yet saved to the owner's account. */
  dirty: boolean;
  addPlain: (input: { color: string; size: string; quantity: number }) => void;
  /** FR06: the same prototype in the same size merges into one line. */
  addPrototype: (input: { prototypeId: string; color: string; size: string; quantity: number }) => void;
  /** Adds a custom shirt, or updates `wip.editingItemId` when the customer reopened one. */
  saveCustom: (input: { itemId: string | null; color: string; size: string; areas: DesignAreas }) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  setWip: (wip: DesignWip | null) => void;
  /** Empties the cart after an order was placed (keeps nothing of the old designs). */
  clear: () => void;
  /** Replaces the cart with the account's cart after sign-in. */
  adopt: (owner: string, cart: { items: CartItem[]; drafts: Record<string, DesignAreas> }) => void;
  /** Sign-out: forget everything on this device (the account keeps its copy). */
  reset: () => void;
};

export const MAX_QUANTITY = 50;

// localStorage can be missing (private mode) or full (large fill images); never crash on it.
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (err) {
      console.warn("Không lưu được giỏ hàng vào trình duyệt", err);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

const clampQty = (n: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.floor(n) || 1));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      drafts: {},
      wip: null,
      owner: null,
      dirty: false,

      addPlain: ({ color, size, quantity }) =>
        set((s) => {
          const same = s.items.find((i) => i.type === "PLAIN" && i.color === color && i.size === size);
          if (same) {
            return {
              items: s.items.map((i) => (i === same ? { ...i, quantity: clampQty(i.quantity + quantity) } : i)),
            };
          }
          return { items: [...s.items, { id: newId(), type: "PLAIN", color, size, quantity: clampQty(quantity) }] };
        }),

      addPrototype: ({ prototypeId, color, size, quantity }) =>
        set((s) => {
          const same = s.items.find((i) => i.type === "PROTOTYPE" && i.prototypeId === prototypeId && i.size === size);
          if (same) {
            return {
              items: s.items.map((i) => (i === same ? { ...i, color, quantity: clampQty(i.quantity + quantity) } : i)),
            };
          }
          return {
            items: [...s.items, { id: newId(), type: "PROTOTYPE", prototypeId, color, size, quantity: clampQty(quantity) }],
          };
        }),

      saveCustom: ({ itemId, color, size, areas }) =>
        set((s) => {
          const existing = itemId ? s.items.find((i) => i.id === itemId && i.type === "CUSTOM") : undefined;
          if (existing?.designDraftId) {
            return {
              items: s.items.map((i) => (i === existing ? { ...i, color, size } : i)),
              drafts: { ...s.drafts, [existing.designDraftId]: areas },
              wip: null,
            };
          }
          const draftId = newId();
          return {
            items: [...s.items, { id: newId(), type: "CUSTOM", color, size, quantity: 1, designDraftId: draftId }],
            drafts: { ...s.drafts, [draftId]: areas },
            wip: null,
          };
        }),

      setQuantity: (itemId, quantity) =>
        set((s) => ({ items: s.items.map((i) => (i.id === itemId ? { ...i, quantity: clampQty(quantity) } : i)) })),

      removeItem: (itemId) =>
        set((s) => {
          const item = s.items.find((i) => i.id === itemId);
          const drafts = { ...s.drafts };
          if (item?.designDraftId) delete drafts[item.designDraftId];
          return { items: s.items.filter((i) => i.id !== itemId), drafts };
        }),

      setWip: (wip) => set({ wip }),

      clear: () => set({ items: [], drafts: {} }),

      adopt: (owner, { items, drafts }) => set({ owner, items, drafts, dirty: false }),

      reset: () => set({ items: [], drafts: {}, wip: null, owner: null, dirty: false }),
    }),
    { name: "tua-cart", version: 1, storage: createJSONStorage(() => safeStorage) },
  ),
);
