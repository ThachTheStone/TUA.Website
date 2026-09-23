import { requireRole } from "@/lib/supabase/auth";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireRole();

  return (
    <div className="flex min-h-screen flex-col bg-muted/40 md:flex-row">
      <AdminSidebar name={staff.profile.full_name} role={staff.profile.role} />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
