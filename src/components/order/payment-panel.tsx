"use client";

/* eslint-disable @next/next/no-img-element -- external VietQR image */
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { CopyRow } from "@/components/order/copy-row";
import { Button } from "@/components/ui/button";
import { formatDate, formatVND } from "@/lib/format";
import { markTransferred } from "@/lib/orders/actions";
import type { PaymentInfo } from "@/lib/orders/queries";

function useCountdown(deadline: string | null) {
  // Starts after hydration so server and client render the same markup.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  if (!deadline || now === null) return null;
  const ms = Math.max(0, new Date(deadline).getTime() - now);
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { ms, text: `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` };
}

/** FR07 payment step: QR, bank details with copy buttons, deadline, "Tôi đã chuyển khoản". */
export function PaymentPanel({
  payment,
  code,
  token,
  onTransferred,
}: {
  payment: PaymentInfo;
  code: string;
  token: string;
  /** Refreshes the order after "Tôi đã chuyển khoản"; defaults to a router refresh. */
  onTransferred?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const countdown = useCountdown(payment.expiresAt);
  const expired = countdown?.ms === 0;

  function confirm() {
    startTransition(async () => {
      const result = await markTransferred(code, token);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Đã ghi nhận. Ban tổ chức sẽ xác nhận sau khi đối soát.");
      if (onTransferred) onTransferred();
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-white p-4">
        <img src={payment.qrUrl} alt={`Mã VietQR chuyển ${formatVND(payment.amount)} cho đơn ${code}`} className="w-full max-w-72" />
        <p className="text-center text-xs text-muted-foreground">Mở app ngân hàng và quét mã để chuyển khoản</p>
      </div>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border px-4 py-2">
          <CopyRow label="Số tiền" value={String(payment.amount)} display={formatVND(payment.amount)} />
          <CopyRow label="Nội dung chuyển khoản" value={payment.content} />
          <CopyRow label="Số tài khoản" value={payment.accountNo} />
          <div className="py-2 text-sm">
            <p>
              <span className="text-muted-foreground">Ngân hàng:</span> <strong>{payment.bankId}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Chủ tài khoản:</span> <strong>{payment.accountName}</strong>
            </p>
          </div>
        </div>
        {payment.expiresAt && (
          <p className="text-sm">
            Hạn thanh toán: <strong>{formatDate(payment.expiresAt)}</strong>
            {countdown && !expired && (
              <>
                {" "}
                (còn <span className="font-semibold tabular-nums">{countdown.text}</span>)
              </>
            )}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Vui lòng ghi đúng nội dung <strong className="text-foreground">{payment.content}</strong> để Ban tổ chức đối soát.
        </p>
        <Button type="button" size="lg" className="h-12" onClick={confirm} disabled={pending || expired}>
          {pending && <Loader2 className="animate-spin" />}
          {expired ? "Đã quá hạn thanh toán" : "Tôi đã chuyển khoản"}
        </Button>
      </div>
    </div>
  );
}
