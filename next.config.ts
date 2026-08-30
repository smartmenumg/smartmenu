import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Image optimization ─────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/webp", "image/avif"],
  },

  // ── Security headers ───────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",        value: "DENY" },
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control",  value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
      // Allow Razorpay webhook to receive raw body
      {
        source: "/api/webhooks/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },

  // ── Mobile dev testing — allow local network access ───────────────────────
  allowedDevOrigins: [
    "192.168.29.130",  // your Wi-Fi IP
    "192.168.29.*",
    "192.168.*.*",
  ],

  // ── Turbopack (Next.js 16 default bundler) ────────────────────────────────
  turbopack: {},
};

export default nextConfig;
