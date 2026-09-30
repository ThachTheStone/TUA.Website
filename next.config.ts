import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/**" }]
      : [],
  },
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
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
