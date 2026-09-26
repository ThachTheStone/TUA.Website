import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PrototypeGrid } from "@/components/public/prototype-grid";
import { listPrototypesOnSale } from "@/lib/prototypes/queries";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Áo mẫu" };
export const dynamic = "force-dynamic";

/** FR27: active prototypes in the admin's order. */
export default async function PrototypesPage() {
  const [settings, onSale] = await Promise.all([getSettings(), listPrototypesOnSale()]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Áo mẫu</h1>
        <p className="text-muted-foreground">
          Thiết kế có sẵn do Ban tổ chức chuẩn bị. Muốn áo mang nét vẽ của riêng bạn?{" "}
          <Link href="/thiet-ke" className="font-medium text-foreground underline underline-offset-4">
            Tự thiết kế áo
          </Link>{" "}
          hoặc{" "}
          <Link href="/ao-tron" className="font-medium text-foreground underline underline-offset-4">
            mua áo trơn
          </Link>
          .
        </p>
      </div>

      {onSale.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-lg">Chưa có áo mẫu nào đang bán.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/thiet-ke">Tự thiết kế áo</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/ao-tron">Mua áo trơn</Link>
            </Button>
          </div>
        </div>
      ) : (
        <PrototypeGrid prototypes={onSale} price={settings.prices.CUSTOM} />
      )}
    </div>
  );
}
