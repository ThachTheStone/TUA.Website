import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
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
    <html lang="vi">
      <body className={`${beVietnamPro.variable} antialiased`}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
