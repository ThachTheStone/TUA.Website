import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

/** One product in Cửa hàng: picture, name, a short line, price and the way in. */
export function ProductCard({ href, name, description, note, price, badge, art, disabled }: {
  href: string;
  name: string;
  description: string;
  /** Highlighted line under the name, e.g. that the blindbox is a toy car, not a shirt. */
  note?: string;
  price: number;
  badge?: string;
  art: React.ReactNode;
  /** Not on sale right now: shown, but not a link. */
  disabled?: boolean;
}) {
  const body = (
    <>
      <div className="relative flex aspect-[4/3] items-center justify-center bg-muted p-6 sm:aspect-square sm:p-8">
        {art}
        {badge && (
          <span className="absolute top-3 left-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="text-lg font-bold">{name}</h2>
        {note && <p className="w-fit rounded-md bg-brand-sky/20 px-2 py-1 text-sm font-medium text-foreground">{note}</p>}
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="text-xl font-bold text-primary">{formatVND(price)}</span>
          {!disabled && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:underline underline-offset-4">
              Xem chi tiết <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
      </div>
    </>
  );

  const box = "flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm";
  if (disabled) return <div className={cn(box, "opacity-70")}>{body}</div>;
  return (
    <Link href={href} className={cn(box, "group transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md")}>
      {body}
    </Link>
  );
}
