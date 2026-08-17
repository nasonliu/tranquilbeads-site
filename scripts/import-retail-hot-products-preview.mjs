#!/usr/bin/env node

import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import sharp from "sharp";

import { manifestFirstImageOrder } from "./retail-catalog-import-utils.mjs";

const PREVIEW_HOST_SUFFIX = ".vercel.app";
const VERCEL_PROJECT = "tranquilbeads-site";
const VERCEL_SCOPE = "tranquilbeads";
const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(scriptDir, "retail-catalog-30-preview.json");
let vercelCliPath;

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function stableUuid(value) {
  const bytes = crypto.createHash("sha256").update(`tranquilbeads-retail-preview:${value}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function actionKey(scope, payload) {
  return stableUuid(`${scope}:${JSON.stringify(payload)}`);
}

function configuredToken() {
  if (process.env.RETAIL_AGENT_PREVIEW_IMPORT_TOKEN) return process.env.RETAIL_AGENT_PREVIEW_IMPORT_TOKEN;
  if (process.env.RETAIL_AGENT_TOKEN) return process.env.RETAIL_AGENT_TOKEN;
  const configured = JSON.parse(process.env.RETAIL_AGENT_OPERATORS_JSON || "[]");
  const operator = configured.find((value) => value && typeof value.token === "string" && value.token.length >= 32);
  if (!operator) throw new Error("No configured retail agent credential is available");
  return operator.token;
}

function assertVercelDeploymentUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname.endsWith(PREVIEW_HOST_SUFFIX)) {
    throw new Error("This importer only accepts an HTTPS Vercel deployment URL");
  }
  return url.origin;
}

async function assertTrustedDeployment(value, expectedTarget) {
  const origin = assertVercelDeploymentUrl(value);
  if (!vercelCliPath) throw new Error("Vercel CLI verification is required before loading the retail agent credential");
  let deployment;
  try {
    const { stdout } = await execFileAsync(
      vercelCliPath,
      ["inspect", origin, "--json", "--scope", VERCEL_SCOPE],
      { maxBuffer: 10 * 1024 * 1024 },
    );
    deployment = JSON.parse(stdout);
  } catch {
    throw new Error("Unable to verify the target Vercel Preview deployment");
  }
  if (
    deployment?.name !== VERCEL_PROJECT
    || deployment?.target !== expectedTarget
    || deployment?.readyState !== "READY"
    || `https://${deployment?.url}` !== origin
  ) {
    throw new Error(`The target is not a READY ${expectedTarget} deployment of the configured Vercel project`);
  }
  return origin;
}

async function apiJson(baseUrl, token, pathname, options = {}) {
  let action = "";
  if (options.body && typeof options.body === "string") {
    try { action = JSON.parse(options.body)?.action || ""; } catch { action = ""; }
  }
  if (process.argv.includes("--debug-actions") && action) {
    console.log(JSON.stringify({ pathname, payload: JSON.parse(options.body) }, null, 2));
  }
  const operation = `${options.method || "GET"} ${pathname}${action ? ` (${action})` : ""}`;
  if (vercelCliPath) {
    const method = options.method || "GET";
    const curlArgs = ["curl", pathname, "--deployment", baseUrl, "--yes", "--", "--silent", "--show-error", "--request", method, "--header", `Authorization: Bearer ${token}`];
    if (options.body) curlArgs.push("--header", "Content-Type: application/json", "--data-binary", options.body);
    let stdout;
    const maxAttempts = method === "GET" ? 3 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        ({ stdout } = await execFileAsync(vercelCliPath, curlArgs, { maxBuffer: 10 * 1024 * 1024 }));
        break;
      } catch {
        if (attempt === maxAttempts) throw new Error(`${operation} failed through Vercel protected transport`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
    const data = JSON.parse(stdout);
    if (data.ok !== true) throw new Error(`${operation} failed (${data.error || "unknown"})`);
    return data;
  }
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok !== true) throw new Error(`${operation} failed (${response.status} ${data.error || "unknown"})`);
  return data;
}

