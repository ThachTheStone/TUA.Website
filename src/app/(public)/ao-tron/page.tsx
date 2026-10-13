import type { Metadata } from "next";
import { ComboSection, combosWith } from "@/components/public/combo-list";
import { PlainShirtForm } from "@/components/public/plain-shirt-form";
import { SoldOutBanner } from "@/components/public/sold-out-banner";
import { listCombos } from "@/lib/discounts/queries";
import { areShirtsSoldOut } from "@/lib/inventory";
import { getShirtStock } from "@/lib/inventory.server";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Áo trơn" };
export const dynamic = "force-dynamic";

/** FR02 (S04): plain shirt, then the combos that include it. */
export default async function PlainShirtPage() {
  const [settings, stock, combos] = await Promise.all([getSettings(), getShirtStock(), listCombos({ liveOnly: true })]);
  const isSoldOut = areShirtsSoldOut(stock, settings.colors, settings.sizes, settings.sizes_disabled);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10">
      {isSoldOut && <SoldOutBanner product="Áo trơn" />}
      <PlainShirtForm
        colors={settings.colors}
        sizes={settings.sizes}
        disabledSizes={settings.sizes_disabled}
        price={settings.prices.PLAIN}
        customPrice={settings.prices.CUSTOM}
        stock={stock}
      />
      {!isSoldOut && <ComboSection combos={combosWith(combos, "PLAIN")} prices={settings.prices} />}
    </div>
  );
}
