"use client";

import { useEffect } from "react";
import { loadCart, saveCart } from "@/lib/cart/actions";
import { useCart, type CartItem } from "@/lib/cart/store";
import type { DesignAreas } from "@/lib/design/types";

// FR26: keeps the browser cart and the buyer's saved cart in step.
// - Sign-in: a guest cart is merged into the account cart; another user's leftovers are dropped.
// - While signed in: every change is saved (debounced); unsaved changes survive a reload via `dirty`.
// - Sign-out: the browser cart is emptied.

type Cart = { items: CartItem[]; drafts: Record<string, DesignAreas> };

const SAVE_DELAY_MS = 600;

function whenHydrated(fn: () => void): () => void {
  if (useCart.persist.hasHydrated()) {
    fn();
    return () => {};
  }
  return useCart.persist.onFinishHydration(fn);
}

function merge(saved: Cart, local: Cart): Cart {
  const ids = new Set(saved.items.map((i) => i.id));
  return {
    items: [...saved.items, ...local.items.filter((i) => !ids.has(i.id))],
    drafts: { ...saved.drafts, ...local.drafts },
  };
}

/** Saves the current cart now. Used before sign-out so the last change isn't lost. */
export async function flushCart(): Promise<void> {
  const s = useCart.getState();
  if (!s.owner) return;
  const result = await saveCart({ items: s.items, drafts: s.drafts });
  if (result.ok && useCart.getState().items === s.items && useCart.getState().drafts === s.drafts) {
    useCart.setState({ dirty: false });
  }
}

export function CartSync({ customerId }: { customerId: string | null }) {
  useEffect(() => {
    let cancelled = false;
    let ready = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const save = () => {
      timer = undefined;
      flushCart().catch((err) => console.warn("Không lưu được giỏ hàng vào tài khoản", err));
    };

    const stopHydration = whenHydrated(async () => {
      const state = useCart.getState();
      if (!customerId) {
        if (state.owner) state.reset();
        return;
      }

      const result = await loadCart().catch(() => null);
      if (cancelled || !result?.ok) return;
      const saved = result.data as Cart;
      const s = useCart.getState();
      const local: Cart = { items: s.items, drafts: s.drafts };

      let next: Cart;
      if (s.owner === customerId) next = s.dirty ? local : saved;
      else if (s.owner === null) next = merge(saved, local);
      else next = saved;

      s.adopt(customerId, next);
      ready = true;
      if (next !== saved) save();
    });

    const unsubscribe = useCart.subscribe((s, prev) => {
      if (!ready || (s.items === prev.items && s.drafts === prev.drafts)) return;
      if (!s.dirty) useCart.setState({ dirty: true });
      clearTimeout(timer);
      timer = setTimeout(save, SAVE_DELAY_MS);
    });

    return () => {
      cancelled = true;
      stopHydration();
      unsubscribe();
      if (timer) {
        clearTimeout(timer);
        save();
      }
    };
  }, [customerId]);

  return null;
}