async function uploadImage(baseUrl, token, productId, item, prepared, index) {
  const idempotencyKey = stableUuid(`${item.slug}:image:${prepared.sourceUrl}`);
  const altEn = `${item.titleEn} — view ${index + 1}`;
  const altAr = `${item.titleAr} — صورة ${index + 1}`;
  if (vercelCliPath) {
    const args = ["curl", "/api/agent/retail/media", "--deployment", baseUrl, "--yes", "--", "--silent", "--show-error", "--request", "POST", "--header", `Authorization: Bearer ${token}`, "--form", `productId=${productId}`, "--form", `idempotencyKey=${idempotencyKey}`, "--form", `altEn=${altEn}`, "--form", `altAr=${altAr}`, "--form", `file=@${prepared.target};type=image/jpeg`];
    let stdout;
    try { ({ stdout } = await execFileAsync(vercelCliPath, args, { maxBuffer: 10 * 1024 * 1024 })); }
    catch { throw new Error(`Image upload failed through Vercel protected transport for ${item.slug}`); }
    const data = JSON.parse(stdout);
    if (data.ok !== true || !data.image?.id || !data.image?.url) throw new Error(`Image upload failed for ${item.slug} (${data.error || "unknown"})`);
    return data.image;
  }
  const form = new FormData();
  form.set("productId", productId);
  form.set("idempotencyKey", idempotencyKey);
  form.set("altEn", altEn);
  form.set("altAr", altAr);
  form.set("file", new Blob([await fs.readFile(prepared.target)], { type: "image/jpeg" }), path.basename(prepared.target));
  const response = await fetch(`${baseUrl}/api/agent/retail/media`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok !== true || !data.image?.id || !data.image?.url) throw new Error(`Image upload failed for ${item.slug} (${response.status} ${data.error || "unknown"})`);
  return data.image;
}

async function snapshot(baseUrl, token) {
  return (await apiJson(baseUrl, token, "/api/agent/retail/catalog")).snapshot;
}

function productFromSnapshot(current, item) {
  const bySku = current.products.find((product) => product.sku === item.sku);
  const bySlug = current.products.find((product) => product.slug === item.slug);
  if (bySku && bySlug && bySku.public_id !== bySlug.public_id) throw new Error(`SKU/slug collision for ${item.slug}`);
  if ((bySku && bySku.slug !== item.slug) || (bySlug && bySlug.sku !== item.sku)) throw new Error(`Existing product identity mismatch for ${item.slug}`);
  return bySku || bySlug;
}

async function downloadImage(url, target) {
  let input;
  if (url.startsWith("/")) {
    const publicDirectory = path.resolve(scriptDir, "..", "public");
    const source = path.resolve(publicDirectory, `.${url}`);
    if (!source.startsWith(`${publicDirectory}${path.sep}`)) throw new Error("Unapproved local image path");
    input = await fs.readFile(source);
  } else {
    const parsed = new URL(url);
    if (!new Set(["m.media-amazon.com", "f.nooncdn.com"]).has(parsed.hostname)) throw new Error(`Unapproved image host: ${parsed.hostname}`);
    let response;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; TranquilBeadsCatalog/1.0)" } });
        if (response.ok || response.status < 500) break;
      } catch {
        if (attempt === 3) throw new Error(`Image download failed for ${parsed.hostname}`);
      }
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
    if (!response) throw new Error(`Image download failed for ${parsed.hostname}`);
    if (!response.ok) throw new Error(`Image download failed (${response.status}) for ${parsed.hostname}`);
    input = Buffer.from(await response.arrayBuffer());
  }
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 300 || metadata.height < 300) throw new Error(`Image is too small: ${url}`);
  const normalized = await sharp(input).rotate().jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  await fs.writeFile(target, normalized);
  const visual = await sharp(normalized).resize(16, 16, { fit: "fill" }).greyscale().raw().toBuffer();
  return { sha256: crypto.createHash("sha256").update(normalized).digest("hex"), visual };
}

function visualDistance(left, right) {
  let total = 0;
  for (let index = 0; index < left.length; index += 1) total += Math.abs(left[index] - right[index]);
  return total / left.length;
}

