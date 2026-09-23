import { requireRole } from "@/lib/supabase/auth";
import { SubNav } from "@/components/admin/sub-nav";

const TABS = [
  { href: "/admin/noi-dung", label: "Câu chuyện & sự kiện" },
  { href: "/admin/noi-dung/top-5", label: "Top 5 tranh" },
  { href: "/admin/noi-dung/khuyen-mai", label: "Khuyến mãi" },
];

export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN"]);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Nội dung trang chủ</h1>
        <p className="text-sm text-muted-foreground">Thay đổi hiển thị ngay trên trang chủ sau khi lưu.</p>
      </div>
      <SubNav items={TABS} />
      {children}
    </div>
  );
}
