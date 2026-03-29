import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFile = promisify(execFileCallback);

describe("sync-products.py", () => {
  it("returns structured counts and preserves extra collections in generated tags", async () => {
    const root = await mkdtemp(join(tmpdir(), "tranquilbeads-sync-"));
    await mkdir(join(root, "app/data"), { recursive: true });
    await mkdir(join(root, "src/data"), { recursive: true });

    await writeFile(
      join(root, "app/data/image-manager-products.json"),
      JSON.stringify(
        [
          {
            slug: "sync-test-item",
            name: "Sync Test Item",
            nameAr: "منتج مزامنة",
            material: "Resin",
            collections: ["gift-sets", "premium"],
            images: ["/images/test/main.jpg", "/images/test/detail.jpg"],
            tagsEn: ["Seasonal"],
            tagsAr: ["موسمي"],
          },
        ],
        null,
        2,
      ),
      "utf8",
    );

    await writeFile(
      join(root, "src/data/site.ts"),
      `export const products: Product[] = [
  {
    slug: "existing-item",
    collection: "signature-tasbih",
    title: { en: "Existing Item", ar: "منتج موجود" },
    summary: { en: "Summary", ar: "ملخص" },
    image: "/images/existing.jpg",
    material: { en: "Wood", ar: "خشب" },
    tags: { en: ["Existing"], ar: ["موجود"] },
    detailIntro: { en: "Intro", ar: "مقدمة" },
    detailBody: { en: "Body", ar: "وصف" },
    idealFor: { en: "Retail", ar: "تجزئة" },
    heroAlt: { en: "Hero", ar: "رئيسية" },
    gallery: [],
    specs: [],
  },
];
export const contactFormCopy = {};
`,
      "utf8",
    );

    const scriptPath = resolve(process.cwd(), "scripts/sync-products.py");
    const { stdout } = await execFile("python3", [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PROJECT_NOOR_ROOT: root,
      },
    });

    const result = JSON.parse(stdout);
    expect(result).toMatchObject({
      success: true,
      added: 1,
      updated: 0,
      total: 1,
    });

    const siteContent = await readFile(join(root, "src/data/site.ts"), "utf8");
    expect(siteContent).toContain('collection: "gift-sets"');
    expect(siteContent).toContain('"premium"');
  });
});