async function prepareImages(items, directory) {
  const globalHashes = new Map();
  const globalVisuals = [];
  for (const item of items) {
    const prepared = [];
    for (const [index, url] of item.images.entries()) {
      const target = path.join(directory, `${item.slug}-${index + 1}.jpg`);
      let details;
      try { details = await downloadImage(url, target); }
      catch (error) {
        process.stderr.write(`Skipping unusable image ${index + 1} for ${item.slug}: ${error instanceof Error ? error.message.split(": https://")[0] : "validation failed"}\n`);
        continue;
      }
      const exactOwner = globalHashes.get(details.sha256);
      if (exactOwner && exactOwner !== item.slug) throw new Error(`Cross-product duplicate image: ${exactOwner} and ${item.slug}`);
      const visualOwner = globalVisuals.find((image) => image.owner !== item.slug && visualDistance(image.visual, details.visual) < 0.25);
      if (visualOwner) throw new Error(`Cross-product near-duplicate image: ${visualOwner.owner} and ${item.slug}`);
      globalHashes.set(details.sha256, item.slug);
      globalVisuals.push({ owner: item.slug, visual: details.visual });
      // Keep distinct gallery URLs unless their normalized thumbnails are
      // effectively identical.  A broader threshold discarded legitimate
      // alternate product angles supplied by Amazon.
      if (prepared.some((image) => visualDistance(image.visual, details.visual) < 0.05)) continue;
      prepared.push({ target, sourceUrl: url, ...details });
      if (prepared.length === 8) break;
    }
    if (prepared.length < 2) throw new Error(`Fewer than two distinct images for ${item.slug}`);
    item.preparedImages = prepared;
  }
}

// The storefront intentionally exposes retail copy in English and Arabic only.
// Legacy database validators still require a non-empty `zh` compatibility
// value, so keep it internal and fall back to the verified English source.
function localized(en, ar, zhValue) { return { en, ar, zh: zhValue?.trim() ? zhValue : en }; }

function zh(value) { return value ?? ""; }
function localizedOptions(values = {}) {
  return { en: values.en ?? {}, ar: values.ar ?? {}, zh: values.zh ?? values.en ?? {} };
}

function readyVariants(product) {
  return product.styles.flatMap((style) => style.variants.filter((variant) => variant.readiness === "ready").map((variant) => ({ style, variant })));
}

// Current retail Tasbih stock uses the same verified gift-box parcel profile.
// Keep this explicit in the import request so checkout never invents missing
// shipping facts. An operator can later replace these per SKU in Catalog.
const standardTasbihParcel = {
  shippingWeightGrams: 250,
  packageLengthMm: 160,
  packageWidthMm: 110,
  packageHeightMm: 55,
  customsDescriptionEn: "Prayer beads in gift box",
  originCountry: "CN",
  dangerousGoods: false,
};

function assertManifestIntegrity(items) {
  const canonicalKeys = items.map((product) => product?.source?.canonicalProductKey);
  const mainImages = items.map((product) => product?.images?.[0]);
  if (canonicalKeys.some((value) => typeof value !== "string" || !value) || new Set(canonicalKeys).size !== items.length) {
    throw new Error("Catalog canonical product keys are missing or not unique");
  }
  if (mainImages.some((value) => typeof value !== "string" || !value) || new Set(mainImages).size !== items.length) {
    throw new Error("Catalog main images are missing or not unique");
  }
  for (const product of items) {
    const variants = product.styles?.flatMap((style) => style.variants ?? []) ?? [];
    if (product.readiness === "ready") {
      if (!Number.isInteger(product.source?.price?.amountMinor) || !variants.length || variants.some((variant) => variant.readiness !== "ready" || !Number.isInteger(variant.amountMinor) || !Number.isInteger(variant.onHand))) {
        throw new Error(`Ready catalog product is missing verified sellable fields: ${product.slug}`);
      }
    } else if (variants.some((variant) => variant.readiness === "ready" || variant.amountMinor !== undefined || variant.onHand !== undefined)) {
      throw new Error(`Non-ready catalog product contains an importable variant: ${product.slug}`);
    }
  }
}

