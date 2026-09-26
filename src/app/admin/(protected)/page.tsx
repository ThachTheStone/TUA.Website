import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/supabase/auth";
import { getOrderCounts } from "@/lib/orders/admin-queries";
import { getDonationCounts } from "@/lib/donations/queries";
import { isSheetsConfigured } from "@/lib/sheets";
import { ResyncSheetsButton } from "@/components/admin/resync-sheets-button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Tổng quan" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ loi?: string }>;
}) {
  const staff = await requireRole();
  const [{ loi }, counts, donations] = await Promise.all([searchParams, getOrderCounts(), getDonationCounts()]);

  // What staff should do next, most urgent first.
  const todo = [
    { label: "Đơn chờ xác nhận thanh toán", n: counts.byStatus.PAYMENT_REVIEW ?? 0, href: "/admin/don-hang?status=PAYMENT_REVIEW" },
    { label: "Đơn có thiết kế cần duyệt", n: counts.pendingDesigns, href: "/admin/don-hang?design=PENDING" },
    { label: "Đơn đã xác nhận, chờ in", n: counts.byStatus.CONFIRMED ?? 0, href: "/admin/don-hang?status=CONFIRMED" },
    { label: "Đơn sẵn sàng giao/nhận", n: counts.byStatus.READY ?? 0, href: "/admin/don-hang?status=READY" },
    { label: "Đơn đã giao còn nợ", n: counts.debts, href: "/admin/don-hang?payment=DEBT" },
    { label: "Quyên góp chờ xác nhận", n: donations.byStatus.PENDING, href: "/admin/quyen-gop?status=PENDING" },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Xin chào, {staff.profile.full_name}</h1>
      {loi === "khong-co-quyen" && (
        <Alert variant="destructive">
          <AlertDescription>Bạn không có quyền truy cập trang đó.</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {todo.map((t) => (
          <Link key={t.label} href={t.href} className="flex flex-col gap-1 rounded-xl border bg-card p-4 hover:bg-muted/50">
            <span className="text-3xl font-bold tabular-nums">{t.n}</span>
            <span className="text-sm text-muted-foreground">{t.label}</span>
          </Link>
        ))}
      </div>

      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <h2 className="font-semibold">Google Sheets</h2>
        {isSheetsConfigured() ? (
          <>
            <p className="text-sm text-muted-foreground">
              Bảng tính tự đồng bộ sau mỗi thay đổi đơn hàng và quyên góp. Nếu thấy thiếu dữ liệu, bấm đồng bộ lại.
            </p>
            <ResyncSheetsButton />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Chưa cấu hình. Đặt GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL và GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY trong biến môi
            trường, rồi chia sẻ bảng tính cho email tài khoản dịch vụ (quyền Chỉnh sửa).
          </p>
        )}
      </section>
    </div>
  );
}
