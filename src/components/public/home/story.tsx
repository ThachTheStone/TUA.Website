import Image from "next/image";
import type { ContentBlock } from "@/types/db";

const FALLBACK_TITLE = "Câu chuyện của chúng mình";

type Piece = { kind: "p"; text: string } | { kind: "list"; items: string[] };

/** Body text from admin: one paragraph per line, lines starting with "- " or "• " form a list. */
function parseStory(body: string): Piece[] {
  const pieces: Piece[] = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const item = line.match(/^[-•]\s+(.+)$/);
    const last = pieces.at(-1);
    if (item && last?.kind === "list") last.items.push(item[1]);
    else if (item) pieces.push({ kind: "list", items: [item[1]] });
    else pieces.push({ kind: "p", text: line });
  }
  return pieces;
}

/**
 * FR01 §3 "Ý nghĩa dự án", in an editorial layout: serif heading, a quiet label on the left and
 * the story on the right. The first paragraph reads as the lead, the last as the closing line.
 * Hidden while the block is empty.
 *
 * Design tokens: bg-brand-cream (#fffdeb), text-primary (#801c1c), font-serif (Playfair Display),
 * body in font-sans (Lexend). Generous whitespace for an editorial, human-centric feel.
 */
export function StorySection({ block }: { block?: ContentBlock }) {
  if (!block || (!block.body?.trim() && !block.image_url)) return null;
  const pieces = parseStory(block.body ?? "");
  const paragraphs = pieces.filter((p) => p.kind === "p");
  const lead = paragraphs[0];
  const closing = paragraphs.length > 2 ? paragraphs.at(-1) : undefined;

  return (
    <section id="cau-chuyen" className="scroll-mt-(--header-h) bg-brand-cream">
      <div className="mx-auto max-w-6xl px-6 pt-12 pb-24 sm:px-8 sm:pt-16 sm:pb-32 lg:pt-20 lg:pb-40">
        {/* ── Heading ────────────────────────────────────────────────── */}
        <h2 className="max-w-4xl font-serif text-[1.875rem] leading-[1.1] font-bold tracking-[-0.02em] text-primary sm:text-[2.375rem] sm:leading-[1.08] lg:text-[3.25rem] lg:leading-[1.05]">
          {block.title || FALLBACK_TITLE}
        </h2>

        {/* ── Two-column editorial grid ──────────────────────────────── */}
        <div className="mt-14 grid gap-10 sm:mt-20 lg:grid-cols-12 lg:gap-16">
          {/* Left: sticky label */}
          <aside className="lg:col-span-3">
            <div className="flex items-center gap-3 lg:sticky lg:top-[calc(var(--header-h)+2.5rem)]">
              <span className="h-px w-12 bg-primary/30" aria-hidden />
              <p className="text-[0.65rem] font-semibold tracking-[0.3em] text-primary/50 uppercase">
                Về dự án TỰA
              </p>
            </div>
          </aside>

          {/* Right: story body */}
          <div className="flex max-w-2xl flex-col gap-8 lg:col-span-9">
            {pieces.map((piece, i) => {
              if (piece.kind === "list") {
                return (
                  <ul key={i} className="flex flex-col gap-4 border-l-2 border-primary/15 pl-7">
                    {piece.items.map((item, j) => (
                      <li key={j} className="relative text-[0.9375rem] leading-relaxed font-medium text-foreground/90">
                        <span
                          className="absolute top-[0.75em] -left-7 h-[2px] w-4 rounded-full bg-primary/60"
                          aria-hidden
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                );
              }
              if (piece === lead) {
                return (
                  <p key={i} className="text-[0.9375rem] leading-[1.85] text-foreground/75 sm:text-base sm:leading-[1.85]">
                    {piece.text}
                  </p>
                );
              }
              if (piece === closing) {
                return (
                  <p
                    key={i}
                    className="mt-6 border-t border-primary/10 pt-10 font-serif text-[1.375rem] leading-snug text-primary italic sm:text-[1.625rem] sm:leading-snug"
                  >
                    {piece.text}
                  </p>
                );
              }
              return (
                <p key={i} className="text-[0.9375rem] leading-[1.85] text-foreground/75 sm:text-base sm:leading-[1.85]">
                  {piece.text}
                </p>
              );
            })}

            {block.image_url && (
              <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-3xl bg-muted shadow-sm">
                <Image
                  src={block.image_url}
                  alt={block.title || FALLBACK_TITLE}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
