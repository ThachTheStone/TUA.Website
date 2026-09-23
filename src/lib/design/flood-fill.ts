// Scanline flood fill on raw RGBA pixels (FR03 "Tô màu").

export const FILL_TOLERANCE = 32;

export function hexToRgba(hex: string): [number, number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

/**
 * Fills the region connected to (x, y) whose pixels are within `tolerance` of the seed pixel
 * (per channel, alpha included). Mutates `image`. Returns false when nothing changed.
 */
export function floodFill(
  image: ImageData,
  x: number,
  y: number,
  fill: [number, number, number, number],
  tolerance = FILL_TOLERANCE,
): boolean {
  const { width, height, data } = image;
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= width || y >= height) return false;

  const seed = (y * width + x) * 4;
  const target = [data[seed], data[seed + 1], data[seed + 2], data[seed + 3]];
  const transparentTarget = target[3] === 0;
  if (target.every((v, i) => Math.abs(v - fill[i]) <= 0)) return false;

  const matches = (p: number) => {
    const i = p * 4;
    // Fully transparent pixels carry arbitrary RGB, so compare only alpha for them.
    if (transparentTarget) return data[i + 3] <= tolerance;
    return (
      Math.abs(data[i] - target[0]) <= tolerance &&
      Math.abs(data[i + 1] - target[1]) <= tolerance &&
      Math.abs(data[i + 2] - target[2]) <= tolerance &&
      Math.abs(data[i + 3] - target[3]) <= tolerance
    );
  };

  const visited = new Uint8Array(width * height);
  const paint = (p: number) => {
    visited[p] = 1;
    const i = p * 4;
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  };

  const stack: number[] = [x, y];
  while (stack.length) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    let left = cx;
    const row = cy * width;
    if (visited[row + left] || !matches(row + left)) continue;
    while (left > 0 && !visited[row + left - 1] && matches(row + left - 1)) left--;
    let right = cx;
    while (right < width - 1 && !visited[row + right + 1] && matches(row + right + 1)) right++;

    for (let px = left; px <= right; px++) paint(row + px);

    for (const ny of [cy - 1, cy + 1]) {
      if (ny < 0 || ny >= height) continue;
      const nrow = ny * width;
      let inRun = false;
      for (let px = left; px <= right; px++) {
        const ok = !visited[nrow + px] && matches(nrow + px);
        if (ok && !inRun) stack.push(px, ny);
        inRun = ok;
      }
    }
  }
  return true;
}
