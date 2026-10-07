import { z } from "zod";
import { customPrepayIssue, isPrepayChoice, PREPAY_CUSTOM } from "@/lib/orders/pricing";

// FR07 checkout input. Shared by the form (client) and createOrder (server).
// Prices are deliberately absent: the server takes them from settings.

export const ORDER_CODE_RE = /^TUA\d{4,}$/;
export const MAX_CART_LINES = 20;

/** `0901 234 567`, `+84 901234567`, `090.123.4567` → `0901234567`. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/[\s.\-()]/g, "");
  return digits.startsWith("+84") ? `0${digits.slice(3)}` : digits.startsWith("84") && digits.length === 11 ? `0${digits.slice(2)}` : digits;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập số điện thoại")
  .transform(normalizePhone)
  .refine((v) => /^0[35789]\d{8}$/.test(v), "Số điện thoại không hợp lệ (10 số, ví dụ 0901234567)");

export const orderCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => ORDER_CODE_RE.test(v), "Mã đơn có dạng TUA0001");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

/** `2026-09-29` + `14:30` read as Vietnam time (Asia/Ho_Chi_Minh, UTC+7, no DST). */
export function pickupInstant(date: string, time: string): Date | null {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  const d = new Date(`${date}T${time}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A moment's date in Vietnam as `YYYY-MM-DD`. */
export function vietnamDate(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(at);
}

/** Today's date in Vietnam as `YYYY-MM-DD` (for the date picker's minimum). */
export function todayInVietnam(): string {
  return vietnamDate(new Date());
}

/** Stored text for the pickup/delivery time: "Thứ Hai, 29/09/2026 lúc 14:30". */
export function formatReceiveTime(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y} lúc ${time}`;
}

/** The pickers' values back from text stored by formatReceiveTime; null for older free text. */
export function parseReceiveTime(text: string | null | undefined): { date: string; time: string } | null {
  const m = text?.match(/(\d{2})\/(\d{2})\/(\d{4}) lúc (\d{2}:\d{2})/);
  return m ? { date: `${m[3]}-${m[2]}-${m[1]}`, time: m[4] } : null;
}

/** `YYYY-MM-DD` plus `days` calendar days. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const shortDate = (date: string) => date.split("-").reverse().join("/");

/** Custom shirts need a week to design, approve and print: the date must be ≥ order date + 7 days. */
export const CUSTOM_LEAD_DAYS = 7;

/** Lead time for an order: a week when it has a custom shirt, otherwise none. */
export const leadDaysFor = (items: { type: string }[]) => (items.some((i) => i.type === "CUSTOM") ? CUSTOM_LEAD_DAYS : 0);

/**
 * FR07/FR16: the date and time picked for pickup or delivery. Must be in the future and, with
 * `leadDays`, on or after `from` (the order date, Vietnam time) + leadDays.
 */
export function receiveTimeIssue(
  date: string,
  time: string,
  leadDays: number,
  from: string = todayInVietnam(),
): { field: "receive_date" | "receive_time"; message: string } | null {
  if (!date) return { field: "receive_date", message: "Vui lòng chọn ngày nhận hàng" };
  if (!time) return { field: "receive_time", message: "Vui lòng chọn giờ nhận hàng" };
  const at = pickupInstant(date, time);
  if (!at) return { field: "receive_date", message: "Ngày hoặc giờ nhận hàng không hợp lệ" };
  if (at.getTime() <= Date.now()) return { field: "receive_time", message: "Thời gian nhận hàng phải sau thời điểm hiện tại" };
  const earliest = addDays(from, leadDays);
  if (leadDays > 0 && date < earliest) {
    return {
      field: "receive_date",
      message: `Đơn có áo custom cần ít nhất ${leadDays} ngày để thiết kế và in: chọn ngày từ ${shortDate(earliest)}`,
    };
  }
  return null;
}

/** FR29: a Drive (or any http/https) link to a design, added by staff. */
export const designLinkSchema = z
  .string()
  .trim()
  .max(500, "Link thiết kế tối đa 500 ký tự")
  .refine((v) => !v || /^https?:\/\/\S+$/i.test(v), "Link thiết kế phải bắt đầu bằng http:// hoặc https://");

const text = (max: number, label: string) =>
  z.string().trim().max(max, `${label} tối đa ${max} ký tự`);

/**
 * `leadDays`: CUSTOM_LEAD_DAYS when the cart has a custom shirt. `subtotal`: the order total the
 * browser shows, to check "Số tiền khác" early. The server re-checks both with the real items.
 */
export const makeCheckoutFormSchema = (leadDays: number, subtotal?: number) =>
  z
    .object({
      customer_name: text(100, "Họ tên").min(2, "Vui lòng nhập họ tên"),
      phone: phoneSchema,
      email: z
        .string()
        .trim()
        .min(1, "Vui lòng nhập email")
        .max(200, "Email tối đa 200 ký tự")
        .pipe(z.email("Email không hợp lệ")),
      fulfillment: z.enum(["DELIVERY", "PICKUP"], { error: "Vui lòng chọn hình thức nhận hàng" }),
      address: text(300, "Địa chỉ"),
      /** Pickup or delivery: date and time pickers; the server turns them into `preferred_time`. */
      receive_date: z.string().trim().max(10),
      receive_time: z.string().trim().max(5),
      pickup_location: text(200, "Địa điểm"),
      note: text(500, "Ghi chú"),
      prepay_percent: z.coerce.number().refine(isPrepayChoice, "Vui lòng chọn mức thanh toán trước"),
      /** "Số tiền khác" (prepay_percent = 0): the amount in đồng. */
      prepay_custom: z.coerce.number().int("Số tiền phải là số nguyên").min(0).max(100_000_000).optional(),
      consent: z.boolean().refine((v) => v, "Bạn cần đồng ý với chính sách xử lý dữ liệu cá nhân"),
    })
    .superRefine((v, ctx) => {
      if (v.fulfillment === "DELIVERY" && !v.address) {
        ctx.addIssue({ code: "custom", path: ["address"], message: "Vui lòng nhập địa chỉ nhận hàng" });
      }
      if (v.prepay_percent === PREPAY_CUSTOM) {
        const problem = subtotal === undefined ? (v.prepay_custom ? null : "Vui lòng nhập số tiền muốn chuyển trước") : customPrepayIssue(v.prepay_custom ?? 0, subtotal);
        if (problem) ctx.addIssue({ code: "custom", path: ["prepay_custom"], message: problem });
      }
      const issue = receiveTimeIssue(v.receive_date, v.receive_time, leadDays);
      if (issue) ctx.addIssue({ code: "custom", path: [issue.field], message: issue.message });
      if (v.fulfillment === "PICKUP" && !v.pickup_location) {
        ctx.addIssue({ code: "custom", path: ["pickup_location"], message: "Vui lòng chọn địa điểm hẹn nhận" });
      }
    });

export const checkoutFormSchema = makeCheckoutFormSchema(0);

export type CheckoutFormInput = z.input<typeof checkoutFormSchema>;
export type CheckoutForm = z.output<typeof checkoutFormSchema>;

export const checkoutItemSchema = z.object({
  type: z.enum(["PLAIN", "CUSTOM", "PROTOTYPE", "BLINDBOX"]),
  /** Ignored for PROTOTYPE (the prototype's colour) and BLINDBOX (no colour or size). */
  color: z.string().max(50),
  size: z.string().max(20),
  quantity: z.number().int().min(1, "Số lượng tối thiểu là 1").max(50, "Số lượng tối đa 50"),
  /** Folder the design files were uploaded to (CUSTOM only). */
  uploadId: z.uuid().optional(),
  /** PROTOTYPE only (FR27). */
  prototypeId: z.uuid().optional(),
  /** CUSTOM only: "Cần tư vấn áo", no design yet; staff add it later from Zalo (custom kind LINK). */
  consult: z.boolean().optional(),
});

export const createOrderSchema = z.object({
  form: checkoutFormSchema,
  items: z.array(checkoutItemSchema).min(1, "Giỏ hàng đang trống").max(MAX_CART_LINES, "Giỏ hàng quá nhiều dòng"),
  /** FR31: optional promo code; the server checks it again. */
  promoCode: z.string().trim().max(30).optional(),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;
