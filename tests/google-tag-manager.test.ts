import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("root Google Tag Manager integration", () => {
  it("installs GTM-M9JCZKFC on every route", () => {
    const layout = readFileSync(
      path.join(process.cwd(), "app/layout.tsx"),
      "utf8",
    );

    expect(layout).toContain(
      'import { GoogleTagManager } from "@next/third-parties/google";',
    );
    expect(layout).toContain(
      'process.env.NEXT_PUBLIC_GTM_ID || "GTM-M9JCZKFC"',
    );
    expect(layout.match(/<GoogleTagManager gtmId=\{gtmId\}\s*\/>/g)).toHaveLength(1);
    expect(layout).toContain(
      "https://www.googletagmanager.com/ns.html?id=${gtmId}",
    );
  });
});
