import { describe, expect, it } from "vitest";

import {
  buildAmazonRetailCatalog,
  getAmazonBuyUrl,
  getAmazonSearchLinks,
  normalizeAmazonImageFingerprint,
  type AmazonRetailSeed,
} from "@/src/lib/amazon-retail";
import { amazonRetailProducts } from "@/src/data/amazon-products";

describe("Amazon retail catalog", () => {
  it("dedupes AE, SA, and DE products by the first image fingerprint", () => {
    const seeds: AmazonRetailSeed[] = [
      {
        market: "AE",
        sellerSku: "amber-ae",
        asin: "B0AE111111",
        title: "Amber Tasbih AE",
        status: "DISCOVERABLE",
        heroImage: "https://m.media-amazon.com/images/I/same.jpg",
        firstImageFingerprint: "same-first-image",
      },
      {
        market: "SA",
        sellerSku: "amber-sa",
        asin: "B0SA111111",
        title: "Amber Tasbih SA",
        status: "DISCOVERABLE,BUYABLE",
        heroImage: "https://m.media-amazon.com/images/I/same.jpg",
        firstImageFingerprint: "same-first-image",
      },
      {
        market: "DE",
        sellerSku: "amber-de",
        asin: "B0DE111111",
        title: "Amber Tasbih DE",
        status: "DISCOVERABLE,BUYABLE",
        heroImage: "https://m.media-amazon.com/images/I/same.jpg",
        firstImageFingerprint: "same-first-image",
      },
    ];

    const catalog = buildAmazonRetailCatalog(seeds);

    expect(catalog).toHaveLength(1);
    expect(catalog[0].markets).toEqual(["AE", "SA", "DE"]);
    expect(catalog[0].retailLinks).toEqual({
      AE: "https://www.amazon.ae/dp/B0AE111111",
      SA: "https://www.amazon.sa/dp/B0SA111111",
      DE: "https://www.amazon.de/dp/B0DE111111",
    });
  });

  it("prefers a BUYABLE ASIN when the same market shares a first image", () => {
    const catalog = buildAmazonRetailCatalog([
      {
        market: "AE",
        sellerSku: "resin-l",
        asin: "B0NOTBUYABLE",
        title: "Resin Tasbih L",
        status: "DISCOVERABLE",
        heroImage: "https://m.media-amazon.com/images/I/resin.jpg",
        firstImageFingerprint: "same-resin-image",
      },
      {
        market: "AE",
        sellerSku: "resin-s",
        asin: "B0BUYABLE",
        title: "Resin Tasbih S",
        status: "DISCOVERABLE,BUYABLE",
        heroImage: "https://m.media-amazon.com/images/I/resin.jpg",
        firstImageFingerprint: "same-resin-image",
      },
    ]);

    expect(catalog[0].retailLinks.AE).toBe("https://www.amazon.ae/dp/B0BUYABLE");
  });

  it("normalizes Amazon image size suffixes before deduping", () => {
    expect(
      normalizeAmazonImageFingerprint("https://m.media-amazon.com/images/I/51GT5TVIJfL._AC_SX342_.jpg"),
    ).toBe("https://m.media-amazon.com/images/I/51GT5TVIJfL.jpg");

    const catalog = buildAmazonRetailCatalog([
      {
        market: "AE",
        sellerSku: "kuka-ae",
        asin: "B0AEKUKA",
        title: "Kuka AE",
        status: "DISCOVERABLE",
        heroImage: "https://m.media-amazon.com/images/I/51GT5TVIJfL._AC_SX425_.jpg",
        firstImageFingerprint: "https://m.media-amazon.com/images/I/51GT5TVIJfL._AC_SX425_.jpg",
      },
      {
        market: "DE",
        sellerSku: "kuka-de",
        asin: "B0DEKUKA",
        title: "Kuka DE",
        status: "DISCOVERABLE",
        heroImage: "https://m.media-amazon.com/images/I/51GT5TVIJfL._AC_SX342_.jpg",
        firstImageFingerprint: "https://m.media-amazon.com/images/I/51GT5TVIJfL._AC_SX342_.jpg",
      },
    ]);

    expect(catalog).toHaveLength(1);
    expect(catalog[0].markets).toEqual(["AE", "DE"]);
  });

  it("exposes Amazon search links and generated product buy links", () => {
    expect(getAmazonSearchLinks()).toEqual({
      AE: "https://www.amazon.ae/s?k=TranquilBeads",
      SA: "https://www.amazon.sa/s?k=TranquilBeads",
      DE: "https://www.amazon.de/s?k=TranquilBeads",
    });
    expect(getAmazonBuyUrl("DE", "B0TEST")).toBe("https://www.amazon.de/dp/B0TEST");
  });

  it("uses Amazon media images and direct marketplace buy links", () => {
    expect(amazonRetailProducts.length).toBeGreaterThan(0);

    for (const product of amazonRetailProducts) {
      expect(product.heroImage).toContain("m.media-amazon.com/images/");

      for (const market of product.markets) {
        expect(product.retailLinks[market]).toContain(
          market === "AE"
            ? "amazon.ae/dp/"
            : market === "SA"
              ? "amazon.sa/dp/"
              : "amazon.de/dp/",
        );
      }
    }
  });
});
