import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SoldOutBanner({
  product,
  compact = false,
}: {
  /** If specified, shows product-specific title (e.g. "Áo trơn", "Blindbox Hot Wheels") */
  product?: string;
  compact?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-amber-500/10 via-brand-sand/30 to-primary/10 p-5 shadow-xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <HeartHandshake className="size-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-semibold text-white">
                Hết hàng
              </span>
              <h2 className="font-bold text-base text-foreground sm:text-lg">
                {product ? `${product} đã hết hàng` : "Khu vực bán hàng đã đóng đơn – Toàn bộ sản phẩm đã hết hàng"}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-foreground/80">
              {product
                ? `Mục ${product.toLowerCase()} hiện đã hết hàng trong kho. Dự án TỰA chân thành cảm ơn sự ủng hộ nhiệt tình của mọi người!`
                : "Dự án TỰA chân thành cảm ơn sự quan tâm và ủng hộ to lớn từ tất cả các bạn! Toàn bộ áo trơn, áo thiết kế và blindbox đều đã tìm được chủ nhân."}{" "}
              Bạn vẫn có thể tiếp tục đồng hành cùng các em nhỏ qua hình thức quyên góp hoặc tra cứu đơn hàng đã đặt.
            </p>
          </div>
        </div>

        {!compact && (
          <div className="flex shrink-0 flex-wrap gap-2.5 pt-1 sm:pt-0">
            <Button asChild size="cta" className="h-10 px-5 text-sm">
              <Link href="/quyen-gop">Quyên góp cho quỹ</Link>
            </Button>
            <Button asChild variant="brand-outline" size="cta" className="h-10 px-5 text-sm">
              <Link href="/tra-cuu">Tra cứu đơn</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
