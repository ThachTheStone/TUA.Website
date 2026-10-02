import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { FacebookIcon, TikTokIcon } from "@/components/brand/social-icons";
import type { Contact } from "@/lib/settings";

const LINKS = [
  { href: "/#cau-chuyen", label: "Về dự án" },
  { href: "/quyen-gop", label: "Quyên góp" },
  { href: "/vinh-danh", label: "Vinh danh" },
  { href: "/tra-cuu", label: "Tra cứu đơn hàng" },
  { href: "/lien-he", label: "Liên hệ" },
];

const year = () => new Intl.DateTimeFormat("vi-VN", { year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

export function SiteFooter({ contact }: { contact: Contact }) {
  const socials = [
    { href: contact.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: contact.tiktok, label: "TikTok", Icon: TikTokIcon },
  ].filter((s) => s.href);

  return (
    <footer className="border-t border-brand-sand bg-brand-cream">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 pt-12 pb-8">
        <Link href="/" className="text-primary" aria-label="Về trang chủ">
          <Logo variant="full" className="h-20" title="TỰA Charity Project" />
        </Link>
        <nav aria-label="Liên kết cuối trang">
          <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm">
            {LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="underline-offset-4 hover:text-primary hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {socials.length > 0 && (
          <ul className="flex items-center gap-5">
            {socials.map(({ href, label, Icon }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} của TỰA`} className="block hover:text-primary">
                  <Icon className="size-6" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 pt-4 pb-8 text-sm sm:flex-row sm:justify-between">
        <Link href="/chinh-sach" className="text-foreground/75 underline-offset-4 hover:text-primary hover:underline">
          Chính sách dữ liệu và điều khoản
        </Link>
        <p>© {year()} TỰA – Nét Vẽ Yêu Thương</p>
      </div>
    </footer>
  );
}
