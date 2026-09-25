import type { Metadata } from "next";
import Link from "next/link";
import { ResubmitLoader } from "@/components/canvas/resubmit-loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireCustomer } from "@/lib/customers/session";
import { getResubmitTarget } from "@/lib/orders/resubmit";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Sửa thiết kế", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string; itemId: string }> };

/** FR29: edit a rejected custom shirt and send it back for approval. */
export default async function ResubmitPage({ params }: Props) {
  const { code, itemId } = await params;
  const { userId } = await requireCustomer(`/tai-khoan/don-hang/${code}/sua/${itemId}`);
  const [target, settings] = await Promise.all([getResubmitTarget(userId, code, itemId), getSettings()]);

  if (!target.ok) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-12">
        <Alert variant="destructive">
          <AlertDescription>{target.error}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="self-start">
          <Link href={`/tai-khoan/don-hang/${code}`}>Quay lại đơn hàng</Link>
        </Button>
      </div>
    );
  }

  const t = target.data;
  return (
    <ResubmitLoader
      code={t.code}
      itemId={t.itemId}
      areas={t.areas}
      color={t.color}
      size={t.size}
      rejectReason={t.rejectReason}
      printAreas={settings.print_areas}
      colors={settings.colors}
      sizes={settings.sizes}
      price={settings.prices.CUSTOM}
      dpi={settings.export_dpi}
      contact={settings.contact}
    />
  );
}
