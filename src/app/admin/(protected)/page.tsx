import type { Metadata } from "next";
import { requireRole } from "@/lib/supabase/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Tổng quan" };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ loi?: string }>;
}) {
  const staff = await requireRole();
  const { loi } = await searchParams;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Xin chào, {staff.profile.full_name}</h1>
      {loi === "khong-co-quyen" && (
        <Alert variant="destructive">
          <AlertDescription>Bạn không có quyền truy cập trang đó.</AlertDescription>
        </Alert>
      )}
      <p className="text-muted-foreground">
        Chọn một mục ở thanh bên để bắt đầu quản lý đơn hàng, quyên góp và nội dung.
      </p>
    </div>
  );
}
