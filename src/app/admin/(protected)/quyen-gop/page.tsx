import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmActionButton } from "@/components/admin/form-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelDonation, confirmDonation, setDonationVisibility } from "@/lib/admin/donation-actions";
import {
  DONATION_PAGE_SIZE,
  DONATION_STATUS_LABEL,
  donationFiltersSchema,
  getDonationCounts,
  listAdminDonations,
  type DonationFilters,
} from "@/lib/donations/queries";
import { formatDate, formatVND } from "@/lib/format";
import { requireRole } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";
import type { DonationStatus } from "@/types/db";

export const metadata: Metadata = { title: "Quyên góp" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function hrefWith(filters: DonationFilters, change: Partial<Record<keyof DonationFilters, string | number | undefined>>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filters, page: undefined, ...change })) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `/admin/quyen-gop?${qs}` : "/admin/quyen-gop";
}

const STATUS_CLASS: Record<DonationStatus, string> = {
  PENDING: "border-amber-300 text-amber-800 dark:text-amber-300",
  CONFIRMED: "border-emerald-300 text-emerald-800 dark:text-emerald-300",
  CANCELLED: "text-muted-foreground",
};

/** FR18: donations list. Staff confirms or cancels PENDING ones; Admin hides entries from the wall. */
export default async function DonationsAdminPage({ searchParams }: Props) {
  const staff = await requireRole();
  const isAdmin = staff.profile.role === "ADMIN";
  const raw = await searchParams;
  const filters = donationFiltersSchema.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined])),
  );
  const [{ rows, total }, counts] = await Promise.all([listAdminDonations(filters), getDonationCounts()]);
  const page = filters.page ?? 1;
  const pages = Math.max(1, Math.ceil(total / DONATION_PAGE_SIZE));

  const tabs: { label: string; status?: DonationStatus; n?: number }[] = [
    { label: "Chờ xác nhận", status: "PENDING", n: counts.byStatus.PENDING },
    { label: "Đã xác nhận", status: "CONFIRMED", n: counts.byStatus.CONFIRMED },
    { label: "Đã hủy", status: "CANCELLED", n: counts.byStatus.CANCELLED },
    { label: "Tất cả" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Quyên góp</h1>
        <p className="text-sm text-muted-foreground">
          Đã xác nhận: <strong className="text-foreground">{formatVND(counts.confirmedTotal)}</strong>. Đối soát sao kê tài
          khoản quỹ theo nội dung chuyển khoản (mã UH…) trước khi bấm “Đã nhận tiền”.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={hrefWith({ q: filters.q }, { status: t.status })}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted",
              filters.status === t.status && "border-primary bg-muted font-medium",
            )}
          >
            {t.label}
            {t.n !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 text-xs font-semibold tabular-nums",
                  t.status === "PENDING" && t.n > 0 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {t.n}
              </span>
            )}
          </Link>
        ))}
      </div>

      <form className="flex max-w-md gap-2" action="/admin/quyen-gop">
        {filters.status && <input type="hidden" name="status" value={filters.status} />}
        <Input name="q" defaultValue={filters.q} placeholder="Tìm mã, tên, email hoặc SĐT" aria-label="Tìm kiếm" />
        <Button type="submit" variant="outline">
          Tìm
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">{total} khoản</p>

      {rows.length === 0 ? (
        <p className="rounded-xl border p-8 text-center text-muted-foreground">Không có khoản quyên góp nào khớp bộ lọc.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                {["Mã", "Tên hiển thị", "Liên hệ", "Số tiền", "Lời nhắn", "Trạng thái", "Ngày", "Thao tác"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((d) => (
                <tr key={d.id} className="align-top hover:bg-muted/30">
                  <td className="px-3 py-2 font-semibold">{d.code}</td>
                  <td className="max-w-44 px-3 py-2">
                    <div className="truncate">{d.display_name}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {!d.is_public && <Badge variant="outline">Ẩn danh</Badge>}
                      {d.is_hidden && <Badge variant="outline">Đã ẩn khỏi vinh danh</Badge>}
                    </div>
                  </td>
                  <td className="max-w-48 truncate px-3 py-2">{d.contact}</td>
                  <td className="px-3 py-2 font-medium tabular-nums">{formatVND(d.amount)}</td>
                  <td className="max-w-64 px-3 py-2 text-muted-foreground">
                    <p className="line-clamp-3 whitespace-pre-line">{d.message}</p>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={STATUS_CLASS[d.status]}>
                      {DONATION_STATUS_LABEL[d.status]}
                    </Badge>
                    {d.status === "CONFIRMED" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(d.confirmed_at)}
                        {d.confirmer ? ` · ${d.confirmer.full_name}` : ""}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{formatDate(d.created_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {d.status === "PENDING" && (
                        <>
                          <ConfirmActionButton
                            action={confirmDonation.bind(null, d.id)}
                            confirmText={`Xác nhận đã nhận ${formatVND(d.amount)} cho khoản ${d.code}?`}
                            successMessage={`Đã xác nhận ${d.code}`}
                            variant="default"
                          >
                            Đã nhận tiền
                          </ConfirmActionButton>
                          <ConfirmActionButton
                            action={cancelDonation.bind(null, d.id)}
                            confirmText={`Hủy khoản quyên góp ${d.code}? Không hoàn tác được.`}
                            successMessage={`Đã hủy ${d.code}`}
                            variant="outline"
                          >
                            Hủy
                          </ConfirmActionButton>
                        </>
                      )}
                      {isAdmin && d.status === "CONFIRMED" && (
                        <ConfirmActionButton
                          action={setDonationVisibility.bind(null, d.id, !d.is_hidden)}
                          successMessage={d.is_hidden ? "Đã hiện lại trên Bảng vinh danh" : "Đã ẩn khỏi Bảng vinh danh"}
                          variant="outline"
                        >
                          {d.is_hidden ? "Hiện trên vinh danh" : "Ẩn khỏi vinh danh"}
                        </ConfirmActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-4 text-sm">
          {page > 1 ? <Link href={hrefWith(filters, { page: page - 1 })}>← Trước</Link> : <span className="text-muted-foreground">← Trước</span>}
          <span>
            Trang {page}/{pages}
          </span>
          {page < pages ? <Link href={hrefWith(filters, { page: page + 1 })}>Sau →</Link> : <span className="text-muted-foreground">Sau →</span>}
        </nav>
      )}
    </div>
  );
}
