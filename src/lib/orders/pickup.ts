import type { CustomKind } from "@/types/db";

// FR07/FR16: shared by the checkout, the Workshop form and the admin "Sửa thông tin đơn".

/** Well-known meeting points at Trường Đại học FPT. Anything else is typed in (e.g. a classroom). */
export const PICKUP_LOCATIONS = ["Sảnh Trống Đồng", "Cổng chính thư viện", "7-Eleven ngay lối ra vào bãi giữ xe"] as const;

/** "Nhận tại campus" means one of the two places TỰA members study. */
export const PICKUP_NOTE_LABEL =
  "Ghi chú: slot học bạn có thể nhận hàng và bạn học ở Nhà văn hóa hay Trường Đại học FPT";
export const PICKUP_NOTE_PLACEHOLDER = "Ví dụ: Slot 3 thứ Hai và thứ Tư, học tại Trường Đại học FPT";

/** FR16/FR29: how a custom shirt gets its design. */
export const CUSTOM_KINDS: CustomKind[] = ["UPLOAD", "LINK", "SELF"];

export const CUSTOM_KIND_LABEL: Record<CustomKind, string> = {
  UPLOAD: "Upload file ảnh trực tiếp",
  LINK: "Link Drive / thiết kế áo mẫu",
  SELF: "Tự thiết kế",
};
