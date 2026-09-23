import Image from "next/image";
import { formatDate, formatVND } from "@/lib/format";
import type { Artwork, ContentBlock, Promotion, Sponsor } from "@/types/db";

// Presentational blocks for the public home and donor-wall pages (FR01, FR09, FR10).

export function Section({
  id,
  title,
  children,
  muted = false,
}: {
  id?: string;
  title?: string | null;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section id={id} className={muted ? "bg-muted/40" : undefined}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:py-16">
        {title && <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>}
        {children}
      </div>
    </section>
  );
}

/** Story / event block: text with preserved line breaks, optional image beside it. */
export function ContentBlockView({ block, fallbackTitle, id, muted }: {
  block?: ContentBlock;
  fallbackTitle: string;
  id?: string;
  muted?: boolean;
}) {
  if (!block || (!block.body && !block.image_url)) return null;
  return (
    <Section id={id} title={block.title || fallbackTitle} muted={muted}>
      <div className={block.image_url ? "grid items-start gap-8 md:grid-cols-2" : undefined}>
        {block.body && <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{block.body}</p>}
        {block.image_url && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            <Image
              src={block.image_url}
              alt={block.title || fallbackTitle}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
      </div>
    </Section>
  );
}

export function ArtworkGrid({ artworks }: { artworks: Artwork[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {artworks.map((a) => (
        <li key={a.id} className="flex flex-col gap-2">
          <div className="relative aspect-square overflow-hidden rounded-xl border bg-white">
            <Image
              src={a.image_url}
              alt={a.child_name ? `Tranh của ${a.child_name}` : "Tranh của bé"}
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              className="object-contain"
            />
          </div>
          {a.child_name && <p className="font-medium">{a.child_name}</p>}
          {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
        </li>
      ))}
    </ul>
  );
}

export function PromotionList({ promotions }: { promotions: Promotion[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {promotions.map((p) => (
        <li key={p.id} className="flex flex-col overflow-hidden rounded-xl border bg-card">
          {p.image_url && (
            <div className="relative aspect-video bg-muted">
              <Image
                src={p.image_url}
                alt={p.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2 p-4">
            <h3 className="font-semibold">{p.title}</h3>
            {p.price_text && <p className="font-medium text-primary">{p.price_text}</p>}
            {p.description && (
              <p className="whitespace-pre-line text-sm text-muted-foreground">{p.description}</p>
            )}
            {p.ends_at && (
              <p className="mt-auto pt-2 text-xs text-muted-foreground">Đến hết {formatDate(p.ends_at)}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** FR09 progress bar towards the admin-configured goal. */
export function DonationProgress({ total, goal }: { total: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-2xl font-bold">{formatVND(total)}</span>
        {goal > 0 && (
          <span className="text-sm text-muted-foreground">
            Mục tiêu {formatVND(goal)} · {pct}%
          </span>
        )}
      </div>
      {goal > 0 && (
        <div
          className="h-3 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Tiến độ quyên góp"
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function SponsorLogo({ sponsor, large }: { sponsor: Sponsor; large?: boolean }) {
  const box = large ? "h-20 w-40" : "h-14 w-28";
  const inner = sponsor.logo_url ? (
    <div className={`relative ${box}`}>
      <Image src={sponsor.logo_url} alt={sponsor.name} fill sizes="160px" className="object-contain" />
    </div>
  ) : (
    <div className={`flex ${box} items-center justify-center rounded-md border px-2 text-center text-sm font-medium`}>
      {sponsor.name}
    </div>
  );

  // FR10: link to the sponsor's website in a new tab.
  return sponsor.website_url ? (
    <a
      href={sponsor.website_url}
      target="_blank"
      rel="noopener noreferrer"
      title={sponsor.name}
      className="transition-opacity hover:opacity-80"
    >
      {inner}
    </a>
  ) : (
    <div title={sponsor.name}>{inner}</div>
  );
}

export function SponsorStrip({ sponsors }: { sponsors: Sponsor[] }) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-6">
      {sponsors.map((s) => (
        <li key={s.id}>
          <SponsorLogo sponsor={s} />
        </li>
      ))}
    </ul>
  );
}

export function SponsorTiers({ groups }: { groups: { tier: string | null; sponsors: Sponsor[] }[] }) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map(({ tier, sponsors }) => (
        <div key={tier ?? "_"} className="flex flex-col gap-4">
          {tier && <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">{tier}</h3>}
          <ul className="flex flex-wrap items-start justify-center gap-6">
            {sponsors.map((s) => (
              <li key={s.id} className="flex flex-col items-center gap-2">
                <SponsorLogo sponsor={s} large />
                <span className="text-sm">{s.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
