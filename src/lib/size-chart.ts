/** Garment measurements in cm for each shirt size (dài áo, rộng, dài tay), from the size chart. */
export const SIZE_CHART: Record<string, { length: number; width: number; sleeve: number }> = {
  S: { length: 69, width: 50, sleeve: 21.5 },
  M: { length: 71, width: 52, sleeve: 22 },
  L: { length: 73, width: 54, sleeve: 22.5 },
  XL: { length: 75, width: 60, sleeve: 25 },
};

/** 21.5 → "21,5 cm". */
export function formatCm(value: number): string {
  return `${value.toLocaleString("vi-VN")} cm`;
}
