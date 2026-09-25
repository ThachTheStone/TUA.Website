/* eslint-disable @next/next/no-img-element -- public content-bucket images */
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/format";
import { listPrototypes } from "@/lib/prototypes/queries";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Áo mẫu" };
export const dynamic = "force-dynamic";

/** FR27: active prototypes in the admin's order. */
export default async function PrototypesPage() {
  const [settings, prototypes] = await Promise.all([getSettings(), listPrototypes({ activeOnly: true })]);
  // A prototype whose colour was removed from settings can't be ordered, so don't show it.
  const onSale = prototypes.filter((p) => settings.colors.some((c) => c.key === p.color));

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
        <ul className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {onSale.map((p) => (
            <li key={p.id}>
              <Link href={`/mau-ao/${p.slug}`} className="group flex flex-col gap-2">
                <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                  {p.image_urls[0] && (
                    <img src={p.image_urls[0]} alt={p.name} className="size-full object-cover transition-transform group-hover:scale-105" />
                  )}
                </div>
                <span className="font-medium group-hover:underline">{p.name}</span>
                <span className="text-sm text-muted-foreground">{formatVND(settings.prices.CUSTOM)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
