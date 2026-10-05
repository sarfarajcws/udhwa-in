import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const LEGACY_IMAGES: [string, string][] = [
  ["/images/hero-bg.jpg", "/seed/sanctuary-gate.jpg"],
  ["/images/sarfaraj.jpg", "/seed/sarfaraj-alam.jpg"],
  ["/images/about/hero-bg.jpg", "/seed/udhwa-lake-hills.jpg"],
  ["/images/blogs/computer-skills.jpg", "/seed/computer-skills.jpg"],
  ["/images/blogs/phone-coding.jpg", "/seed/phone-coding.jpg"],
  ["/images/blogs/udhwa-lake-bird-sanctuary.jpg", "/seed/udhwa-lake-storks.jpg"],
  ["/images/listings/haya-store.jpg", "/seed/haya-mart-shelves.jpg"],
  ["/images/listings/kohinoor-restaurant.jpg", "/seed/kohinoor-restaurant-night.jpg"],
  ["/images/news/ict-championship.jpg", "/seed/ict-championship-2025.jpg"],
  ["/images/news/jac-exam.jpg", "/seed/jac-exam-hall.jpg"],
  ["/images/news/school-sports-2026.jpg", "/seed/school-sports-2026-banner.jpg"],
  ["/images/news/udhwa-school-sports-poster-2026.jpg", "/seed/school-sports-2026-poster.jpg"],
  ["/images/news/udhwa-petrol-pump-crowd.jpg", "/seed/hp-petrol-pump-rumour.jpg"],
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Cloudinary images use a custom loader (src/lib/media-url.ts);
    // bundled seed images go through Next's optimizer.
    localPatterns: [{ pathname: "/seed/**" }],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // The CMS moved to its own app; keep old /admin links working.
    const admin = (process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001").replace(/\/$/, "");
    return [
      { source: "/admin", destination: admin, permanent: false },
      { source: "/admin/:path*", destination: `${admin}/:path*`, permanent: false },
      // Images from the legacy udhwa.in site that have an identical replacement
      // (page URLs like /news/news-2.html are redirected from the database).
      ...LEGACY_IMAGES.map(([source, destination]) => ({ source, destination, permanent: true })),
    ];
  },
};

export default nextConfig;
