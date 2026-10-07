import type { Metadata } from "next";
import { WorkshopForm } from "@/components/admin/orders/workshop-form";
import { loadCatalog } from "@/lib/catalog";
import { requireRole } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Tạo đơn Workshop" };
export const dynamic = "force-dynamic";

/** FR16: orders taken at the Campus Workshop. */
export default async function WorkshopPage() {
  await requireRole();
  const catalog = await loadCatalog();
  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Tạo đơn Workshop</h1>
        <p className="text-sm text-muted-foreground">
          Áo custom có file ảnh hoặc link thiết kế được duyệt sẵn vì Staff đã xem tại chỗ; áo chưa có thiết kế ở trạng thái Chờ
          duyệt. Tiền mặt: đơn vào thẳng Đã xác nhận. Chuyển khoản: chuyển sang trang QR để khách quét.
        </p>
      </div>
      <WorkshopForm catalog={catalog} />
    </div>
  );
}
