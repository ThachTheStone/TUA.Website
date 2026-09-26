import { z } from "zod";
import { PREPAY_PERCENTS } from "@/lib/orders/pricing";

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

/** Today's date in Vietnam as `YYYY-MM-DD` (for the date picker's minimum). */
export function todayInVietnam(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

/** Stored text for a pickup appointment: "Thứ Hai, 29/09/2026 lúc 14:30". */
export function formatPickupTime(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y} lúc ${time}`;
}

const text = (max: number, label: string) =>
  z.string().trim().max(max, `${label} tối đa ${max} ký tự`);

export const checkoutFormSchema = z
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
    preferred_time: text(200, "Thời gian"),
    /** PICKUP: chosen with the date and time pickers; the server turns them into `preferred_time`. */
    pickup_date: z.string().trim().max(10),
    pickup_time: z.string().trim().max(5),
    pickup_location: text(200, "Địa điểm"),
    note: text(500, "Ghi chú"),
    prepay_percent: z.coerce
      .number()
      .refine((v) => (PREPAY_PERCENTS as readonly number[]).includes(v), "Vui lòng chọn mức thanh toán trước"),
    consent: z.boolean().refine((v) => v, "Bạn cần đồng ý với chính sách xử lý dữ liệu cá nhân"),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === "DELIVERY" && !v.address) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "Vui lòng nhập địa chỉ nhận hàng" });
    }
    if (v.fulfillment === "PICKUP") {
      if (!v.pickup_date) {
        ctx.addIssue({ code: "custom", path: ["pickup_date"], message: "Vui lòng chọn ngày hẹn nhận" });
      } else if (!v.pickup_time) {
        ctx.addIssue({ code: "custom", path: ["pickup_time"], message: "Vui lòng chọn giờ hẹn nhận" });
      } else {
        const at = pickupInstant(v.pickup_date, v.pickup_time);
        if (!at) ctx.addIssue({ code: "custom", path: ["pickup_date"], message: "Ngày hoặc giờ hẹn nhận không hợp lệ" });
        else if (at.getTime() <= Date.now()) {
          ctx.addIssue({ code: "custom", path: ["pickup_time"], message: "Thời gian hẹn nhận phải sau thời điểm hiện tại" });
        }
      }
    }
    if (v.fulfillment === "PICKUP" && !v.pickup_location) {
      ctx.addIssue({ code: "custom", path: ["pickup_location"], message: "Vui lòng nhập địa điểm hẹn nhận" });
    }
  });

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
});

export const createOrderSchema = z.object({
  form: checkoutFormSchema,
  items: z.array(checkoutItemSchema).min(1, "Giỏ hàng đang trống").max(MAX_CART_LINES, "Giỏ hàng quá nhiều dòng"),
  /** FR31: optional promo code; the server checks it again. */
  promoCode: z.string().trim().max(30).optional(),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;
