import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  openGraph: { siteName: "TỰA – Nét Vẽ Yêu Thương", locale: "vi_VN", type: "website" },
  title: {
    default: "TỰA – Nét Vẽ Yêu Thương",
    template: "%s | TỰA – Nét Vẽ Yêu Thương",
  },
  description:
    "Mua áo thun tự thiết kế và quyên góp để hỗ trợ trẻ em có hoàn cảnh đặc biệt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Browser extensions (Liner, grammar/translate tools…) add attributes to <html> and <body>
    // before React loads. suppressHydrationWarning ignores only those two elements' attributes;
    // mismatches deeper in the tree are still reported.
    <html lang="vi" suppressHydrationWarning>
      <body className={`${beVietnamPro.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
