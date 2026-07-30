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

const PREVIEW_HOST_SUFFIX = ".vercel.app";
const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(scriptDir, "retail-hot-products-preview-2026-07-30.json");
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

function configuredToken() {
  if (process.env.RETAIL_AGENT_TOKEN) return process.env.RETAIL_AGENT_TOKEN;
  const configured = JSON.parse(process.env.RETAIL_AGENT_OPERATORS_JSON || "[]");
  const operator = configured.find((value) => value && typeof value.token === "string" && value.token.length >= 32);
  if (!operator) throw new Error("No configured retail agent credential is available");
  return operator.token;
}

function assertPreviewUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname.endsWith(PREVIEW_HOST_SUFFIX)) {
    throw new Error("This importer only accepts an HTTPS Vercel Preview URL");
  }
  return url.origin;
}

async function apiJson(baseUrl, token, pathname, options = {}) {
  if (vercelCliPath) {
    const method = options.method || "GET";
    const curlArgs = ["curl", pathname, "--deployment", baseUrl, "--yes", "--", "--silent", "--show-error", "--request", method, "--header", `Authorization: Bearer ${token}`];
    if (options.body) curlArgs.push("--header", "Content-Type: application/json", "--data-binary", options.body);
    let stdout;
    try { ({ stdout } = await execFileAsync(vercelCliPath, curlArgs, { maxBuffer: 10 * 1024 * 1024 })); }
    catch { throw new Error(`${method} ${pathname} failed through Vercel protected transport`); }
    const data = JSON.parse(stdout);
    if (data.ok !== true) throw new Error(`${method} ${pathname} failed (${data.error || "unknown"})`);
    return data;
  }
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok !== true) throw new Error(`${options.method || "GET"} ${pathname} failed (${response.status} ${data.error || "unknown"})`);
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
  const parsed = new URL(url);
  if (!new Set(["m.media-amazon.com", "f.nooncdn.com"]).has(parsed.hostname)) throw new Error(`Unapproved image host: ${parsed.hostname}`);
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; TranquilBeadsCatalog/1.0)" } });
  if (!response.ok) throw new Error(`Image download failed (${response.status}) for ${parsed.hostname}`);
  const input = Buffer.from(await response.arrayBuffer());
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
      globalHashes.set(details.sha256, item.slug);
      if (prepared.some((image) => visualDistance(image.visual, details.visual) < 1.2)) continue;
      prepared.push({ target, sourceUrl: url, ...details });
      if (prepared.length === 8) break;
    }
    if (prepared.length < 2) throw new Error(`Fewer than two distinct images for ${item.slug}`);
    item.preparedImages = prepared;
  }
}

function localized(en, ar, zh) { return { en, ar, zh }; }

