import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* -------------------------------------------------------
   * Core
   * ----------------------------------------------------- */
  reactStrictMode: true,

  /* -------------------------------------------------------
   * ✅ DO NOT BLOCK PRODUCTION BUILDS WITH ESLINT
   * ----------------------------------------------------- */
  eslint: {
    ignoreDuringBuilds: true,
  },

  /* -------------------------------------------------------
   * Image Optimization
   * ----------------------------------------------------- */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },

  /* -------------------------------------------------------
   * Compiler Optimizations
   * ----------------------------------------------------- */
  compiler: {
    // Remove console logs in production builds
    removeConsole: process.env.NODE_ENV === "production",
  },

  /* -------------------------------------------------------
   * Experimental Performance Features
   * ----------------------------------------------------- */
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      "@heroicons/react",
      "framer-motion",
    ],
  },

  /* -------------------------------------------------------
   * Production Settings
   * ----------------------------------------------------- */
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,

  /* -------------------------------------------------------
   * Security Headers
   * ----------------------------------------------------- */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
