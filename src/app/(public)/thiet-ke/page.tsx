import type { Metadata } from "next";
import { DesignerLoader } from "@/components/canvas/designer-loader";
import { getCustomer } from "@/lib/customers/session";
import { getShirtStock } from "@/lib/inventory.server";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Thiết kế áo" };
// Prices, colours and print areas come from settings, so render per request.
export const dynamic = "force-dynamic";

export default async function DesignPage({ searchParams }: { searchParams: Promise<{ sua?: string }> }) {
  const [settings, { sua }, session, stock] = await Promise.all([getSettings(), searchParams, getCustomer(), getShirtStock()]);

  return (
    <DesignerLoader
      printAreas={settings.print_areas}
      colors={settings.colors}
      sizes={settings.sizes}
      price={settings.prices.CUSTOM}
      dpi={settings.export_dpi}
      editItemId={typeof sua === "string" ? sua : null}
      signedIn={!!session}
      contact={settings.contact}
      stock={stock}
    />
  );
}
