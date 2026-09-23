import type { Metadata } from "next";
import { requireRole } from "@/lib/supabase/auth";
import { ChangePasswordForm } from "@/components/admin/change-password-form";

export const metadata: Metadata = { title: "Đổi mật khẩu" };

export default async function ChangePasswordPage() {
  await requireRole();

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">Đổi mật khẩu</h1>
      <ChangePasswordForm />
    </div>
  );
}
