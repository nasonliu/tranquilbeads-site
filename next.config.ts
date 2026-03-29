import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
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
  },
};

export default nextConfig;
