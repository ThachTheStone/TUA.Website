import { Chewy, Danfo, Erica_One, Fira_Sans, Molle, Oi, Unkempt } from "next/font/google";
import localFont from "next/font/local";

// Fonts for the canvas text tool (FR03). Google fonts are downloaded at build time and served
// from our own domain; nothing is fetched from Google at runtime. `preload: false` because
// only the designer needs them, and only once a text uses them.
// `vi: false` marks fonts without Vietnamese accented letters: those letters fall back to
// another font, so the toolbar warns the buyer.

const firaSans = Fira_Sans({ weight: ["400", "700"], subsets: ["latin", "vietnamese"], preload: false });
const oi = Oi({ weight: "400", subsets: ["latin", "vietnamese"], preload: false });
const danfo = Danfo({ weight: "400", subsets: ["latin", "vietnamese"], preload: false });
const unkempt = Unkempt({ weight: ["400", "700"], subsets: ["latin"], preload: false });
const chewy = Chewy({ weight: "400", subsets: ["latin"], preload: false });
const molle = Molle({ weight: "400", style: "italic", subsets: ["latin", "latin-ext"], preload: false });
const ericaOne = Erica_One({ weight: "400", subsets: ["latin", "latin-ext"], preload: false });
const grandHotel = localFont({ src: "../../../public/fonts/NVN GrandHotel VH.ttf", preload: false });

export const TEXT_FONTS = [
  { key: "sans", label: "Không chân", family: "Arial, Helvetica, sans-serif", vi: true },
  { key: "serif", label: "Có chân", family: "Georgia, 'Times New Roman', serif", vi: true },
  { key: "mono", label: "Máy chữ", family: "'Courier New', Courier, monospace", vi: true },
  { key: "fira", label: "Fira Sans", family: firaSans.style.fontFamily, vi: true },
  { key: "grandhotel", label: "Grand Hotel", family: grandHotel.style.fontFamily, vi: true },
  { key: "oi", label: "Oi", family: oi.style.fontFamily, vi: true },
  { key: "danfo", label: "Danfo", family: danfo.style.fontFamily, vi: true },
  { key: "unkempt", label: "Unkempt", family: unkempt.style.fontFamily, vi: false },
  { key: "chewy", label: "Chewy", family: chewy.style.fontFamily, vi: false },
  { key: "molle", label: "Molle", family: molle.style.fontFamily, vi: false },
  { key: "erica", label: "Erica One", family: ericaOne.style.fontFamily, vi: false },
] as const;

export type TextFont = (typeof TEXT_FONTS)[number]["key"];

export function textFont(key: string) {
  return TEXT_FONTS.find((f) => f.key === key) ?? TEXT_FONTS[0];
}

export function fontFamily(key: string): string {
  return textFont(key).family;
}

/**
 * Makes sure the given fonts are downloaded before a canvas draws with them. The canvas does
 * not wait for web fonts by itself, so without this a text could render (or print) in the
 * fallback font. Never throws: a font that fails to load just keeps the fallback.
 */
export async function loadFonts(keys: Iterable<string>): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const loads = [...new Set(keys)].flatMap((key) =>
    ["400", "700"].map((weight) => document.fonts.load(`${weight} 32px ${fontFamily(key)}`, "Aa Ếư").catch(() => [])),
  );
  await Promise.all(loads);
}