function contentFor(item, uploadedImages) {
  const giftEn = item.giftBox ? "Presented in a gift box for thoughtful giving and secure storage." : "Packed for secure storage and everyday use.";
  const giftAr = item.giftBox ? "تأتي في علبة هدايا أنيقة لتقديمها وحفظها بأمان." : "معبأة للحفظ الآمن والاستخدام اليومي.";
  const giftZh = item.giftBox ? "配有礼盒，适合赠礼与日常收纳。" : "采用安全包装，便于日常使用与收纳。";
  return {
    highlights: [
      localized(item.highlightEn, item.highlightAr, item.highlightZh),
      localized(`${item.beadCount} carefully arranged beads offer a balanced, comfortable rhythm in hand.`, `تضم ${item.beadCount} حبة مرتبة بعناية لإيقاع متوازن ومريح في اليد.`, `${item.beadCount} 颗珠子经过细致排列，手持节奏均衡舒适。`),
      localized(item.featureEn, item.featureAr, item.featureZh),
      localized(giftEn, giftAr, giftZh),
      localized("Suitable for prayer, reflection, Ramadan, Eid, Hajj or a meaningful personal gift.", "مناسبة للصلاة والتأمل ورمضان والعيد والحج أو كهدية شخصية مميزة.", "适合祈祷、静思、斋月、开斋节、朝觐或作为有意义的个人礼物。"),
    ],
    details: [
      { label: localized("Bead material", "مادة الخرز", "珠子材质"), value: localized(item.materialEn, item.materialAr, item.materialZh) },
      { label: localized("Bead count", "عدد الخرز", "珠子数量"), value: localized(String(item.beadCount), String(item.beadCount), String(item.beadCount)) },
      { label: localized("Design", "التصميم", "设计"), value: localized(item.designEn, item.designAr, item.designZh) },
      { label: localized("Included", "المحتويات", "包装内含"), value: localized(item.includedEn, item.includedAr, item.includedZh) },
      { label: localized("Care", "العناية", "保养方式"), value: localized("Keep dry. Wipe gently with a soft cloth and store away from prolonged heat or direct sunlight.", "يُحفظ جافاً ويُنظف برفق بقطعة قماش ناعمة بعيداً عن الحرارة وأشعة الشمس المباشرة.", "保持干燥，以软布轻拭，避免长时间高温或阳光直射。") },
      { label: localized("Direct retail SKU", "رمز البيع المباشر", "独立站零售 SKU"), value: localized(item.sku, item.sku, item.sku) },
    ],
    aPlus: [
      { eyebrow: localized("TranquilBeads selection", "اختيار ترانكويل بيدز", "TranquilBeads 精选"), title: localized(item.aPlusTitleEn, item.aPlusTitleAr, item.aPlusTitleZh), body: localized(item.aPlusBodyEn, item.aPlusBodyAr, item.aPlusBodyZh), image: uploadedImages[0].url },
      { eyebrow: localized("Made for meaningful moments", "مصممة للحظات ذات معنى", "为重要时刻而设计"), title: localized("Comfortable in hand, refined in presentation", "راحة في اليد وأناقة في التقديم", "舒适手感，精致呈现"), body: localized("The bead sequence, finishing details and presentation are selected to move naturally from daily reflection to special occasions.", "تم اختيار تسلسل الخرز والتفاصيل والتغليف ليناسب التأمل اليومي والمناسبات الخاصة.", "珠序、细节与包装兼顾日常静思和特别场合，自然衔接不同使用情境。"), image: uploadedImages[1].url },
    ],
  };
}

