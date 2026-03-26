import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import type { SiteContent } from "@/src/lib/catalog-types";
import { importProducts } from "@/src/lib/product-import";

async function createSiteContentFixture() {
  const dir = await mkdtemp(join(tmpdir(), "tranquilbeads-import-"));
  const filePath = join(dir, "site-content.json");
  const content: SiteContent = {
    siteSettings: {
      brandName: "TranquilBeads",
      tagline: {
        en: "Elegant tasbih and Islamic culture products for modern wholesale partners.",
        ar: "تسابيح ومنتجات ثقافية إسلامية راقية لشركاء الجملة والتوزيع.",
      },
      email: "sales@tranquilbeads.com",
      whatsappHref: "https://wa.me/8618929564545",
      whatsappDisplay: "+86 189 2956 4545",
      socialProof: [],
    },
    collections: [
      {
        slug: "signature-tasbih",
        name: {
          en: "Signature Tasbih",
          ar: "تسابيح مميزة",
        },
        description: {
          en: "Premium prayer beads.",
          ar: "تسابيح راقية.",
        },
        heroImage: "/images/collection-signature.svg",
        featured: true,
        overview: {
          en: "Overview",
          ar: "نظرة عامة",
        },
        positioning: {
          en: "Positioning",
          ar: "تموضع",
        },
        highlightPoints: {
          en: ["Natural material stories"],
          ar: ["قصص خامات طبيعية"],
        },
      },
    ],
    products: [],
  };

  await writeFile(filePath, JSON.stringify(content, null, 2), "utf8");

  return { dir, filePath };
}

describe("importProducts", () => {
  it("normalizes import payloads into site products and fills locale fallbacks", async () => {
    const { filePath } = await createSiteContentFixture();

    const result = await importProducts({
      filePath,
      confirm: true,
      payload: {
        products: [
          {
            collection_slug: "signature-tasbih",
            title: {
              en: "Lapis Focus Tasbih",
            },
            summary: {
              en: "Polished stone tasbih for gifting.",
            },
            material: {
              en: "Lapis and brass",
            },
            tags: {
              en: ["Tasbih", "Stone"],
            },
            detail_intro: {
              en: "A polished 33-bead format.",
            },
            detail_body: {
              en: "Built for premium gifting shelves.",
            },
            ideal_for: {
              en: "Boutiques and Ramadan gifting",
            },
            hero_image: {
              url: "/images/imported/lapis-focus/hero.jpg",
              alt: {
                en: "Lapis Focus Tasbih hero",
              },
            },
            gallery: [
              {
                url: "/images/imported/lapis-focus/detail-1.jpg",
                alt: {
                  en: "Lapis Focus detail 1",
                },
              },
            ],
            specs: [
              {
                key: "bead_count",
                label: {
                  en: "Bead count",
                },
                value: {
                  en: "33 beads",
                },
              },
            ],
          },
        ],
      },
    });

    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.products[0]?.slug).toBe("lapis-focus-tasbih");
    expect(result.products[0]?.title.ar).toBe("Lapis Focus Tasbih");
    expect(result.products[0]?.image).toBe("/images/imported/lapis-focus/hero.jpg");

    const saved = JSON.parse(await readFile(filePath, "utf8")) as SiteContent;
    expect(saved.products).toHaveLength(1);
    expect(saved.products[0]?.heroAlt.ar).toBe("Lapis Focus Tasbih hero");
  });

  it("supports dry run mode without mutating site content", async () => {
    const { filePath } = await createSiteContentFixture();
    const before = await readFile(filePath, "utf8");

    const result = await importProducts({
      filePath,
      confirm: false,
      payload: {
        products: [
          {
            collection_slug: "signature-tasbih",
            title: {
              en: "Dry Run Tasbih",
              ar: "سبحة تجريبية",
            },
            summary: {
              en: "Preview only",
              ar: "للمعاينة فقط",
            },
            material: {
              en: "Wood",
              ar: "خشب",
            },
            tags: {
              en: ["Preview"],
              ar: ["معاينة"],
            },
            detail_intro: {
              en: "Preview intro",
              ar: "مقدمة معاينة",
            },
            detail_body: {
              en: "Preview body",
              ar: "محتوى المعاينة",
            },
            ideal_for: {
              en: "Sampling",
              ar: "للعينات",
            },
            hero_image: {
              url: "/images/imported/dry-run/hero.jpg",
              alt: {
                en: "Dry Run hero",
                ar: "الصورة الرئيسية للمعاينة",
              },
            },
            gallery: [],
            specs: [],
          },
        ],
      },
    });

    expect(result.dryRun).toBe(true);
    expect(result.created).toBe(1);
    expect(await readFile(filePath, "utf8")).toBe(before);
  });
});
