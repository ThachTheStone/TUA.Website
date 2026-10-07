import type { Metadata } from "next";
import { BlindboxStockForm } from "@/components/admin/blindbox-stock-form";
import { StockForm } from "@/components/admin/stock-form";
import { getBlindboxStatus } from "@/lib/blindbox";
import { getStockTable } from "@/lib/inventory.server";
import { getSettings } from "@/lib/settings";
import { requireRole } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Kho hàng" };
export const dynamic = "force-dynamic";

/** Blank shirt stock per colour × size (Staff and Admin). */
export default async function StockPage() {
  await requireRole();
  const settings = await getSettings();
  const [cells, box] = await Promise.all([getStockTable(settings), getBlindboxStatus()]);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Kho hàng</h1>
        <p className="text-sm text-muted-foreground">
          Nhập tổng số áo trơn Ban tổ chức có theo từng màu và size. Mỗi áo trong đơn (áo mẫu, áo custom, áo trơn) trừ 1
          áo ngay khi khách đặt; đơn đã hủy hoặc hết hạn được tự động trả lại kho. Để trống = không giới hạn. Khi hết,
          khách không chọn được size đó nữa.
        </p>
        <p className="text-sm text-muted-foreground">Giới hạn số lượng cho từng mẫu áo đặt trong trang Áo mẫu.</p>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <StockForm colors={settings.colors} sizes={settings.sizes} cells={cells} />
      </div>
      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Blindbox</h2>
        <BlindboxStockForm name={box.name} remaining={box.remaining} sold={box.sold} />
      </section>
    </div>
  );
}
