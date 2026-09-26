// Inventory helpers shared by server and client. Blank shirt stock is tracked per
// colour × size; a colour/size without a row is not tracked (unlimited).

/** Shirts left per tracked colour × size, keyed by `stockKey`. */
export type ShirtStock = Record<string, number>;

export const stockKey = (color: string, size: string) => `${color}|${size}`;

/** Shirts left for one colour × size, or null when it isn't tracked. */
export function shirtsLeft(stock: ShirtStock, color: string, size: string): number | null {
  return stockKey(color, size) in stock ? stock[stockKey(color, size)] : null;
}

type CartLine = { id: string; type: string; color: string; size: string; quantity: number; prototypeId?: string };

/**
 * Before adding `quantity` shirts to the cart: is there enough left once the lines already
 * in the cart are counted? `replaceId` is a line being replaced (re-edited design).
 */
export function addToCartProblem(
  cart: CartLine[],
  stock: ShirtStock,
  add: { color: string; size: string; quantity: number; prototypeId?: string; prototypeLeft?: number | null; replaceId?: string },
): string | null {
  const lines = cart.filter((i) => i.type !== "BLINDBOX" && i.id !== add.replaceId);
  const shirts = shirtsLeft(stock, add.color, add.size);
  if (shirts !== null) {
    const inCart = lines.filter((i) => i.color === add.color && i.size === add.size).reduce((n, i) => n + i.quantity, 0);
    if (inCart + add.quantity > shirts) {
      if (shirts <= 0) return `Size ${add.size} màu này đã hết hàng`;
      return inCart
        ? `Size ${add.size} màu này chỉ còn ${shirts} áo, giỏ hàng đã có ${inCart} áo`
        : `Size ${add.size} màu này chỉ còn ${shirts} áo`;
    }
  }
  if (add.prototypeId && add.prototypeLeft != null) {
    const inCart = lines.filter((i) => i.prototypeId === add.prototypeId).reduce((n, i) => n + i.quantity, 0);
    if (inCart + add.quantity > add.prototypeLeft) {
      if (add.prototypeLeft <= 0) return "Mẫu áo này đã hết hàng";
      return inCart
        ? `Mẫu áo này chỉ còn ${add.prototypeLeft} áo, giỏ hàng đã có ${inCart} áo`
        : `Mẫu áo này chỉ còn ${add.prototypeLeft} áo`;
    }
  }
  return null;
}

/** The most that can be ordered of one line: the tighter of blank stock and prototype cap. */
export function maxOrderable(
  stock: ShirtStock,
  color: string,
  size: string,
  prototypeLeft: number | null = null,
): number | null {
  const shirts = shirtsLeft(stock, color, size);
  if (shirts === null) return prototypeLeft;
  return prototypeLeft === null ? shirts : Math.min(shirts, prototypeLeft);
}
