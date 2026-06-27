import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { getCollectionBySlug, getProductBySlug } from "@/src/data/site";
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  buildProductMetadata,
  getRealProductImages,
} from "@/src/lib/seo";

describe("SEO helpers", () => {
  it("builds product metadata with a wholesale title and real product images", () => {
    const collection = getCollectionBySlug("signature-tasbih");
    const product = getProductBySlug("natural-kuka-wood-tasbih");

    expect(collection).toBeDefined();
    expect(product).toBeDefined();

    const metadata = buildProductMetadata("en", collection!, product!);

    expect(metadata.title).toBe("Natural Kuka Wood Tasbih Wholesale");
    expect(metadata.description).toContain("Wholesale tasbih sourcing");
    expect(metadata.alternates?.canonical).toBe(
      "https://www.tranquilbeads.com/en/collections/signature-tasbih/natural-kuka-wood-tasbih",
    );
    expect(getRealProductImages(product!)[0]).toContain("/images/imported/natural-kuka-wood-tasbih/");
  });

  it("emits Product and Breadcrumb structured data for product pages", () => {
    const collection = getCollectionBySlug("gift-sets");
    const product = getProductBySlug("baltic-amber-gift-set");

    expect(collection).toBeDefined();
    expect(product).toBeDefined();

    const productJsonLd = buildProductJsonLd("en", collection!, product!);
    const breadcrumbJsonLd = buildBreadcrumbJsonLd("en", collection!, product!);

    expect(productJsonLd["@type"]).toBe("Product");
    expect(productJsonLd.name).toBe("Baltic Amber Gift Set");
    expect(productJsonLd.image.every((image) => image.startsWith("https://www.tranquilbeads.com/images/"))).toBe(true);
    expect(breadcrumbJsonLd.itemListElement).toHaveLength(4);
  });

  it("adds priorities, change frequency, and image sitemap entries", () => {
    const entries = sitemap();
    const home = entries.find((entry) => entry.url === "https://www.tranquilbeads.com/en");
    const product = entries.find((entry) =>
      entry.url.endsWith("/en/collections/signature-tasbih/natural-kuka-wood-tasbih"),
    );

    expect(home).toMatchObject({
      changeFrequency: "weekly",
      priority: 1,
    });
    expect(product?.priority).toBe(0.86);
    expect(product?.images?.some((image) => image.includes("/images/imported/natural-kuka-wood-tasbih/"))).toBe(true);
  });
});
