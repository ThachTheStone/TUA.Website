import { ImageResponse } from "next/og";

// Link preview (Facebook, Zalo, Messenger). Built once; no prices here since they live in settings.
export const alt = "TỰA – Nét Vẽ Yêu Thương";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "TỰA – Nét Vẽ Yêu Thương";
const TAGLINE = "Tự tay vẽ chiếc áo của riêng bạn, và cùng chúng mình hỗ trợ trẻ em có hoàn cảnh đặc biệt.";

/** Be Vietnam Pro (the site font) with only the glyphs used, so Vietnamese accents render. */
async function loadFont(weight: 400 | 700): Promise<ArrayBuffer | null> {
  try {
    const text = encodeURIComponent(TITLE + TAGLINE + "Mua áo · Quyên góp");
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@${weight}&text=${text}`)).text();
    const url = css.match(/src: url\((.+?)\) format/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [bold, regular] = await Promise.all([loadFont(700), loadFont(400)]);
  const fonts = [
    ...(bold ? [{ name: "Be Vietnam Pro", data: bold, weight: 700 as const }] : []),
    ...(regular ? [{ name: "Be Vietnam Pro", data: regular, weight: 400 as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 32,
          padding: 96,
          background: "#111111",
          color: "#ffffff",
          fontFamily: "Be Vietnam Pro",
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>{TITLE}</div>
        <div style={{ fontSize: 38, fontWeight: 400, color: "#d4d4d4", lineHeight: 1.4, maxWidth: 960 }}>{TAGLINE}</div>
        <div style={{ display: "flex", gap: 16, fontSize: 30, fontWeight: 700 }}>
          <div style={{ background: "#ffffff", color: "#111111", padding: "12px 28px", borderRadius: 12 }}>Mua áo</div>
          <div style={{ border: "2px solid #ffffff", padding: "10px 26px", borderRadius: 12 }}>Quyên góp</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
