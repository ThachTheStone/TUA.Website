// NFR08: money as `129.000đ`, dates as `dd/MM/yyyy HH:mm` in Asia/Ho_Chi_Minh.

export const TIME_ZONE = "Asia/Ho_Chi_Minh";

const vndFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export function formatVND(amount: number): string {
  return `${vndFormatter.format(Math.round(amount))}đ`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateOnlyFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function parts(formatter: Intl.DateTimeFormat, date: Date) {
  return Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
}

/** `dd/MM/yyyy HH:mm`, or `dd/MM/yyyy` with `{ time: false }`. Returns "" for empty input. */
export function formatDate(
  value: string | number | Date | null | undefined,
  { time = true }: { time?: boolean } = {},
): string {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  if (!time) {
    const p = parts(dateOnlyFormatter, date);
    return `${p.day}/${p.month}/${p.year}`;
  }
  const p = parts(dateTimeFormatter, date);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}
