import type { Metadata } from "next";
import { requireRole } from "@/lib/supabase/auth";
import { getSettings } from "@/lib/settings";
import { saveSettings } from "@/lib/admin/settings-actions";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Cài đặt" };

export default async function SettingsPage() {
  await requireRole(["ADMIN"]);
  const settings = await getSettings();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Cài đặt hệ thống</h1>
        <p className="text-sm text-muted-foreground">Giá, màu, size, vùng in, tài khoản ngân hàng và quyên góp.</p>
      </div>
      <SettingsForm initial={settings} action={saveSettings} />
    </div>
  );
}