function contentForCatalogProduct(product, uploadedImages) {
  const beadCounts = [...new Set(product.styles.map((style) => style.optionValues?.en?.["Bead count"]).filter(Boolean))].join(" / ");
  return {
    highlights: [
      localized(product.descriptionEn, product.descriptionAr, zh(product.descriptionZh ?? product.descriptionEn)),
      localized(`${product.material.en} selected for a balanced, comfortable feel.`, `${product.material.ar} مختارة لإحساس متوازن ومريح.`, product.material.en),
      localized(beadCounts ? `Available bead-count options: ${beadCounts}.` : "See the available options before adding to cart.", beadCounts ? `خيارات عدد الخرز المتاحة: ${beadCounts}.` : "راجع الخيارات المتاحة قبل الإضافة إلى السلة.", beadCounts || ""),
      localized("Price and availability are set per SKU.", "يتم تحديد السعر والتوفر لكل رمز SKU.", ""),
      localized("Store dry and wipe gently with a soft cloth.", "يُحفظ جافاً ويُنظف برفق بقطعة قماش ناعمة.", ""),
    ],
    details: [
      { label: localized("Material", "المادة", "Material"), value: localized(product.material.en, product.material.ar, product.material.en) },
      { label: localized("Bead count", "عدد الخرز", "Bead count"), value: localized(beadCounts || "See options", beadCounts || "راجع الخيارات", beadCounts || "See options") },
      { label: localized("Direct retail product code", "رمز منتج البيع المباشر", "Retail product code"), value: localized(product.sku, product.sku, product.sku) },
    ],
    aPlus: uploadedImages.length < 2 ? [] : [
      { eyebrow: localized("TranquilBeads selection", "اختيار TranquilBeads", "TranquilBeads"), title: localized(product.titleEn, product.titleAr, product.titleEn), body: localized(product.descriptionEn, product.descriptionAr, product.descriptionEn), image: uploadedImages[0].url },
      { eyebrow: localized("Options made clear", "خيارات واضحة", "Options"), title: localized("Choose the SKU that fits you", "اختر رمز SKU المناسب لك", "Choose your SKU"), body: localized("Each sellable SKU carries its own price and availability, so the selection shown at checkout stays accurate.", "لكل رمز SKU قابل للبيع سعره وتوفره الخاصان، لتبقى الخيارات المعروضة عند الدفع دقيقة.", ""), image: uploadedImages[1].url },
    ],
  };
}

async function ensureCatalogStyle(baseUrl, token, product, productId, style, imageId, preferredStyleId) {
  let current = await snapshot(baseUrl, token);
  let found = preferredStyleId
    ? current.styles.find((value) => value.product_public_id === productId && value.public_id === preferredStyleId)
    : current.styles.find((value) => value.product_public_id === productId && value.code === style.code);
  const conflicting = preferredStyleId
    ? current.styles.find((value) => value.product_public_id === productId && value.code === style.code && value.public_id !== preferredStyleId)
    : undefined;
  if (conflicting) {
    if (Number(conflicting.variant_count) > 0) throw new Error(`Style identity conflict for ${product.slug}/${style.code}`);
    const archiveRequest = { status: "archived" };
    await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({ action: "style.update", styleId: conflicting.public_id, ...archiveRequest, idempotencyKey: actionKey(`${product.slug}:style:${style.code}:archive-conflict`, archiveRequest) }) });
  }
  if (preferredStyleId && !found) throw new Error(`Default style readback missing for ${product.slug}/${style.code}`);
  const request = {
    ...(!preferredStyleId ? { code: style.code } : {}),
    titleEn: style.titleEn, titleAr: style.titleAr, titleZh: zh(style.titleZh ?? style.titleEn),
    optionValues: localizedOptions(style.optionValues), primaryImageId: imageId ?? null, status: "active", position: product.styles.indexOf(style),
  };
  if (!found) {
    await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({ action: "style.create", productId, ...request, idempotencyKey: stableUuid(`${product.slug}:style:${style.code}:create:v1`) }) });
  } else {
    await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({ action: "style.update", styleId: found.public_id, ...request, idempotencyKey: actionKey(`${product.slug}:style:${style.code}:update`, request) }) });
  }
  current = await snapshot(baseUrl, token);
  found = preferredStyleId
    ? current.styles.find((value) => value.product_public_id === productId && value.public_id === preferredStyleId)
    : current.styles.find((value) => value.product_public_id === productId && value.code === style.code);
  if (!found || found.title_en !== style.titleEn || found.title_ar !== style.titleAr || found.primary_image_id !== (imageId ?? null)) throw new Error(`Style readback mismatch for ${product.slug}/${style.code}`);
  return found;
}

