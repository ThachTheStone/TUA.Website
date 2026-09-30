/* eslint-disable @next/next/no-img-element -- shirt photos, inline SVG and content-bucket images */
import { CarFront, Package } from "lucide-react";
import { MOCKUP_HEIGHT, MOCKUP_WIDTH, shirtImageUrl } from "@/lib/design/mockup";
import { cn } from "@/lib/utils";

// Product pictures for Cửa hàng and the product pages, from the shirt mockup photos (FR02).

/** The plain shirt in its colour (black), front or back. */
export function ShirtArt({ hex, side = "front", className }: { hex: string; side?: "front" | "back"; className?: string }) {
  return (
    <img
      src={shirtImageUrl(side, hex)}
      alt={side === "front" ? "Áo trơn, mặt trước" : "Áo trơn, mặt sau"}
      width={MOCKUP_WIDTH}
      height={MOCKUP_HEIGHT}
      className={cn("h-auto w-full", className)}
    />
  );
}

/** The same shirt with a hand-drawn doodle on the chest, to say "you draw this one". */
export function DesignedShirtArt({ hex, className }: { hex: string; className?: string }) {
  return (
    <div className={cn("relative w-full", className)} style={{ aspectRatio: `${MOCKUP_WIDTH} / ${MOCKUP_HEIGHT}` }}>
      <img src={shirtImageUrl("front", hex)} alt="Áo tự thiết kế" className="absolute inset-0 size-full" />
      <svg viewBox={`0 0 ${MOCKUP_WIDTH} ${MOCKUP_HEIGHT}`} className="absolute inset-0 size-full" aria-hidden>
        {/* Doodle drawn around (200, 172); moved to the middle of the chest and scaled up. */}
        <g transform="translate(450 389) scale(2.4) translate(-200 -172)">
        <path
          d="M200 205 C160 176 146 140 175 130 C189 126 197 135 200 144 C203 135 211 126 225 130 C254 140 240 176 200 205 Z"
          fill="var(--brand-red)"
          stroke="var(--brand-cream)"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M150 112 l4 9 10 1 -8 6 3 10 -9 -6 -9 6 3 -10 -8 -6 10 -1z" fill="var(--brand-sky)" />
        <path d="M244 104 l3 6 7 1 -5 4 2 7 -7 -4 -6 4 2 -7 -5 -4 7 -1z" fill="var(--brand-sand)" />
        <path
          d="M156 232 q11 -12 22 0 t22 0 t22 0 t22 0"
          fill="none"
          stroke="var(--brand-sand)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="258" cy="168" r="5" fill="var(--brand-sky)" />
        <circle cx="140" cy="176" r="4" fill="var(--brand-cream)" />
        </g>
      </svg>
    </div>
  );
}

/** The blindbox photo from settings, or a box with a toy car so nobody mistakes it for a shirt. */
export function BlindboxArt({ image, name, className }: { image: string | null; name: string; className?: string }) {
  if (image) return <img src={image} alt={name} className={cn("aspect-square w-full rounded-xl object-cover", className)} />;
  return (
    <div className={cn("relative flex aspect-square w-full items-center justify-center", className)} aria-hidden>
      <Package className="size-3/5 text-primary" strokeWidth={1.25} />
      <span className="absolute right-[14%] bottom-[16%] flex size-16 items-center justify-center rounded-full border-4 border-brand-cream bg-brand-sky text-white shadow-md">
        <CarFront className="size-8" />
      </span>
    </div>
  );
}
