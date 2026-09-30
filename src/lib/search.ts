/** Lowercase without Vietnamese marks, so "ao tron" finds "Áo trơn". */
export function foldVietnamese(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/đ/g, "d");
}

/** True when every word of the query appears somewhere in the text. */
export function matchesSearch(text: string, query: string): boolean {
  const hay = foldVietnamese(text);
  return foldVietnamese(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}
