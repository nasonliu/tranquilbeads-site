import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("retail checkout locale contract", () => {
  it("submits only the current storefront locale and validates the same allowlist on the server", () => {
    expect(read("src/components/retail-shop.tsx")).toContain('termsAccepted: true, locale');
    expect(read("src/lib/retail/operations.ts")).toContain('locale: z.enum(["en", "ar", "zh"])');
    expect(read("src/data/retail/types.ts")).toContain('locale: "en" | "ar" | "zh"');
  });
});
