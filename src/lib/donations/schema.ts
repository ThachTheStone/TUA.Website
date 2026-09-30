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

/**
 * How the donation shows on the donor wall. Only "public" collects a name, contact and message;
 * "anonymous" shows as "Nhà hảo tâm ẩn danh", "hidden" is left off the wall (still in the total).
 */
export const DONATION_VISIBILITY = ["public", "anonymous", "hidden"] as const;
export type DonationVisibility = (typeof DONATION_VISIBILITY)[number];

/** Name stored for donors who left none (the column can't be empty). */
export const ANONYMOUS_DONOR_NAME = "Nhà hảo tâm ẩn danh";

export function donationFormSchema(min: number) {
  return z
    .object({
      visibility: z.enum(DONATION_VISIBILITY),
      // Nullish so the form can send its parsed values, which the server parses again.
      display_name: z.string().trim().max(100, "Tên hiển thị tối đa 100 ký tự").nullish(),
      contact: z.string().trim().max(200, "Email hoặc số điện thoại tối đa 200 ký tự").nullish(),
      amount: z.coerce
        .number({ error: "Số tiền không hợp lệ" })
        .int("Số tiền phải là số nguyên")
        .min(min, `Số tiền quyên góp tối thiểu là ${formatVND(min)}`)
        .max(DONATION_MAX, `Số tiền tối đa ${formatVND(DONATION_MAX)}`),
      message: z.string().trim().max(300, "Lời nhắn tối đa 300 ký tự").nullish(),
      consent: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (v.visibility !== "public") return;
      if (!v.display_name) ctx.addIssue({ code: "custom", path: ["display_name"], message: "Vui lòng nhập tên hiển thị" });
      if (!v.contact) ctx.addIssue({ code: "custom", path: ["contact"], message: "Vui lòng nhập email hoặc số điện thoại" });
      else if (!normalizeContact(v.contact))
        ctx.addIssue({ code: "custom", path: ["contact"], message: "Email hoặc số điện thoại không hợp lệ" });
      if (!v.consent) ctx.addIssue({ code: "custom", path: ["consent"], message: "Bạn cần đồng ý với chính sách xử lý dữ liệu cá nhân" });
    })
    .transform((v) =>
      v.visibility === "public"
        ? {
            visibility: v.visibility,
            amount: v.amount,
            display_name: v.display_name!,
            contact: normalizeContact(v.contact!)!.value,
            message: v.message || null,
            consent: v.consent,
          }
        : { visibility: v.visibility, amount: v.amount, display_name: null, contact: null, message: null, consent: false },
    );
}

export type DonationFormInput = z.input<ReturnType<typeof donationFormSchema>>;
export type DonationFormValues = z.output<ReturnType<typeof donationFormSchema>>;
