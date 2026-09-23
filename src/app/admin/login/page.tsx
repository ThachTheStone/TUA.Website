import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/supabase/auth";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Đăng nhập quản trị" };

export default async function AdminLoginPage() {
  if (await getStaff()) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <LoginForm />
    </main>
  );
}
