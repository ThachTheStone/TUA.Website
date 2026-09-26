import { z } from "zod";
import { formatVND } from "@/lib/format";
import { normalizePhone } from "@/lib/orders/checkout-schema";

// FR08 donation input. Shared by the form (client) and createDonation (server).
// The minimum comes from settings (BR08), so the schema is built per request.

export const DONATION_CODE_RE = /^UH\d{4,}$/;
/** Upper bound against typos (an extra zero or two), not a business rule. */
export const DONATION_MAX = 1_000_000_000;
export const DONATION_PRESETS = [300_000, 500_000, 1_000_000, 2_000_000];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^0[35789]\d{8}$/;

/** Email (lower-cased) or a normalised Vietnamese phone number; null if it is neither. */
export function normalizeContact(value: string): { kind: "email" | "phone"; value: string } | null {
  const v = value.trim();
  if (v.includes("@")) return EMAIL_RE.test(v) ? { kind: "email", value: v.toLowerCase() } : null;
  const phone = normalizePhone(v);
  return PHONE_RE.test(phone) ? { kind: "phone", value: phone } : null;
}

export function donationFormSchema(min: number) {
  return z.object({
    display_name: z.string().trim().min(1, "Vui lòng nhập tên hiển thị").max(100, "Tên hiển thị tối đa 100 ký tự"),
    contact: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập email hoặc số điện thoại")
      .max(200, "Email hoặc số điện thoại tối đa 200 ký tự")
      .refine((v) => normalizeContact(v) !== null, "Email hoặc số điện thoại không hợp lệ")
      .transform((v) => normalizeContact(v)!.value),
    amount: z.coerce
      .number({ error: "Số tiền không hợp lệ" })
      .int("Số tiền phải là số nguyên")
      .min(min, `Số tiền quyên góp tối thiểu là ${formatVND(min)}`)
      .max(DONATION_MAX, `Số tiền tối đa ${formatVND(DONATION_MAX)}`),
    // Nullable so the form can send its parsed values, which the server parses again.
    message: z
      .string()
      .trim()
      .max(300, "Lời nhắn tối đa 300 ký tự")
      .nullish()
      .transform((v) => v || null),
    /** true = show the name on the donor wall; false = "Nhà hảo tâm ẩn danh". */
    is_public: z.boolean(),
    consent: z.boolean().refine((v) => v, "Bạn cần đồng ý với chính sách xử lý dữ liệu cá nhân"),
  });
}

export type DonationFormInput = z.input<ReturnType<typeof donationFormSchema>>;
export type DonationFormValues = z.output<ReturnType<typeof donationFormSchema>>;
