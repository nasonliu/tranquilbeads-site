import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { manifestFirstImageOrder, resumableManifestPrefix } from "../scripts/retail-catalog-import-utils.mjs";

type Variant = { sku: string; amountMinor?: number; onHand?: number; readiness: string; optionValues?: { en?: Record<string, string> } };
type Style = { code: string; variants: Variant[] };
type Product = { sku: string; slug: string; images: string[]; readiness: string; styles: Style[]; source: { canonicalProductKey: string; price?: { amountMinor: number } | null } };
type Manifest = { expectedCount: number; products: Product[] };

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "scripts/retail-catalog-30-preview.json"), "utf8")) as Manifest;

describe("retail 30-product import manifest", () => {
  it("has a fixed 30-product identity set and only publishes verified candidates", () => {
    expect(manifest.expectedCount).toBe(30);
    expect(manifest.products).toHaveLength(30);
    expect(new Set(manifest.products.map((product) => product.sku)).size).toBe(30);
    expect(new Set(manifest.products.map((product) => product.slug)).size).toBe(30);

    const ready = manifest.products.filter((product) => product.readiness === "ready");
    const pending = manifest.products.filter((product) => product.readiness !== "ready");
    expect(ready.length).toBeGreaterThan(0);
    expect(pending.length).toBeGreaterThan(0);
    expect(ready.every((product) => product.styles.flatMap((style) => style.variants).every((variant) => variant.readiness === "ready" && Number.isInteger(variant.amountMinor) && Number.isInteger(variant.onHand)))).toBe(true);
    expect(pending.every((product) => product.styles.flatMap((style) => style.variants).every((variant) => variant.readiness !== "ready" && variant.amountMinor === undefined && variant.onHand === undefined))).toBe(true);
    expect(ready.every((product) => Number.isInteger(product.source.price?.amountMinor))).toBe(true);
  });

  it("uses a strict canonical/source/main-image identity set", () => {
    expect(new Set(manifest.products.map((product) => product.source.canonicalProductKey)).size).toBe(30);
    expect(manifest.products.every((product) => product.source.canonicalProductKey.length > 0)).toBe(true);
    expect(manifest.products.every((product) => product.images.length >= 2 && product.images[0].length > 0)).toBe(true);
    expect(new Set(manifest.products.map((product) => product.images[0])).size).toBe(30);
  });

  it("keeps only the verified Kuka 33-bead SKU", () => {
    const kuka = manifest.products.find((product) => product.slug === "kuka-wood-tasbih");
    expect(kuka?.readiness).toBe("ready");
    expect(kuka?.styles.map((style) => style.code)).toEqual(["KUKA-33"]);
    expect(kuka?.styles.flatMap((style) => style.variants.map((variant) => variant.sku))).toEqual(["DR-KUKA-WOOD-33"]);
    expect(kuka?.styles.flatMap((style) => style.variants).some((variant) => "Bead diameter" in (variant.optionValues?.en ?? {}))).toBe(false);
  });

  it("only references checked-in local image paths", () => {
    const localImages = manifest.products.flatMap((product) => product.images.filter((image) => image.startsWith("/")));
    expect(localImages.length).toBeGreaterThan(0);
    for (const image of localImages) expect(fs.existsSync(path.join(root, "public", image))).toBe(true);
  });

  it("rejects both exact and perceptual cross-product image duplicates before upload", () => {
    const importer = fs.readFileSync(path.join(root, "scripts/import-retail-hot-products-preview.mjs"), "utf8");
    expect(importer).toContain("globalHashes");
    expect(importer).toContain("globalVisuals");
    expect(importer).toContain("Cross-product near-duplicate image");
  });

  it("puts the reviewed manifest gallery before unrelated existing media", () => {
    const existing = [
      { id: "old-1", url: "https://blob.example/old-1.jpg", position: 0 },
      { id: "old-2", url: "https://blob.example/old-2.jpg", position: 1 },
      { id: "manifest-1", url: "https://blob.example/manifest-1.jpg", position: 2 },
      { id: "manifest-2", url: "https://blob.example/manifest-2.jpg", position: 3 },
    ];
    const manifestImages = [
      { id: "manifest-1", url: "https://blob.example/manifest-1.jpg" },
      { id: "manifest-2", url: "https://blob.example/manifest-2.jpg" },
    ];
    expect(manifestFirstImageOrder(existing, manifestImages).map((image) => image.id))
      .toEqual(["manifest-1", "manifest-2", "old-1", "old-2"]);
    expect(() => manifestFirstImageOrder(existing, [{ id: "missing", url: "https://blob.example/missing.jpg" }]))
      .toThrow("Manifest image readback mismatch");
  });

  it("only resumes an exact checksum, alt-text, and position prefix", () => {
    const existing = [
      { position: 0, sha256: "a".repeat(64), alt_en: "Amber — view 1", alt_ar: "عنبر — صورة 1" },
      { position: 1, sha256: "b".repeat(64), alt_en: "Amber — view 2", alt_ar: "عنبر — صورة 2" },
    ];
    const prepared = [{ sha256: "a".repeat(64) }, { sha256: "b".repeat(64) }, { sha256: "c".repeat(64) }];
    const alt = (index: number) => ({ altEn: `Amber — view ${index + 1}`, altAr: `عنبر — صورة ${index + 1}` });
    expect(resumableManifestPrefix(existing, prepared, alt)).toBe(2);
    expect(() => resumableManifestPrefix([{ ...existing[0], sha256: "c".repeat(64) }], prepared, alt))
      .toThrow("Existing gallery image 1 is not an exact manifest match");
    expect(() => resumableManifestPrefix([{ ...existing[0], position: 1 }], prepared, alt))
      .toThrow("Existing gallery image 1 is not an exact manifest match");
  });

  it("verifies the exact Vercel project before loading the write credential", () => {
    const importer = fs.readFileSync(path.join(root, "scripts/import-retail-hot-products-preview.mjs"), "utf8");
    expect(importer).toContain('const VERCEL_PROJECT = "tranquilbeads-site"');
    expect(importer).toContain('const VERCEL_SCOPE = "tranquilbeads"');
    expect(importer).toContain('["inspect", origin, "--json", "--scope", VERCEL_SCOPE]');
    expect(importer).toContain("deployment?.target !== expectedTarget");
    expect(importer).toContain('production ? "production" : "preview"');
    expect(importer.indexOf("await assertTrustedDeployment")).toBeLessThan(importer.indexOf("const token = configuredToken()"));
    expect(importer.indexOf("await assertTrustedDeployment")).toBeLessThan(importer.indexOf("dotenv.config({ path: envFile"));
    expect(importer).toContain("--base-url is required when --env-file contains the write credential");
  });

  it("derives update idempotency keys from the exact payload", () => {
    const importer = fs.readFileSync(path.join(root, "scripts/import-retail-hot-products-preview.mjs"), "utf8");
    expect(importer).toContain("function actionKey(scope, payload)");
    expect(importer).toContain('actionKey(`${product.slug}:core`, coreUpdate)');
    expect(importer).toContain("Never send it through the update path");
    expect(importer).toContain('actionKey(`${product.slug}:content`, contentUpdate)');
    expect(importer).toContain('actionKey(`${product.slug}:style:${style.code}:update`, request)');
    expect(importer).toContain('actionKey(`${product.slug}:variant:${variant.sku}:update`, updateRequest)');
    expect(importer).toContain("SKU and style association are identity fields");
    expect(importer).toContain("delete updateRequest.optionValues");
    expect(importer).toContain("zh: zhValue?.trim() ? zhValue : en");
    expect(importer).toContain("importable.slice(startAfterIndex + 1)");
    expect(importer).toContain('const maxAttempts = method === "GET" ? 3 : 1');
    expect(importer).toContain("ownsDefaultVariant");
    expect(importer).toContain("archive-conflict");
    expect(importer).not.toContain("if (uploaded[index]) continue");
    expect(importer).toContain("manifestFirstImageOrder(record.images, manifestImages)");
    expect(importer).toContain('argument("--idempotency-namespace")');
    expect(importer).toContain('process.argv.includes("--resume-existing-gallery")');
    expect(importer).toContain("if (index < resumedImageCount) continue");
    expect(importer).toContain("resumableManifestPrefix(record.images ?? [], product.preparedImages");
    expect(importer).toContain('toFormat("jpeg")');
    expect(importer).toContain("--resume-existing-gallery requires --idempotency-namespace");
    expect(importer).toContain("--logistics-only");
    expect(importer).toContain("Variant logistics readback mismatch");
    expect(importer).toContain('actionKey(`${product.slug}:variant:${variant.sku}:logistics`, request)');
  });
});
