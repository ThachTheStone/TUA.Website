import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentProps } from "react";
import { ComboSection } from "@/components/public/combo-list";
import { PageHeader } from "@/components/public/page-header";
import { BlindboxArt, DesignedShirtArt, ShirtArt } from "@/components/public/shop/product-art";
import { ProductCard } from "@/components/public/shop/product-card";
import { getBlindboxStatus } from "@/lib/blindbox";
import { listCombos } from "@/lib/discounts/queries";
import { matchesSearch } from "@/lib/search";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Cửa hàng",
  description: "Áo trơn, áo tự thiết kế và Blindbox Hot Wheels. Toàn bộ lợi nhuận dùng để hỗ trợ trẻ em có hoàn cảnh đặc biệt.",
};
export const dynamic = "force-dynamic";

type Product = { card: ComponentProps<typeof ProductCard>; keywords: string };

/** The three products on sale online: plain shirt, custom shirt and the Hot Wheels blindbox. `?q=` comes from the header search. */
export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const [settings, box, combos, params] = await Promise.all([
    getSettings(),
    getBlindboxStatus(),
    listCombos({ liveOnly: true }),
    searchParams,
  ]);
  const q = (Array.isArray(params.q) ? params.q[0] : params.q ?? "").trim().slice(0, 100);
  const shirt = settings.colors[0];
  const colorNames = settings.colors.map((c) => c.label.toLowerCase()).join(", ");
  const boxBadge = !box.is_active ? "Sắp mở bán" : box.remaining <= 0 ? "Hết hàng" : undefined;

  const products: Product[] = [
    {
      card: {
        href: "/ao-tron",
        name: "Áo trơn",
        description: `Áo thun màu ${colorNames}, không in hình. Chọn size và số lượng là xong.`,
        price: settings.prices.PLAIN,
        art: <ShirtArt hex={shirt.hex} className="max-w-64" />,
      },
      keywords: "áo thun basic",
    },
    {
      card: {
        href: "/thiet-ke",
        name: "Áo thiết kế",
        description:
          "Tự vẽ, viết chữ hoặc chèn ảnh lên áo ngay trên web. Ban tổ chức duyệt thiết kế trước khi in. Cần máy tính hoặc máy tính bảng.",
        price: settings.prices.CUSTOM,
        badge: "Tự thiết kế",
        art: <DesignedShirtArt hex={shirt.hex} className="max-w-64" />,
      },
      keywords: "áo thun tự thiết kế custom in hình",
    },
    {
      card: {
        href: "/blindbox",
        name: box.name,
        note: "Xe đồ chơi Hot Wheels, không phải áo",
        description: "Hộp bí ẩn chứa xe đồ chơi Hot Wheels ngẫu nhiên. Mở hộp mới biết bạn nhận được mẫu xe nào.",
        price: box.price,
        badge: boxBadge,
        disabled: !box.is_active,
        art: <BlindboxArt image={box.image_url} name={box.name} className="max-w-64" />,
      },
      keywords: "blindbox blind box hot wheels quà",
    },
  ];
  const shown = q
    ? products.filter(({ card, keywords }) => matchesSearch(`${card.name} ${card.note ?? ""} ${card.description} ${keywords}`, q))
    : products;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <PageHeader
        title="Cửa hàng"
        description={
          q ? (
            <>
              {shown.length ? `${shown.length} sản phẩm khớp với` : "Không tìm thấy sản phẩm nào khớp với"} “{q}”.{" "}
              <Link href="/cua-hang" className="font-medium text-primary underline-offset-4 hover:underline">
                Xem tất cả sản phẩm
              </Link>
            </>
          ) : (
            "Mỗi sản phẩm bạn mua là một phần đóng góp cho các bé. Chọn sản phẩm để xem chi tiết và thêm vào giỏ hàng."
          )
        }
      />

      {shown.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(({ card }) => (
            <li key={card.href}>
              <ProductCard {...card} />
            </li>
          ))}
        </ul>
      )}

      <ComboSection combos={combos} prices={settings.prices} />
    </div>
  );
}
