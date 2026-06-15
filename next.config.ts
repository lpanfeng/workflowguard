import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // i18n routing
  i18n: {
    locales: ["zh", "en"],
    defaultLocale: "zh",
    localeDetection: false, // Use middleware for locale detection
  },
  // Production optimizations
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
