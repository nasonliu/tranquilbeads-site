import { describe, expect, it } from "vitest";

import {
  buildNoonRetailCatalog,
  getNoonStoreLinks,
  type NoonRetailSeed,
} from "@/src/lib/noon-retail";
import { noonRetailProducts } from "@/src/data/noon-products";

describe("Noon retail catalog", () => {
  it("dedupes UAE and Saudi products by the first image fingerprint", () => {
    const seeds: NoonRetailSeed[] = [
      {
        market: "uae",
        slug: "amber-tasbih-uae",
        title: { en: "Amber Tasbih UAE", ar: "مسبحة كهرمان" },
        summary: { en: "UAE offer", ar: "عرض الإمارات" },
        material: { en: "Amber", ar: "كهرمان" },
        heroImage: "https://f.nooncdn.com/p/demo/first.jpg",
        firstImageFingerprint: "same-first-image",
        noonUrl: "https://www.noon.com/uae-en/demo/Z123/p/",
      },
      {
        market: "saudi",
        slug: "amber-tasbih-saudi",
        title: { en: "Amber Tasbih Saudi", ar: "مسبحة كهرمان" },
        summary: { en: "Saudi offer", ar: "عرض السعودية" },
        material: { en: "Amber", ar: "كهرمان" },
        heroImage: "https://f.nooncdn.com/p/demo/first.jpg",
        firstImageFingerprint: "same-first-image",
        noonUrl: "https://www.noon.com/saudi-en/demo/Z123/p/",
      },
    ];

    const catalog = buildNoonRetailCatalog(seeds);

    expect(catalog).toHaveLength(1);
    expect(catalog[0].slug).toBe("amber-tasbih-uae");
    expect(catalog[0].markets).toEqual(["uae", "saudi"]);
    expect(catalog[0].retailLinks).toEqual({
      noonUae: "https://www.noon.com/uae-en/demo/Z123/p/",
      noonSaudi: "https://www.noon.com/saudi-en/demo/Z123/p/",
    });
  });

  it("exposes both regional Noon store links", () => {
    expect(getNoonStoreLinks()).toEqual({
      uae: "https://www.noon.com/uae-en/tranquilbeads/",
      saudi: "https://www.noon.com/saudi-en/tranquilbeads/",
    });
  });

  it("uses current Noon listing links and locally cached Noon product images", () => {
    expect(noonRetailProducts.length).toBeGreaterThan(0);

    for (const product of noonRetailProducts) {
      expect(product.heroImage).toMatch(/^\/images\/noon\/.+\.jpg$/);

      for (const link of Object.values(product.retailLinks)) {
        if (!link) {
          continue;
        }

        expect(link).toContain("noon.com/");
        expect(link).toContain("/p/?o=");
      }
    }
  });
});
