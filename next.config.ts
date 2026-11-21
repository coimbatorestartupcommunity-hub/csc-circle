import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [
      {
        pathname: "/api/**",
      },
      {
        pathname: "/**",
        search: "",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/api/member/resume/pdf": ["./node_modules/dejavu-fonts-ttf/ttf/DejaVuSans*.ttf"],
    "/api/admin/community-data/export": [
      "./node_modules/dejavu-fonts-ttf/ttf/DejaVuSans*.ttf",
      "./node_modules/@fontsource/noto-sans-tamil/files/noto-sans-tamil-tamil-*.woff2",
      "./public/brand/csc-logo.png",
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com; frame-ancestors 'none';" },
      ] },
      { source: "/images/:path*", headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ] },
      { source: "/brand/:path*", headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ] },
      { source: "/posters/:path*", headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ] },
      { source: "/fonts/:path*", headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ] },
      { source: "/auth/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
