import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { blogArticles } from "@/src/data/blog-articles";
import { getCollectionBySlug, getProductBySlug } from "@/src/data/site";
import {
  buildBlogArticleJsonLd,
  buildBlogArticleMetadata,
  buildBlogFaqJsonLd,
  buildBreadcrumbJsonLd,
  buildProductMetadata,
  buildRetailBreadcrumbJsonLd,
  buildRetailItemListJsonLd,
  getRealProductImages,
} from "@/src/lib/seo";
import { getProductRetailLinks } from "@/src/lib/product-retail-links";

describe("SEO helpers", () => {
  it("builds product metadata with a wholesale title and real product images", () => {
    const collection = getCollectionBySlug("signature-tasbih");
    const product = getProductBySlug("natural-kuka-wood-tasbih");

    expect(collection).toBeDefined();
    expect(product).toBeDefined();

    const metadata = buildProductMetadata("en", collection!, product!);

    expect(metadata.title).toBe("Natural Kuka Wood Tasbih Wholesale");
    expect(metadata.description).toContain("Wholesale: MOQ 100");
    expect(metadata.description).toContain("private label packaging");
    expect(metadata.alternates?.canonical).toBe(
      "https://www.tranquilbeads.com/en/collections/signature-tasbih/natural-kuka-wood-tasbih",
    );
    expect(getRealProductImages(product!)[0]).toContain("/images/imported/natural-kuka-wood-tasbih/");
  });

  it("emits Breadcrumb structured data for wholesale catalogue pages", () => {
    const collection = getCollectionBySlug("gift-sets");
    const product = getProductBySlug("baltic-amber-gift-set");

    expect(collection).toBeDefined();
    expect(product).toBeDefined();

    const breadcrumbJsonLd = buildBreadcrumbJsonLd("en", collection!, product!);

    expect(breadcrumbJsonLd.itemListElement).toHaveLength(4);
    expect(breadcrumbJsonLd.itemListElement[3]?.name).toBe("Baltic Amber Gift Set");
  });

  it("adds priorities, change frequency, and image sitemap entries", () => {
    const entries = sitemap();
    const home = entries.find((entry) => entry.url === "https://www.tranquilbeads.com/en");
    const product = entries.find((entry) =>
      entry.url.endsWith("/en/collections/signature-tasbih/natural-kuka-wood-tasbih"),
    );
    const amberGuide = entries.find((entry) =>
      entry.url.endsWith("/en/blog/how-to-identify-real-amber-tasbih"),
    );

    expect(home).toMatchObject({
      changeFrequency: "weekly",
      priority: 1,
    });
    expect(product?.priority).toBe(0.86);
    expect(product?.images?.some((image) => image.includes("/images/imported/natural-kuka-wood-tasbih/"))).toBe(true);
    expect(amberGuide?.priority).toBe(0.78);
    expect(amberGuide?.images).toContain("https://www.tranquilbeads.com/images/real-products/baltic-amber/hero.jpeg");
  });

  it("builds blog article metadata and FAQ structured data", () => {
    const article = blogArticles.find((item) => item.slug === "how-to-identify-real-amber-tasbih");

    expect(article).toBeDefined();

    const metadata = buildBlogArticleMetadata("en", article!);
    const articleJsonLd = buildBlogArticleJsonLd("en", article!);
    const faqJsonLd = buildBlogFaqJsonLd("en", article!);

    expect(metadata.title).toBe("How to Tell if Amber Tasbih Is Real: Safe Tests for Buyers");
    expect(metadata.description).toContain("Safe amber tasbih authentication guide");
    expect(metadata.openGraph?.type).toBe("article");
    expect(articleJsonLd["@type"]).toBe("Article");
    expect(articleJsonLd.dateModified).toBe("2026-06-27");
    expect(faqJsonLd?.["@type"]).toBe("FAQPage");
    expect(faqJsonLd?.mainEntity).toHaveLength(4);
    expect(faqJsonLd?.mainEntity[3].acceptedAnswer.text).toContain("professional laboratory");
  });

  it("links every blog guide to real catalog products", () => {
    for (const article of blogArticles) {
      expect(article.relatedProductSlugs.length).toBeGreaterThan(0);

      for (const productSlug of article.relatedProductSlugs) {
        const product = getProductBySlug(productSlug);
        const retailLinks = getProductRetailLinks(productSlug, "en");

        expect(product, `${article.slug} references ${productSlug}`).toBeDefined();
        expect(product?.image).toMatch(/^\/images\//);
        expect(retailLinks.length, `${productSlug} has retail links`).toBeGreaterThan(0);
        expect(
          retailLinks.some((link) => (
            link.href.includes("amazon.") || link.href.includes("noon.com")
          )),
        ).toBe(true);
      }
    }
  });

  it("builds retail ItemList and Breadcrumb structured data", () => {
    const itemList = buildRetailItemListJsonLd("en", "/amazon", "Amazon retail", [
      {
        slug: "amber-test",
        title: "Amber Tasbih 33 Beads",
        asin: "B0TEST",
        heroImage: "https://m.media-amazon.com/images/I/test.jpg",
        markets: ["AE", "SA"],
      },
    ]);
    const breadcrumb = buildRetailBreadcrumbJsonLd("en", "/amazon", "Amazon Retail");

    expect(itemList["@type"]).toBe("ItemList");
    expect(itemList.numberOfItems).toBe(1);
    expect(itemList.itemListElement[0].item["@type"]).toBe("Thing");
    expect(itemList.itemListElement[0].item.identifier).toBe("B0TEST");
    expect(itemList.itemListElement[0].item.offers).toBeUndefined();
    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    expect(breadcrumb.itemListElement[1].item).toBe("https://www.tranquilbeads.com/en/amazon");
  });
});
