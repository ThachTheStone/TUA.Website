import { printSizePx } from "@/lib/design/types";

type AreaSettings = { print_areas: { key: string; label: string; widthCm: number; heightCm: number }[]; export_dpi: number };

/**
 * FR28: a Vietnamese warning when a print file is smaller than the print area at the
 * configured DPI (or has a clearly different shape), else null. Never blocks saving.
 */
export function resolutionWarning(
  file: { area: string; widthPx: number | null; heightPx: number | null },
  settings: AreaSettings,
): string | null {
  const area = settings.print_areas.find((a) => a.key === file.area);
  if (!area || !file.widthPx || !file.heightPx) return null;
  const need = printSizePx(area, settings.export_dpi);
  if (file.widthPx < need.widthPx || file.heightPx < need.heightPx) {
    return `File in "${area.label}" là ${file.widthPx}×${file.heightPx}px, nhỏ hơn mức cần ${need.widthPx}×${need.heightPx}px (${settings.export_dpi} DPI). Bản in có thể bị mờ.`;
  }
  const ratio = file.widthPx / file.heightPx / (need.widthPx / need.heightPx);
  if (Math.abs(ratio - 1) > 0.02) {
    return `File in "${area.label}" có tỉ lệ khác vùng in (${need.widthPx}×${need.heightPx}px). Vui lòng kiểm tra lại trước khi in.`;
  }
  return null;
}
