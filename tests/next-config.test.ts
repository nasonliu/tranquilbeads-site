import { describe, expect, it } from "vitest";

import nextConfig from "@/next.config";

describe("next config", () => {
  it("excludes local-only image manager assets from Vercel traces", () => {
    expect(nextConfig.outputFileTracingExcludes).toMatchObject({
      "/api/image-manager/candidates": expect.arrayContaining([
        "public/images/**/*",
        "scripts/query-image-manager-candidates.py",
        "src/lib/local-image-manager-candidates-route.ts",
      ]),
      "/api/image-manager/candidates/preview": expect.arrayContaining([
        "public/images/**/*",
      ]),
      "/api/images": expect.arrayContaining([
        "public/images/**/*",
      ]),
    });
  });
});
