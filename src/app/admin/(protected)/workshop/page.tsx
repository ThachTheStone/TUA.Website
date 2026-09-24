import type { Metadata } from "next";
import { WorkshopForm } from "@/components/admin/orders/workshop-form";
import { toCatalog } from "@/components/cart/catalog";
import { getSettings } from "@/lib/settings";
import { requireRole } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Tạo đơn Workshop" };
export const dynamic = "force-dynamic";

/** FR16: orders taken at the Campus Workshop, with scanned paper drawings. */
export default async function WorkshopPage() {
  await requireRole();
  const settings = await getSettings();
  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Tạo đơn Workshop</h1>
        <p className="text-sm text-muted-foreground">
          Áo custom từ Workshop được duyệt sẵn vì Staff đã xem bản vẽ tại chỗ. Khách trả tiền mặt thì đơn vào thẳng Đã xác nhận.
        </p>
      </div>
      <WorkshopForm catalog={toCatalog(settings)} />
    </div>
  );
}
