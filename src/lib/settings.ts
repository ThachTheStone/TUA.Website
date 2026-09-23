import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

// Hard rule 3: prices, colors, sizes, print areas and bank accounts live in `settings`.

const bankSchema = z.object({
  bankId: z.string(),
  accountNo: z.string(),
  accountName: z.string(),
});

export const settingsSchema = z.object({
  prices: z.object({ PLAIN: z.number().int().nonnegative(), CUSTOM: z.number().int().nonnegative() }),
  colors: z.array(z.object({ key: z.string(), label: z.string(), hex: z.string() })).min(1),
  sizes: z.array(z.string()).min(1),
  print_areas: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        side: z.enum(["front", "back"]),
        widthCm: z.number().positive(),
        heightCm: z.number().positive(),
        xPct: z.number().min(0).max(1),
        yPct: z.number().min(0).max(1),
      }),
    )
    .min(1),
  export_dpi: z.number().int().positive(),
  order_expire_hours: z.number().positive(),
  bank_sales: bankSchema,
  bank_fund: bankSchema,
  donation_min: z.number().int().nonnegative(),
  donation_goal: z.number().int().nonnegative(),
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingKey = keyof Settings;
export type BankAccount = z.infer<typeof bankSchema>;
export type PrintArea = Settings["print_areas"][number];
export type ShirtColor = Settings["colors"][number];

/** All settings, validated. Cached per request. Throws if a key is missing or malformed. */
export const getSettings = cache(async (): Promise<Settings> => {
  const { data, error } = await createServiceClient().from("settings").select("key, value");
  if (error) throw new Error(`Không đọc được cài đặt: ${error.message}`);

  const raw = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Cài đặt không hợp lệ: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
});

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K]> {
  return (await getSettings())[key];
}

/** Validates and saves one setting. Callers must check `requireRole(["ADMIN"])` first. */
export async function updateSetting<K extends SettingKey>(key: K, value: Settings[K]) {
  const parsed = settingsSchema.shape[key].parse(value);
  const { error } = await createServiceClient()
    .from("settings")
    .upsert({ key, value: parsed });
  if (error) throw new Error(`Không lưu được cài đặt: ${error.message}`);
}
