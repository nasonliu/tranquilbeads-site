import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    // Only the configured Vercel Blob origin can be optimized by next/image.
    remotePatterns: process.env.RETAIL_BLOB_HOSTNAME ? [{ protocol: "https", hostname: process.env.RETAIL_BLOB_HOSTNAME, pathname: "/**" }] : [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // Keep payment permissions untouched so the PayPal SDK can use the
          // browser capabilities it requires. These three are not used by the
          // storefront or back office and can safely be disabled globally.
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
        ],
      },
    ];
  },
  serverExternalPackages: ["sharp"],
  outputFileTracingExcludes: {
    "/api/image-manager/candidates": [
      "public/images/**/*",
      "scripts/query-image-manager-candidates.py",
      "src/lib/local-image-manager-candidates-route.ts",
      "app/data/**/*",
    ],
    "/api/image-manager/candidates/preview": [
      "public/images/**/*",
      "app/data/**/*",
    ],
    "/api/images": [
      "public/images/**/*",
      "app/data/**/*",
    ],
    "/api/image-manager/fnos": [
      "public/images/**/*",
      "app/data/**/*",
      "src/lib/fnos-gallery.ts",
    ],
    "/api/image-manager/fnos/preview": [
      "public/images/**/*",
      "app/data/**/*",
      "src/lib/fnos-gallery.ts",
    ],
  },
};

export default nextConfig;
