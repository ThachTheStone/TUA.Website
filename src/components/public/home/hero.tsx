import { ListChecks, Star, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ContentBlock } from "@/types/db";

const FALLBACK_TITLE = "TỰA – Nét Vẽ Yêu Thương";

/** "TỰA – Nét Vẽ Yêu Thương" → big red "TỰA" over a dark tagline. No dash → one red line. */
function splitTitle(title: string): [string, string | null] {
  const m = title.match(/^(.+?)\s+[–—-]\s+(.+)$/);
  return m ? [m[1], m[2]] : [title, null];
}

/**
 * FR01 §1 (S01): campaign title, short intro, "Tự thiết kế áo" and "Quyên góp" side by side and a
 * link to Cửa hàng. The hero image (if any) fills the red shape. Always shown, even when the block is empty.
 */
export function HomeHero({ block, goal }: { block?: ContentBlock; goal: number }) {
  const [brand, tagline] = splitTitle(block?.title || FALLBACK_TITLE);

  return (
    <section className="overflow-hidden bg-brand-cream">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <h1 className="font-display leading-none font-extrabold">
            <span className="block text-7xl text-primary sm:text-8xl xl:text-9xl">{brand}</span>
            {tagline && <span className="mt-4 block text-4xl text-foreground sm:text-5xl xl:text-6xl">{tagline}</span>}
          </h1>
          {block?.body && <p className="max-w-xl text-lg whitespace-pre-line text-foreground/85 sm:text-xl">{block.body}</p>}
          <div className="flex flex-wrap gap-3">
            <Button asChild size="cta" className="h-12 px-7 text-base">
              <Link href="/thiet-ke">Tự thiết kế áo</Link>
            </Button>
            <Button asChild variant="brand-outline" size="cta" className="h-12 px-7 text-base">
              <Link href="/quyen-gop">Quyên góp</Link>
            </Button>
          </div>
          <Link href="/cua-hang" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Hoặc xem tất cả sản phẩm trong Cửa hàng →
          </Link>
        </div>

        <div className="relative mx-auto aspect-[10/7.6] w-full max-w-xl lg:max-w-none">
          <div className="hero-blob absolute top-0 left-[2%] aspect-[9/8] w-[84%] bg-primary">
            {block?.image_url && (
              <Image src={block.image_url} alt="" fill priority sizes="(min-width: 1024px) 40vw, 80vw" className="object-cover" />
            )}
          </div>
          <FloatCard className="top-[14%] -left-[2%]" icon={<Tile icon={ListChecks} />} value="100%" label="Lợi nhuận cho trẻ em" />
          <FloatCard
            className="top-[30%] right-0 xl:-right-[8%]"
            icon={<Star className="size-5 fill-amber-400 text-amber-400 sm:size-7" aria-hidden />}
            value="Tự tay vẽ"
            label="Áo của riêng bạn"
          />
          {goal > 0 && (
            <FloatCard className="top-[82%] left-[46%]" icon={<Tile icon={UserRound} />} value={formatVND(goal)} label="Mục tiêu gây quỹ" />
          )}
        </div>
      </div>
    </section>
  );
}

function Tile({ icon: Icon }: { icon: typeof ListChecks }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:size-14 sm:rounded-2xl">
      <Icon className="size-5 sm:size-7" aria-hidden />
    </span>
  );
}

function FloatCard({ icon, value, label, className }: { icon: React.ReactNode; value: string; label: string; className: string }) {
  return (
    <div
      className={cn(
        "absolute flex items-center gap-2.5 rounded-2xl bg-card p-2.5 pr-4 whitespace-nowrap shadow-[0_20px_40px_-16px_rgb(42_25_23/0.3)] sm:gap-4 sm:rounded-3xl sm:p-4 sm:pr-6",
        className,
      )}
    >
      {icon}
      <p className="flex flex-col leading-snug">
        <span className="text-sm font-medium sm:text-lg">{value}</span>
        <span className="text-xs text-foreground/65 sm:text-sm">{label}</span>
      </p>
    </div>
  );
}
