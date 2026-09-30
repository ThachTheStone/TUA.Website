import type { StatusTone } from "@/lib/orders/state-machine";
import { cn } from "@/lib/utils";

const TONE: Record<StatusTone, string> = {
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-amber-100 text-amber-900",
  success: "bg-emerald-100 text-emerald-800",
  neutral: "bg-brand-sky/20 text-foreground",
};

/** The single order status shown to buyers (S17). */
export function StatusPill({ label, tone, className }: { label: string; tone: StatusTone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", TONE[tone], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
