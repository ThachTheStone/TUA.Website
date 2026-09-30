import { Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { FacebookIcon, GmailIcon, TikTokIcon, ZaloIcon } from "@/components/brand/social-icons";
import { PageHeader } from "@/components/public/page-header";
import { Button } from "@/components/ui/button";
import { formatPhone, telUrl, zaloUrl } from "@/lib/contact";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Liên hệ",
  description: "Liên hệ Ban tổ chức TỰA – Nét Vẽ Yêu Thương qua Zalo, Facebook hoặc email.",
};
export const dynamic = "force-dynamic";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Brand-coloured square holding a channel's logo. */
function BrandTile({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-sm", className)} aria-hidden>
      {children}
    </span>
  );
}

function ContactCard({ tile, title, subtitle, children }: {
  tile: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {tile}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold">{title}</span>
          <span className="text-sm break-words text-muted-foreground">{subtitle}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </li>
  );
}

/** FR21: every way to reach the organizers, from `settings.contact`. */
export default async function ContactPage() {
  const { contact } = await getSettings();
  const people = contact.people.length
    ? contact.people
    : contact.phone
      ? [{ name: "Ban tổ chức", role: "Điện thoại / Zalo", phone: contact.phone }]
      : [];
  const firstZalo = people.map((p) => zaloUrl(p.phone)).find(Boolean);
  const socials = [
    contact.facebook && { href: contact.facebook, label: "Facebook", icon: <FacebookIcon className="size-5" /> },
    firstZalo && { href: firstZalo, label: "Zalo", icon: <ZaloIcon className="size-6" /> },
    contact.email && { href: `mailto:${contact.email}`, label: "Email", icon: <GmailIcon className="size-5" /> },
    contact.tiktok && { href: contact.tiktok, label: "TikTok", icon: <TikTokIcon className="size-5" /> },
  ].filter((s): s is { href: string; label: string; icon: React.ReactElement } => Boolean(s));
  const empty = !people.length && !contact.facebook && !contact.email && !contact.tiktok;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <PageHeader
        title="Liên hệ"
        description="Cần hỗ trợ đặt áo, thiết kế hay muốn đồng hành cùng dự án? Nhắn cho chúng mình qua các kênh dưới đây."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="flex flex-col items-center justify-center gap-6 rounded-3xl bg-primary px-6 py-10 text-center text-primary-foreground">
          <Logo variant="full" className="h-28 text-brand-cream sm:h-32" title="TỰA Charity Project" />
          <div className="flex flex-col gap-1">
            <p className="text-xl font-bold">TỰA – Nét Vẽ Yêu Thương</p>
            <p className="text-sm text-primary-foreground/80">
              Dự án áo tự thiết kế gây quỹ hỗ trợ trẻ em có hoàn cảnh đặc biệt.
            </p>
          </div>
          {socials.length > 0 && (
            <ul className="flex flex-wrap justify-center gap-3">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    {...(s.href.startsWith("mailto:") ? {} : external)}
                    aria-label={s.label}
                    title={s.label}
                    className="flex size-11 items-center justify-center rounded-full bg-brand-cream text-primary transition-transform hover:-translate-y-0.5"
                  >
                    {s.icon}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {empty ? (
          <p className="rounded-3xl border bg-card p-6 text-muted-foreground">Thông tin liên hệ đang được cập nhật.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {people.map((p) => {
              const zalo = zaloUrl(p.phone);
              return (
                <ContactCard
                  key={`${p.name}-${p.phone}`}
                  tile={
                    <BrandTile className="bg-[#0068FF] text-white">
                      <ZaloIcon className="size-10" />
                    </BrandTile>
                  }
                  title={p.name}
                  subtitle={
                    <>
                      {p.role && <span className="font-medium text-primary">{p.role}</span>}
                      {p.role && " · "}
                      <span className="whitespace-nowrap">Zalo {formatPhone(p.phone)}</span>
                    </>
                  }
                >
                  {zalo && (
                    <Button asChild size="cta">
                      <a href={zalo} {...external}>
                        Nhắn Zalo
                      </a>
                    </Button>
                  )}
                  <Button asChild size="cta" variant="brand-outline">
                    <a href={telUrl(p.phone)}>
                      <Phone /> Gọi
                    </a>
                  </Button>
                </ContactCard>
              );
            })}
            {contact.facebook && (
              <ContactCard
                tile={
                  <BrandTile className="bg-[#0866FF] text-white">
                    <FacebookIcon className="size-8" />
                  </BrandTile>
                }
                title="Facebook TỰA"
                subtitle="Trang Facebook chính thức của dự án"
              >
                <Button asChild size="cta">
                  <a href={contact.facebook} {...external}>
                    Mở Facebook
                  </a>
                </Button>
              </ContactCard>
            )}
            {contact.email && (
              <ContactCard
                tile={
                  <BrandTile className="border bg-white text-[#EA4335]">
                    <GmailIcon className="size-7" />
                  </BrandTile>
                }
                title="Email"
                subtitle={contact.email}
              >
                <Button asChild size="cta" variant="brand-outline">
                  <a href={`mailto:${contact.email}`}>
                    <Mail /> Gửi email
                  </a>
                </Button>
              </ContactCard>
            )}
            {contact.tiktok && (
              <ContactCard
                tile={
                  <BrandTile className="bg-black text-white">
                    <TikTokIcon className="size-7" />
                  </BrandTile>
                }
                title="TikTok TỰA"
                subtitle="Theo dõi kênh của dự án"
              >
                <Button asChild size="cta">
                  <a href={contact.tiktok} {...external}>
                    Mở TikTok
                  </a>
                </Button>
              </ContactCard>
            )}
          </ul>
        )}
      </div>

      <p className="rounded-2xl bg-muted p-5 text-sm">
        Muốn biết đơn hàng của bạn đang ở bước nào?{" "}
        <Link href="/tra-cuu" className="font-semibold text-primary underline-offset-4 hover:underline">
          Tra cứu đơn hàng
        </Link>
      </p>
    </div>
  );
}
