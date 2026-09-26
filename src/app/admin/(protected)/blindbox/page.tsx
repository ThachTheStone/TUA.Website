import type { Metadata } from "next";
import Link from "next/link";
import { BlindboxForm } from "@/components/admin/blindbox-form";
import { getBlindboxStatus } from "@/lib/blindbox";
import { formatVND } from "@/lib/format";
import { requireRole } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Blindbox" };
export const dynamic = "force-dynamic";

/** FR32: the Hot Wheels blindbox (Staff and Admin). */
export default async function BlindboxAdminPage() {
  const staff = await requireRole();
  const box = await getBlindboxStatus();
  const stats: [string, number][] = [
    ["Tổng số hộp", box.stock],
    ["Đã bán / giữ chỗ", box.sold],
    ["Còn lại", box.remaining],
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Blindbox Hot Wheels</h1>
        <p className="text-sm text-muted-foreground">
          Giá {formatVND(box.price)}{" "}
          {staff.profile.role === "ADMIN" ? (
            <>
              (đổi trong{" "}
              <Link href="/admin/cai-dat#gia-ao" className="underline underline-offset-4">
                Cài đặt
              </Link>
              )
            </>
          ) : (
            "(Admin đổi trong Cài đặt)"
          )}
          . Hộp trong đơn đã hủy hoặc hết hạn được tự động trả lại kho.
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-3 text-center">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-xl border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-xl border bg-card p-4">
        <BlindboxForm box={box} />
      </div>
    </div>
  );
}
