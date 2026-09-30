import { SubNav } from "@/components/admin/sub-nav";
import { requireRole } from "@/lib/supabase/auth";

const TABS = [
  { href: "/admin/giam-gia", label: "Mã giảm giá" },
  { href: "/admin/giam-gia/combo", label: "Combo" },
];

/** FR31: discounts that change what buyers pay (Admin only). */
export default async function DiscountLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN", "STAFF"]);
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Giảm giá</h1>
        <p className="text-sm text-muted-foreground">
          Mã giảm giá và combo không cộng dồn: mỗi đơn chỉ nhận ưu đãi có lợi hơn cho khách. Đơn đã đặt giữ nguyên số tiền khi bạn sửa.
        </p>
      </div>
      <SubNav items={TABS} />
      {children}
    </div>
  );
}
