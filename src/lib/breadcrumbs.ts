// Breadcrumb trail for every public page except the home page.

export type Crumb = { label: string; href?: string };

const HOME: Crumb = { label: "Trang chủ", href: "/" };
const SHOP: Crumb = { label: "Cửa hàng", href: "/cua-hang" };
const CART: Crumb = { label: "Giỏ hàng", href: "/gio-hang" };
const LOGIN: Crumb = { label: "Đăng nhập", href: "/dang-nhap" };
const ACCOUNT: Crumb = { label: "Tài khoản", href: "/tai-khoan" };
const DONATE: Crumb = { label: "Quyên góp", href: "/quyen-gop" };

/** Fixed pages: the crumbs above the page, then the page's own label. */
const PAGES: Record<string, [Crumb[], string]> = {
  "/cua-hang": [[], "Cửa hàng"],
  "/ao-tron": [[SHOP], "Áo trơn"],
  "/thiet-ke": [[SHOP], "Áo thiết kế"],
  "/blindbox": [[SHOP], "Blindbox Hot Wheels"],
  "/gio-hang": [[], "Giỏ hàng"],
  "/thanh-toan": [[CART], "Đặt hàng"],
  "/tra-cuu": [[], "Tra cứu đơn hàng"],
  "/quyen-gop": [[], "Quyên góp"],
  "/vinh-danh": [[DONATE], "Vinh danh"],
  "/chinh-sach": [[], "Chính sách"],
  "/lien-he": [[], "Liên hệ"],
  "/dang-nhap": [[], "Đăng nhập"],
  "/dang-ky": [[LOGIN], "Đăng ký"],
  "/quen-mat-khau": [[LOGIN], "Quên mật khẩu"],
  "/dat-lai-mat-khau": [[LOGIN], "Đặt lại mật khẩu"],
  "/tai-khoan": [[], "Tài khoản"],
};

/** Crumbs for a path, the last one being the current page (no link). Empty on the home page. */
export function breadcrumbTrail(pathname: string): Crumb[] {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return [];

  const page = PAGES[path];
  if (page) return [HOME, ...page[0], { label: page[1] }];

  const seg = path.split("/").filter(Boolean).map(decodeURIComponent);
  const code = seg[2]?.toUpperCase();
  // /thanh-toan/TUA0001
  if (seg[0] === "thanh-toan" && seg.length === 2) return [HOME, { label: `Thanh toán đơn ${seg[1].toUpperCase()}` }];
  // /quyen-gop/UH0001
  if (seg[0] === "quyen-gop" && seg.length === 2) return [HOME, DONATE, { label: `Mã ${seg[1].toUpperCase()}` }];
  // /tai-khoan/don-hang/TUA0001[/sua/<item>]
  if (seg[0] === "tai-khoan" && seg[1] === "don-hang" && code) {
    const order = `Đơn ${code}`;
    return seg[3] === "sua"
      ? [HOME, ACCOUNT, { label: order, href: `/tai-khoan/don-hang/${code}` }, { label: "Sửa thiết kế" }]
      : [HOME, ACCOUNT, { label: order }];
  }
  return [HOME, { label: "Không tìm thấy trang" }];
}
