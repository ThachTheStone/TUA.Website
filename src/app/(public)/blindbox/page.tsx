/* eslint-disable @next/next/no-img-element -- image URL comes from the content bucket */
import { Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BlindboxBuy } from "@/components/public/blindbox-buy";
import { ComboList } from "@/components/public/combo-list";
import { getBlindboxStatus } from "@/lib/blindbox";
import { listCombos } from "@/lib/discounts/queries";
import { formatVND } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Blindbox Hot Wheels" };
export const dynamic = "force-dynamic";

/** FR32: the Hot Wheels blindbox, plus the combos that include it. */
export default async function BlindboxPage() {
  const [box, settings, combos] = await Promise.all([getBlindboxStatus(), getSettings(), listCombos({ liveOnly: true })]);

  if (!box.is_active) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Blindbox Hot Wheels</h1>
        <p className="text-muted-foreground">Blindbox hiện chưa mở bán. Vui lòng quay lại sau.</p>
        <Link href="/mau-ao" className="font-medium underline underline-offset-4">
          Xem áo mẫu
        </Link>
      </div>
    );
  }

  const boxCombos = combos.filter((c) => c.items.some((i) => i.type === "BLINDBOX"));
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex items-center justify-center overflow-hidden rounded-xl bg-muted/40">
          {box.image_url ? (
            <img src={box.image_url} alt={box.name} className="aspect-square w-full object-cover" />
          ) : (
            <Package className="my-24 size-32 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{box.name}</h1>
          <p className="text-2xl font-bold">{formatVND(box.price)}</p>
          {box.description && <p className="whitespace-pre-line text-muted-foreground">{box.description}</p>}
          <BlindboxBuy price={box.price} remaining={box.remaining} />
        </div>
      </div>
      {boxCombos.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Combo ưu đãi</h2>
          <ComboList combos={boxCombos} prices={settings.prices} />
        </section>
      )}
    </div>
  );
}
