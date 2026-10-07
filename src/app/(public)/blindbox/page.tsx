import { CarFront } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BlindboxBuy } from "@/components/public/blindbox-buy";
import { ComboSection, combosWith } from "@/components/public/combo-list";
import { BlindboxArt } from "@/components/public/shop/product-art";
import { Button } from "@/components/ui/button";
import { getBlindboxStatus } from "@/lib/blindbox";
import { listCombos } from "@/lib/discounts/queries";
import { formatVND } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Blindbox Hot Wheels" };
export const dynamic = "force-dynamic";

/** FR32 (S06): the Hot Wheels blindbox, plus the combos that include it. */
export default async function BlindboxPage() {
  const [box, settings, combos] = await Promise.all([getBlindboxStatus(), getSettings(), listCombos({ liveOnly: true })]);

  if (!box.is_active) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Blindbox Hot Wheels</h1>
        <p className="text-muted-foreground">Blindbox hiện chưa mở bán. Vui lòng quay lại sau.</p>
        <Button asChild variant="brand-outline">
          <Link href="/cua-hang">Về cửa hàng</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10">
      {/* Sold out: the whole product area turns grey. */}
      <div className={cn("grid gap-8 md:grid-cols-2 lg:gap-12", box.remaining <= 0 && "rounded-2xl bg-neutral-100 p-4 opacity-70 grayscale dark:bg-neutral-900")}>
        <div className="flex items-center justify-center overflow-hidden rounded-2xl border bg-muted p-6">
          <BlindboxArt image={box.image_url} name={box.name} className="max-w-md" />
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{box.name}</h1>
            <p className="text-3xl font-bold text-primary">{formatVND(box.price)}</p>
            {box.remaining > 0 && <p className="text-lg font-semibold">Chỉ còn {box.remaining} hộp</p>}
          </div>
          {/* Buyers mix this up with the shirts; say plainly what is inside. */}
          <p className="flex items-start gap-3 rounded-xl border border-brand-sky bg-brand-sky/15 p-4 text-sm">
            <CarFront className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <span>
              <strong>Đây là hộp xe đồ chơi Hot Wheels, không phải áo.</strong> Mẫu xe trong hộp là ngẫu nhiên, mở hộp mới
              biết bạn nhận được mẫu nào.
            </span>
          </p>
          {box.description && <p className="whitespace-pre-line text-muted-foreground">{box.description}</p>}
          <BlindboxBuy price={box.price} remaining={box.remaining} />
        </div>
      </div>
      <ComboSection combos={combosWith(combos, "BLINDBOX")} prices={settings.prices} />
    </div>
  );
}