async function ensureCatalogVariants(baseUrl, token, product, productId, styleIds) {
  for (const { style, variant } of readyVariants(product)) {
    let current = await snapshot(baseUrl, token);
    let found = current.variants.find((value) => value.product_public_id === productId && value.sku === variant.sku);
    const request = {
      styleId: styleIds.get(style.code), sku: variant.sku, titleEn: variant.titleEn, titleAr: variant.titleAr,
      titleZh: zh(variant.titleZh ?? variant.titleEn), optionValues: localizedOptions(variant.optionValues), amountMinor: variant.amountMinor, onHand: variant.onHand,
      ...standardTasbihParcel,
    };
    if (!request.styleId) throw new Error(`Missing style readback for ${product.slug}/${style.code}`);
    if (!found) {
      await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({ action: "variant.create", productId, ...request, idempotencyKey: stableUuid(`${product.slug}:variant:${variant.sku}:create:v1`) }) });
    } else {
      // SKU and style association are identity fields. Verify them after the
      // write, but never send them through the update path.
      const { sku: _sku, styleId: _styleId, ...updateRequest } = request;
      void _sku;
      void _styleId;
      // The generated default variant must keep option_values as bare `{}`.
      // Display facets live on its style, so omit the localized empty wrapper.
      if (found.sku === product.sku) delete updateRequest.optionValues;
      await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({ action: "variant.update", variantId: found.public_id, ...updateRequest, idempotencyKey: actionKey(`${product.slug}:variant:${variant.sku}:update`, updateRequest) }) });
    }
    current = await snapshot(baseUrl, token);
    found = current.variants.find((value) => value.product_public_id === productId && value.sku === variant.sku);
    if (!found || found.style_public_id !== request.styleId || Number(found.amount_minor) !== variant.amountMinor || Number(found.on_hand) !== variant.onHand
      || Number(found.shipping_weight_grams) !== request.shippingWeightGrams || Number(found.package_length_mm) !== request.packageLengthMm
      || Number(found.package_width_mm) !== request.packageWidthMm || Number(found.package_height_mm) !== request.packageHeightMm) throw new Error(`Variant readback mismatch for ${product.slug}/${variant.sku}`);
  }
}

async function ensureCatalogLogistics(baseUrl, token, product) {
  let current = await snapshot(baseUrl, token);
  const record = productFromSnapshot(current, product);
  if (!record) throw new Error(`Product readback missing for ${product.slug}`);
  let updated = 0;
  for (const { variant } of readyVariants(product)) {
    const found = current.variants.find((value) => value.product_public_id === record.public_id && value.sku === variant.sku);
    if (!found) throw new Error(`Variant readback missing for ${product.slug}/${variant.sku}`);
    const request = { ...standardTasbihParcel };
    await apiJson(baseUrl, token, "/api/agent/retail/catalog", {
      method: "POST",
      body: JSON.stringify({
        action: "variant.update",
        variantId: found.public_id,
        ...request,
        idempotencyKey: actionKey(`${product.slug}:variant:${variant.sku}:logistics`, request),
      }),
    });
    current = await snapshot(baseUrl, token);
    const readback = current.variants.find((value) => value.public_id === found.public_id);
    if (!readback || Number(readback.shipping_weight_grams) !== request.shippingWeightGrams
      || Number(readback.package_length_mm) !== request.packageLengthMm
      || Number(readback.package_width_mm) !== request.packageWidthMm
      || Number(readback.package_height_mm) !== request.packageHeightMm
      || readback.origin_country !== request.originCountry
      || readback.dangerous_goods !== request.dangerousGoods) {
      throw new Error(`Variant logistics readback mismatch for ${product.slug}/${variant.sku}`);
    }
    updated += 1;
  }
  return { productId: record.public_id, slug: product.slug, status: "verified", variants: updated };
}

