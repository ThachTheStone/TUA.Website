import type { Metadata } from "next";
import Link from "next/link";
import { PlainShirtForm } from "@/components/public/plain-shirt-form";
import { formatVND } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Áo trơn" };
export const dynamic = "force-dynamic";

export default async function PlainShirtPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Áo trơn</h1>
        <p className="text-muted-foreground">
          Muốn chiếc áo mang nét vẽ của riêng bạn?{" "}
          <Link href="/thiet-ke" className="font-medium text-foreground underline underline-offset-4">
            Tự thiết kế áo custom ({formatVND(settings.prices.CUSTOM)})
          </Link>
        </p>
      </div>
      <PlainShirtForm colors={settings.colors} sizes={settings.sizes} price={settings.prices.PLAIN} />
    </div>
  );
}
