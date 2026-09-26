import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/format";
import type { Settings } from "@/lib/settings";
import type { ContentBlock } from "@/types/db";

const FALLBACK_TITLE = "TỰA – Nét Vẽ Yêu Thương";

/**
 * FR01 §1: campaign title, short intro, background image and the three main CTAs.
 * Always shown (the CTAs are the way into the site), even when the block is empty.
 */
export function HomeHero({ block, settings }: { block?: ContentBlock; settings: Settings }) {
  const image = block?.image_url;
  return (
    <section className={`relative isolate overflow-hidden border-b ${image ? "text-white" : "bg-muted/40"}`}>
      {image && (
        <>
          <Image src={image} alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
          <div className="absolute inset-0 -z-10 bg-black/55" aria-hidden />
        </>
      )}
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24 lg:py-32">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{block?.title || FALLBACK_TITLE}</h1>
        {block?.body && (
          <p className={`max-w-2xl whitespace-pre-line text-lg ${image ? "text-white/90" : "text-muted-foreground"}`}>
            {block.body}
          </p>
        )}
        <p className="text-sm">
          Áo mẫu và áo custom <strong>{formatVND(settings.prices.CUSTOM)}</strong> · Áo trơn{" "}
          <strong>{formatVND(settings.prices.PLAIN)}</strong>
          {settings.blindbox.is_active && (
            <>
              {" "}
              · Blindbox Hot Wheels <strong>{formatVND(settings.prices.BLINDBOX)}</strong>
            </>
          )}
        </p>
        <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg">
            <Link href="/mau-ao">Xem áo mẫu</Link>
          </Button>
          <Button asChild size="lg" variant={image ? "secondary" : "outline"}>
            <Link href="/thiet-ke">Tự thiết kế áo</Link>
          </Button>
          <Button asChild size="lg" variant={image ? "secondary" : "outline"}>
            <Link href="/quyen-gop">Quyên góp</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
