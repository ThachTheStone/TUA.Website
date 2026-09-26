import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrototypeBuyForm, PrototypeGallery } from "@/components/public/prototype-buy";
import { getShirtStock, prototypeSold } from "@/lib/inventory.server";
import { getActivePrototype } from "@/lib/prototypes/queries";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const prototype = await getActivePrototype((await params).slug);
  return { title: prototype ? prototype.name : "Áo mẫu" };
}

/** FR27: one prototype. The design can't be edited; price = custom price (BR09). */
export default async function PrototypePage({ params }: Params) {
  const { slug } = await params;
  const [settings, prototype, stock, sold] = await Promise.all([getSettings(), getActivePrototype(slug), getShirtStock(), prototypeSold()]);
  const color = prototype && settings.colors.find((c) => c.key === prototype.color);
  if (!prototype || !color) notFound();
  const prototypeLeft = prototype.stock_limit === null ? null : Math.max(0, prototype.stock_limit - (sold.get(prototype.id) ?? 0));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <Link href="/mau-ao" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← Tất cả áo mẫu
      </Link>
      <div className="grid gap-8 md:grid-cols-2">
        <PrototypeGallery images={prototype.image_urls} name={prototype.name} />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{prototype.name}</h1>
            {prototype.description && <p className="whitespace-pre-line text-muted-foreground">{prototype.description}</p>}
          </div>
          <PrototypeBuyForm
            prototypeId={prototype.id}
            name={prototype.name}
            color={color}
            sizes={settings.sizes}
            price={settings.prices.CUSTOM}
            stock={stock}
            prototypeLeft={prototypeLeft}
          />
          <p className="text-sm text-muted-foreground">
            Thiết kế của áo mẫu không chỉnh sửa được. Muốn thay đổi?{" "}
            <Link href="/thiet-ke" className="font-medium text-foreground underline underline-offset-4">
              Tự thiết kế áo
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