async function ensureCatalogProduct(baseUrl, token, product) {
  const sellable = readyVariants(product);
  if (!sellable.length) return { slug: product.slug, status: "skipped", readiness: product.readiness };
  const seed = sellable[0].variant;
  let current = await snapshot(baseUrl, token);
  let record = productFromSnapshot(current, product);
  if (!record) {
    await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({
      action: "product.create", sku: product.sku, slug: product.slug, titleEn: product.titleEn, titleAr: product.titleAr,
      titleZh: zh(product.titleZh ?? product.titleEn), descriptionEn: product.descriptionEn, descriptionAr: product.descriptionAr,
      descriptionZh: zh(product.descriptionZh ?? product.descriptionEn), status: "draft", amountMinor: seed.amountMinor, onHand: seed.onHand,
      idempotencyKey: stableUuid(`${product.slug}:create:v3`),
    }) });
    current = await snapshot(baseUrl, token); record = productFromSnapshot(current, product);
    if (!record || record.status !== "draft") throw new Error(`Product create readback mismatch for ${product.slug}`);
  }
  const productId = record.public_id;
  // SKU/slug identity is established at create time and verified by
  // productFromSnapshot. Never send it through the update path because the
  // database deliberately makes the default variant identity immutable.
  const coreUpdate = { titleEn: product.titleEn, titleAr: product.titleAr, titleZh: zh(product.titleZh ?? product.titleEn), descriptionEn: product.descriptionEn, descriptionAr: product.descriptionAr, descriptionZh: zh(product.descriptionZh ?? product.descriptionEn) };
  await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({ action: "product.update", productId, ...coreUpdate, idempotencyKey: actionKey(`${product.slug}:core`, coreUpdate) }) });
  current = await snapshot(baseUrl, token); record = productFromSnapshot(current, product);
  if (!record || record.title_en !== product.titleEn || record.title_ar !== product.titleAr) throw new Error(`Product copy readback mismatch for ${product.slug}`);

  const manifestImages = [];
  for (const [index, prepared] of product.preparedImages.entries()) {
    const uploaded = await uploadImage(baseUrl, token, productId, product, prepared, index);
    manifestImages.push(uploaded);
    current = await snapshot(baseUrl, token); record = productFromSnapshot(current, product);
    if (!record?.images?.some((image) => image.id === uploaded.id && image.url === uploaded.url)) {
      throw new Error(`Image upload readback mismatch for ${product.slug}`);
    }
  }
  current = await snapshot(baseUrl, token); record = productFromSnapshot(current, product);
  // Existing Preview products can already have a fuller verified gallery.  A
  // manifest is a minimum source set, never permission to delete its media.
  // Re-confirm every manifest image through its upload idempotency key and put
  // those reviewed assets first; unrelated existing media remains afterwards.
  const orderedImages = manifestFirstImageOrder(record.images, manifestImages);
  const imageIds = orderedImages.map((image) => image.id);
  if (!record.images.every((image, index) => image.id === imageIds[index] && Number(image.position) === index)) {
    const imageOrder = { productId, imageIds, expectedVersion: Number(record.image_version) };
    await apiJson(baseUrl, token, "/api/agent/retail/media", { method: "PATCH", body: JSON.stringify({ ...imageOrder, idempotencyKey: actionKey(`${product.slug}:image-order`, imageOrder) }) });
    current = await snapshot(baseUrl, token); record = productFromSnapshot(current, product);
    if (!record.images.every((image, index) => image.id === imageIds[index] && Number(image.position) === index)) throw new Error(`Image order readback mismatch for ${product.slug}`);
  }
  const styleIds = new Map();
  current = await snapshot(baseUrl, token);
  const defaultVariant = current.variants.find((value) => value.product_public_id === productId && value.sku === product.sku);
  for (const style of product.styles) {
    const ownsDefaultVariant = style.variants.some((variant) => variant.sku === product.sku);
    const preferredStyleId = ownsDefaultVariant ? defaultVariant?.style_public_id : undefined;
    styleIds.set(style.code, (await ensureCatalogStyle(baseUrl, token, product, productId, style, record.images[0]?.id, preferredStyleId)).public_id);
  }
  await ensureCatalogVariants(baseUrl, token, product, productId, styleIds);
  const contentUpdate = contentForCatalogProduct(product, record.images);
  await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({ action: "product.content.replace", productId, ...contentUpdate, idempotencyKey: actionKey(`${product.slug}:content`, contentUpdate) }) });
  current = await snapshot(baseUrl, token); record = productFromSnapshot(current, product);
  if (!Array.isArray(record.pdp_highlights) || record.pdp_highlights.length !== 5) throw new Error(`PDP readback mismatch for ${product.slug}`);
  if (record.status !== "published") await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({ action: "product.update", productId, status: "published", idempotencyKey: stableUuid(`${product.slug}:publish:v3`) }) });
  current = await snapshot(baseUrl, token); record = productFromSnapshot(current, product);
  if (!record || record.status !== "published") throw new Error(`Final readback mismatch for ${product.slug}`);
  return { productId, slug: product.slug, status: record.status, variants: sellable.length, images: Number(record.image_count) };
}

