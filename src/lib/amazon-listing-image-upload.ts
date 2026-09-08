import "server-only";

import { createHash, createPublicKey, timingSafeEqual, verify } from "node:crypto";
import { put } from "@vercel/blob";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SHA256_HEX = /^[a-f0-9]{64}$/;
const ED25519_RAW_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;

export class AmazonListingImageUploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AmazonListingImageUploadError";
  }
}

type UploadMetadata = {
  timestamp: string;
  sellerSku: string;
  candidateId: string;
  mimeType: keyof typeof MIME_EXTENSIONS;
  contentLength: number;
  sha256: string;
  signature: string;
};

function requiredHeader(request: Request, name: string): string {
  const value = request.headers.get(name)?.trim();
  if (!value) throw new AmazonListingImageUploadError(`missing ${name}`, 400);
  return value;
}

function readMetadata(request: Request): UploadMetadata {
  const timestamp = requiredHeader(request, "x-ppcme-timestamp");
  const sellerSku = requiredHeader(request, "x-ppcme-seller-sku");
  const candidateId = requiredHeader(request, "x-ppcme-candidate-id");
  const sha256 = requiredHeader(request, "x-ppcme-content-sha256").toLowerCase();
  const signature = requiredHeader(request, "x-ppcme-signature");
  const mimeType = requiredHeader(request, "content-type").toLowerCase();
  const contentLengthText = requiredHeader(request, "content-length");
  const contentLength = Number(contentLengthText);

  if (!SAFE_IDENTIFIER.test(sellerSku) || !SAFE_IDENTIFIER.test(candidateId)) {
    throw new AmazonListingImageUploadError("unsafe seller SKU or candidate ID", 400);
  }
  if (!(mimeType in MIME_EXTENSIONS)) {
    throw new AmazonListingImageUploadError("unsupported image MIME type", 415);
  }
  if (!Number.isSafeInteger(contentLength) || contentLength < 1) {
    throw new AmazonListingImageUploadError("invalid content length", 400);
  }
  if (contentLength > MAX_BYTES) {
    throw new AmazonListingImageUploadError("image exceeds 10 MiB", 413);
  }
  if (!SHA256_HEX.test(sha256)) {
    throw new AmazonListingImageUploadError("invalid SHA-256 digest", 400);
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) {
    throw new AmazonListingImageUploadError("invalid timestamp", 401);
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS) {
    throw new AmazonListingImageUploadError("request timestamp is outside the five-minute window", 401);
  }

  return {
    timestamp,
    sellerSku,
    candidateId,
    mimeType: mimeType as keyof typeof MIME_EXTENSIONS,
    contentLength,
    sha256,
    signature,
  };
}

function publicKeyFromEnvironment() {
  const configured = process.env.PPCME_IMAGE_UPLOAD_ED25519_PUBLIC_KEY?.trim();
  if (!configured) {
    throw new AmazonListingImageUploadError("image upload public key is not configured", 503);
  }
  if (configured.startsWith("-----BEGIN")) return createPublicKey(configured);

  let decoded: Buffer;
  try {
    decoded = Buffer.from(configured, "base64");
  } catch {
    throw new AmazonListingImageUploadError("image upload public key is invalid", 503);
  }
  if (!decoded.length) {
    throw new AmazonListingImageUploadError("image upload public key is invalid", 503);
  }
  const der = decoded.length === 32 ? Buffer.concat([ED25519_RAW_SPKI_PREFIX, decoded]) : decoded;
  try {
    return createPublicKey({ key: der, type: "spki", format: "der" });
  } catch {
    throw new AmazonListingImageUploadError("image upload public key is invalid", 503);
  }
}

function verifyRequestSignature(metadata: UploadMetadata) {
  let signature: Buffer;
  try {
    signature = Buffer.from(metadata.signature, "base64");
  } catch {
    throw new AmazonListingImageUploadError("invalid signature", 401);
  }
  if (signature.length !== 64) {
    throw new AmazonListingImageUploadError("invalid signature", 401);
  }

  const canonical = [
    metadata.timestamp,
    metadata.sellerSku,
    metadata.candidateId,
    metadata.mimeType,
    metadata.contentLength,
    metadata.sha256,
  ].join("\n");
  if (!verify(null, Buffer.from(canonical), publicKeyFromEnvironment(), signature)) {
    throw new AmazonListingImageUploadError("invalid signature", 401);
  }
}

export async function uploadAmazonListingImage(request: Request) {
  const metadata = readMetadata(request);
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.byteLength !== metadata.contentLength) {
    throw new AmazonListingImageUploadError("content length does not match body", 400);
  }
  if (bytes.byteLength > MAX_BYTES) {
    throw new AmazonListingImageUploadError("image exceeds 10 MiB", 413);
  }

  const actualDigest = createHash("sha256").update(bytes).digest();
  const declaredDigest = Buffer.from(metadata.sha256, "hex");
  if (!timingSafeEqual(actualDigest, declaredDigest)) {
    throw new AmazonListingImageUploadError("SHA-256 digest does not match body", 400);
  }
  verifyRequestSignature(metadata);

  const extension = MIME_EXTENSIONS[metadata.mimeType];
  const pathname = `amazon-listings/${metadata.sellerSku}/${metadata.sha256}.${extension}`;
  const blob = await put(pathname, bytes, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: metadata.mimeType,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    etag: blob.etag,
    sha256: metadata.sha256,
    byteCount: bytes.byteLength,
  };
}
