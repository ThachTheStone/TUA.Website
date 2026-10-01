import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

/**
 * Content Security Policy – allows Supabase, Google Fonts, VietQR images and Vercel analytics.
 * In production `unsafe-eval` can be removed once all dynamic code is eliminated; Next.js still
 * needs `unsafe-inline` for its style injection.
 */
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: blob:${supabaseHost ? ` https://${supabaseHost}` : ""} https://img.vietqr.io`,
  `connect-src 'self'${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  // Chống clickjacking (bổ sung frame-ancestors trong CSP)
  { key: "X-Frame-Options", value: "DENY" },
  // Chống MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Bắt buộc HTTPS (1 năm, bao gồm subdomain)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Kiểm soát referrer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Tắt các API trình duyệt không cần thiết
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // CSP
  { key: "Content-Security-Policy", value: cspDirectives },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/**" }]
      : [],
  },
  experimental: {
    // Print files (200 DPI PNG per print area) and buyer images (≤10MB, BR01) go through server actions.
    serverActions: { bodySizeLimit: "12mb" },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // Áo mẫu are sold offline only now; old links land in Cửa hàng. Not permanent in case they come back.
  async redirects() {
    return [
      { source: "/mau-ao", destination: "/cua-hang", permanent: false },
      { source: "/mau-ao/:slug", destination: "/cua-hang", permanent: false },
      // The donor wall is now the "Vinh danh" part of the Quyên góp page.
      { source: "/vinh-danh", destination: "/quyen-gop#vinh-danh", permanent: false },
      { source: "/admin/noi-dung/khuyen-mai", destination: "/admin/khuyen-mai", permanent: false },
    ];
  },
};

export default nextConfig;

