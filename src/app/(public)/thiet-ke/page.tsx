import type { Metadata } from "next";
import { DesignerLoader } from "@/components/canvas/designer-loader";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Thiết kế áo" };
// Prices, colours and print areas come from settings, so render per request.
export const dynamic = "force-dynamic";

export default async function DesignPage({ searchParams }: { searchParams: Promise<{ sua?: string }> }) {
  const [settings, { sua }] = await Promise.all([getSettings(), searchParams]);

  return (
    <DesignerLoader
      printAreas={settings.print_areas}
      colors={settings.colors}
      sizes={settings.sizes}
      price={settings.prices.CUSTOM}
      dpi={settings.export_dpi}
      editItemId={typeof sua === "string" ? sua : null}
    />
  );
}
