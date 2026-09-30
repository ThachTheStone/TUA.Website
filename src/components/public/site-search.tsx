import { Search } from "lucide-react";
import Form from "next/form";
import { cn } from "@/lib/utils";

/** Header search: sends the words to Cửa hàng, which filters its products. */
export function SiteSearch({ className }: { className?: string }) {
  return (
    <Form action="/cua-hang" role="search" className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2" aria-hidden />
      <input
        type="search"
        name="q"
        maxLength={100}
        placeholder="Tìm áo trơn, áo thiết kế, blindbox…"
        aria-label="Tìm sản phẩm"
        className="h-11 w-full rounded-full bg-foreground/[0.06] pr-4 pl-12 text-[15px] outline-none placeholder:text-foreground/50 focus-visible:ring-3 focus-visible:ring-ring/40"
      />
    </Form>
  );
}
