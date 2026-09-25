/** URL/key slug from a Vietnamese label: "Xanh lá" → "xanh-la". Empty when nothing is left. */
export function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