async function ensureProduct(baseUrl, token, item) {
  let current = await snapshot(baseUrl, token);
  let product = productFromSnapshot(current, item);
  if (!product) {
    await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({ action: "product.create", sku: item.sku, slug: item.slug, titleEn: item.titleEn, titleAr: item.titleAr, titleZh: item.titleZh, descriptionEn: item.descriptionEn, descriptionAr: item.descriptionAr, descriptionZh: item.descriptionZh, status: "draft", amountMinor: item.amountMinor, onHand: item.onHand, idempotencyKey: stableUuid(`${item.slug}:create`) }) });
    current = await snapshot(baseUrl, token);
    product = productFromSnapshot(current, item);
    if (!product || product.status !== "draft" || Number(product.amount_minor) !== item.amountMinor) throw new Error(`Product create readback mismatch for ${item.slug}`);
  }

  const productId = product.public_id;
  await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({
    action: "product.update",
    productId,
    slug: item.slug,
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    titleZh: item.titleZh,
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr,
    descriptionZh: item.descriptionZh,
    idempotencyKey: stableUuid(`${item.slug}:core-copy:v2`),
  }) });
  current = await snapshot(baseUrl, token);
  product = productFromSnapshot(current, item);
  if (!product || product.title_en !== item.titleEn || product.title_ar !== item.titleAr || product.description_en !== item.descriptionEn || product.description_ar !== item.descriptionAr) {
    throw new Error(`Product copy readback mismatch for ${item.slug}`);
  }

  const existingImages = Array.isArray(product.images) ? product.images : [];
  const uploaded = [...existingImages];
  for (const [index, prepared] of item.preparedImages.entries()) {
    if (uploaded[index]) continue;
    uploaded.push(await uploadImage(baseUrl, token, productId, item, prepared, index));
    const afterUpload = await snapshot(baseUrl, token);
    const readback = productFromSnapshot(afterUpload, item);
    if (!readback || Number(readback.image_count) !== uploaded.length) throw new Error(`Image upload readback mismatch for ${item.slug}`);
  }

  current = await snapshot(baseUrl, token);
  product = productFromSnapshot(current, item);
  const readbackImages = product.images;
  if (!Array.isArray(readbackImages) || readbackImages.length !== item.preparedImages.length) throw new Error(`Image count mismatch for ${item.slug}`);
  const orderedIds = readbackImages.map((image) => image.id);
  const orderIsCanonical = readbackImages.every((image, index) => Number(image.position) === index);
  if (!orderIsCanonical) {
    await apiJson(baseUrl, token, "/api/agent/retail/media", { method: "PATCH", body: JSON.stringify({ productId, imageIds: orderedIds, expectedVersion: Number(product.image_version), idempotencyKey: stableUuid(`${item.slug}:image-order:v1`) }) });
    current = await snapshot(baseUrl, token);
    product = productFromSnapshot(current, item);
    if (product.images.map((image) => image.id).join(",") !== orderedIds.join(",") || !product.images.every((image, index) => Number(image.position) === index)) throw new Error(`Image order readback mismatch for ${item.slug}`);
  }
  const defaultStyle = current.styles.find((style) => style.product_public_id === productId);
  if (!defaultStyle) throw new Error(`Default style readback missing for ${item.slug}`);
  if (defaultStyle.primary_image_id !== orderedIds[0]) {
    await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({ action: "style.update", styleId: defaultStyle.public_id, primaryImageId: orderedIds[0], idempotencyKey: stableUuid(`${item.slug}:style-primary:v1`) }) });
    current = await snapshot(baseUrl, token);
    if (current.styles.find((style) => style.public_id === defaultStyle.public_id)?.primary_image_id !== orderedIds[0]) throw new Error(`Style image readback mismatch for ${item.slug}`);
  }
  const content = contentFor(item, readbackImages);
  await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({ action: "product.content.replace", productId, ...content, idempotencyKey: stableUuid(`${item.slug}:content:v1`) }) });
  current = await snapshot(baseUrl, token);
  product = productFromSnapshot(current, item);
  if (!Array.isArray(product.pdp_highlights) || product.pdp_highlights.length !== 5 || !Array.isArray(product.pdp_a_plus) || product.pdp_a_plus.length !== 2) throw new Error(`PDP readback mismatch for ${item.slug}`);

  if (product.status !== "published") {
    await apiJson(baseUrl, token, "/api/agent/retail/catalog", { method: "POST", body: JSON.stringify({ action: "product.update", productId, status: "published", idempotencyKey: stableUuid(`${item.slug}:publish`) }) });
  }
  current = await snapshot(baseUrl, token);
  product = productFromSnapshot(current, item);
  const variant = current.variants.find((value) => value.product_public_id === productId || value.product_id === productId || value.product_sku === item.sku || value.sku === item.sku);
  if (product.status !== "published" || Number(product.image_count) < 2 || !variant || Number(variant.amount_minor) !== item.amountMinor || Number(variant.on_hand) !== item.onHand) throw new Error(`Final readback mismatch for ${item.slug}`);
  return { productId, slug: item.slug, sku: item.sku, images: Number(product.image_count), amountMinor: item.amountMinor, onHand: item.onHand, status: product.status };
}

async function main() {
  vercelCliPath = argument("--vercel-cli");
  if (vercelCliPath) await fs.access(vercelCliPath);
  const envFile = argument("--env-file");
  if (envFile) {
    dotenv.config({ path: envFile, quiet: true });
    if (process.argv.includes("--delete-env-file")) await fs.unlink(envFile);
  }
  const items = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  if (!Array.isArray(items) || items.length !== 10) throw new Error("Expected exactly 10 reviewed catalog items");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tranquilbeads-retail-preview-"));
  try {
    await prepareImages(items, directory);
    if (process.argv.includes("--prepare-only")) {
      console.log(JSON.stringify({ ok: true, count: items.length, products: items.map((item) => ({ slug: item.slug, distinctImages: item.preparedImages.length })) }, null, 2));
      return;
    }
    const baseUrl = assertPreviewUrl(argument("--base-url") || process.env.RETAIL_AGENT_BASE_URL || "");
    const token = configuredToken();
    const mediaCapabilities = await apiJson(baseUrl, token, "/api/agent/retail/media");
    if (!mediaCapabilities.capabilities?.upload || !mediaCapabilities.capabilities?.reorder) throw new Error("Preview media writes are not enabled");
    const results = [];
    for (const item of items) {
      process.stdout.write(`Importing ${item.slug} ... `);
      results.push(await ensureProduct(baseUrl, token, item));
      process.stdout.write("verified\n");
    }
    console.log(JSON.stringify({ ok: true, baseUrl, count: results.length, products: results }, null, 2));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
