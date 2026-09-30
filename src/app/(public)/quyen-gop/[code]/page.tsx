/* eslint-disable @next/next/no-img-element -- external VietQR image */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyRow } from "@/components/order/copy-row";
import { PageHeader } from "@/components/public/page-header";
import { Button } from "@/components/ui/button";
import { getDonationByToken } from "@/lib/donations/queries";
import { formatDate, formatVND } from "@/lib/format";

export const metadata: Metadata = { title: "Chuyển khoản quyên góp", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ t?: string }> };

/** FR08 "Quyên góp (QR)": transfer to the fund account with content DONATION UH0001 (BR04). */
export default async function DonationQrPage({ params, searchParams }: Props) {
  const [{ code }, { t }] = await Promise.all([params, searchParams]);
  const donation = typeof t === "string" ? await getDonationByToken(code.toUpperCase(), t) : null;
  if (!donation) notFound();

  const { transfer } = donation;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <PageHeader
        title={`Quyên góp ${donation.code}`}
        description={`${donation.isPublic ? donation.displayName : "Nhà hảo tâm ẩn danh"} · ${formatVND(donation.amount)} · ${formatDate(donation.createdAt)}`}
      />

      {donation.status === "CONFIRMED" && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/40">
          <p className="text-lg font-semibold">Ban tổ chức đã nhận khoản quyên góp của bạn. Cảm ơn bạn rất nhiều!</p>
          {!donation.isHidden && (
            <Button asChild variant="outline">
              <Link href="/quyen-gop#vinh-danh">Xem Bảng vinh danh</Link>
            </Button>
          )}
        </div>
      )}

      {donation.status === "CANCELLED" && (
        <p className="rounded-xl border p-5">
          Khoản quyên góp này đã được hủy. Nếu bạn đã chuyển khoản, vui lòng liên hệ Ban tổ chức kèm mã{" "}
          <strong>{donation.code}</strong>.
        </p>
      )}

      {donation.status === "PENDING" &&
        (transfer ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-2 rounded-xl border bg-white p-4">
              <img
                src={transfer.qrUrl}
                alt={`Mã VietQR chuyển ${formatVND(transfer.amount)} cho khoản quyên góp ${donation.code}`}
                className="w-full max-w-72"
              />
              <p className="text-center text-xs text-muted-foreground">
                Quét mã bằng app ngân hàng: số tiền và nội dung {transfer.content} được điền sẵn
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border px-4 py-2">
                <CopyRow label="Số tiền" value={String(transfer.amount)} display={formatVND(transfer.amount)} />
                <CopyRow label="Nội dung chuyển khoản" value={transfer.content} />
                <CopyRow label="Số tài khoản" value={transfer.accountNo} />
                <div className="py-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Ngân hàng:</span> <strong>{transfer.bankId}</strong>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Chủ tài khoản:</span> <strong>{transfer.accountName}</strong>
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Nếu chuyển khoản thủ công, vui lòng ghi đúng nội dung{" "}
                <strong className="text-foreground">{transfer.content}</strong> để Ban tổ chức tách riêng tiền quyên góp với
                tiền bán áo và xác nhận đúng khoản của bạn.
              </p>
              <p className="text-sm text-muted-foreground">
                {donation.isHidden ? (
                  "Bạn đã chọn Không hiển thị: khoản quyên góp được cộng vào tổng nhưng không hiện trên Bảng vinh danh."
                ) : (
                  <>
                    Sau khi Ban tổ chức xác nhận đã nhận tiền, khoản quyên góp sẽ hiện trên{" "}
                    <Link href="/quyen-gop#vinh-danh" className="underline underline-offset-4">
                      Bảng vinh danh
                    </Link>
                    {donation.isPublic ? " và bạn nhận được email cảm ơn (nếu đã để lại email)" : " dưới tên “Nhà hảo tâm ẩn danh”"}.
                  </>
                )}{" "}
                Bạn có thể lưu lại đường dẫn trang này để xem lại.
              </p>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            Ban tổ chức đang cập nhật tài khoản nhận quyên góp. Vui lòng quay lại trang này sau.
          </p>
        ))}
    </div>
  );
}