async function main() {
  vercelCliPath = argument("--vercel-cli");
  if (vercelCliPath) await fs.access(vercelCliPath);
  const envFile = argument("--env-file");
  const prepareOnly = process.argv.includes("--prepare-only");
  const logisticsOnly = process.argv.includes("--logistics-only");
  const production = process.argv.includes("--production");
  if (prepareOnly && logisticsOnly) throw new Error("--prepare-only and --logistics-only cannot be combined");
  const explicitBaseUrl = argument("--base-url");
  if (envFile && !prepareOnly && !explicitBaseUrl) {
    throw new Error("--base-url is required when --env-file contains the write credential");
  }
  const manifest = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  const items = manifest?.products;
  if (!Array.isArray(items) || manifest.expectedCount !== 30 || items.length !== manifest.expectedCount) throw new Error("Expected exactly 30 catalog products");
  assertManifestIntegrity(items);
  const importable = items.filter((product) => product.readiness === "ready" && readyVariants(product).length > 0);
  const pending = items.filter((product) => !importable.includes(product));
  const onlySlug = argument("--only-slug");
  const startAfterSlug = argument("--start-after-slug");
  if (onlySlug && startAfterSlug) throw new Error("--only-slug and --start-after-slug cannot be combined");
  const startAfterIndex = startAfterSlug ? importable.findIndex((product) => product.slug === startAfterSlug) : -1;
  if (startAfterSlug && startAfterIndex === -1) throw new Error(`Unknown or non-importable start slug: ${startAfterSlug}`);
  const selectedImportable = onlySlug
    ? importable.filter((product) => product.slug === onlySlug)
    : startAfterSlug
      ? importable.slice(startAfterIndex + 1)
      : importable;
  if (onlySlug && selectedImportable.length !== 1) throw new Error(`Unknown or non-importable slug: ${onlySlug}`);
  if (new Set(items.map((product) => product.sku)).size !== items.length || new Set(items.map((product) => product.slug)).size !== items.length) throw new Error("Catalog product identity is not unique");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tranquilbeads-retail-preview-"));
  try {
    if (!logisticsOnly) await prepareImages(selectedImportable, directory);
    if (prepareOnly) {
      console.log(JSON.stringify({ ok: true, expectedCount: manifest.expectedCount, importable: importable.length, pending: pending.length, products: items.map((item) => ({ slug: item.slug, readiness: item.readiness, distinctImages: item.preparedImages?.length ?? 0, styles: item.styles.length, variants: item.styles.reduce((total, style) => total + style.variants.length, 0) })) }, null, 2));
      return;
    }
    // Verify ownership through the authenticated Vercel control plane before
    // reading or transmitting the write credential.
    const baseUrl = await assertTrustedDeployment(
      explicitBaseUrl || process.env.RETAIL_AGENT_BASE_URL || "",
      production ? "production" : "preview",
    );
    if (envFile) {
      dotenv.config({ path: envFile, quiet: true });
      if (process.argv.includes("--delete-env-file")) await fs.unlink(envFile);
    }
    const token = configuredToken();
    const mediaCapabilities = await apiJson(baseUrl, token, "/api/agent/retail/media");
    if (!mediaCapabilities.capabilities?.upload || !mediaCapabilities.capabilities?.reorder) throw new Error("Preview media writes are not enabled");
    const results = [];
    for (const item of selectedImportable) {
      process.stdout.write(`${logisticsOnly ? "Updating logistics for" : "Importing"} ${item.slug} ... `);
      results.push(logisticsOnly
        ? await ensureCatalogLogistics(baseUrl, token, item)
        : await ensureCatalogProduct(baseUrl, token, item));
      process.stdout.write("verified\n");
    }
    console.log(JSON.stringify({ ok: true, baseUrl, expectedCount: manifest.expectedCount, imported: results.length, pending: pending.map((product) => ({ slug: product.slug, readiness: product.readiness })), products: results }, null, 2));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
