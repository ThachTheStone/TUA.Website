"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { settingsSchema, type Settings } from "@/lib/settings";
import { OK, fail } from "@/lib/admin/form";
import type { ActionResult } from "@/types/action";

// FR21: system settings (Admin only). The form sends the whole settings object as JSON.

const SECTION_LABEL: Record<keyof Settings, string> = {
  prices: "Giá áo",
  colors: "Màu áo",
  sizes: "Size",
  sizes_disabled: "Size tạm ngưng bán",
  print_areas: "Vùng in",
  export_dpi: "Độ phân giải file in",
  order_expire_hours: "Thời hạn tự hủy đơn",
  bank_sales: "Tài khoản bán hàng",
  bank_fund: "Tài khoản quỹ",
  donation_min: "Quyên góp tối thiểu",
  donation_goal: "Mục tiêu quyên góp",
  contact: "Liên hệ Ban tổ chức",
  blindbox: "Blindbox",
};

function duplicate(values: string[]): string | undefined {
  return values.find((v, i) => values.indexOf(v) !== i);
}

function checkRows(s: Settings): string | null {
  if (s.colors.some((c) => !c.key.trim() || !c.label.trim())) return "Màu áo không được để trống tên";
  if (s.sizes.some((v) => !v.trim())) return "Size không được để trống";
  if (s.print_areas.some((a) => !a.key.trim() || !a.label.trim())) return "Vùng in không được để trống tên";
  const color = duplicate(s.colors.map((c) => c.key));
  if (color) return `Mã màu "${color}" bị trùng`;
  const size = duplicate(s.sizes);
  if (size) return `Size "${size}" bị trùng`;
  const area = duplicate(s.print_areas.map((a) => a.key));
  if (area) return `Mã vùng in "${area}" bị trùng`;
  const { email, facebook, tiktok, people } = s.contact;
  if (people.some((p) => !p.name.trim() || !p.phone.trim())) return "Người liên hệ cần có họ tên và số điện thoại";
  if (email && !z.email().safeParse(email).success) return "Email liên hệ không hợp lệ";
  if (facebook && !/^https?:\/\/\S+$/i.test(facebook)) return "Link Facebook phải bắt đầu bằng http:// hoặc https://";
  if (tiktok && !/^https?:\/\/\S+$/i.test(tiktok)) return "Link TikTok phải bắt đầu bằng http:// hoặc https://";
  return null;
}

export async function saveSettings(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireRole(["ADMIN"]);

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("settings") ?? ""));
  } catch {
    return fail("Dữ liệu cài đặt không hợp lệ");
  }

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[settings] invalid", z.prettifyError(parsed.error));
    const key = parsed.error.issues[0].path[0] as keyof Settings;
    return fail(`Mục "${SECTION_LABEL[key] ?? key}" chưa hợp lệ. Vui lòng kiểm tra lại (không để trống, số phải hợp lệ)`);
  }
  const problem = checkRows(parsed.data);
  if (problem) return fail(problem);
  // A removed or renamed size can't stay disabled; at least one size must stay on sale.
  parsed.data.sizes_disabled = parsed.data.sizes_disabled.filter((s) => parsed.data.sizes.includes(s));
  if (parsed.data.sizes.every((s) => parsed.data.sizes_disabled.includes(s))) return fail("Cần ít nhất 1 size đang bán");

  // The blindbox has its own page (stock changes often); never overwrite it from here.
  const rows = Object.entries(parsed.data)
    .filter(([key]) => key !== "blindbox")
    .map(([key, value]) => ({ key, value }));
  const { error } = await createServiceClient().from("settings").upsert(rows);
  if (error) return fail("Không lưu được cài đặt. Vui lòng thử lại");

  revalidatePath("/", "layout");
  return OK;
}
