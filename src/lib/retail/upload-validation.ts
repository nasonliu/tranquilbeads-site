import crypto from "node:crypto";
import sharp from "sharp";

// Route Handlers on Vercel have a platform request-body ceiling below 5 MiB.
// Keep the application limit below it rather than accepting files that cannot
// reliably reach the validator. Direct client-to-Blob upload can raise this.
export const MAX_RETAIL_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_RETAIL_IMAGE_PIXELS = 24_000_000;
const extensionByMime = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
const acceptedExtensionsByMime = { "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"], "image/webp": ["webp"] } as const;

export function detectRetailImage(bytes: Uint8Array) {
  if (bytes.length < 12) return null;
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return png ? "image/png" : jpg ? "image/jpeg" : webp ? "image/webp" : null;
}

export async function validateRetailImage(file: File) {
  if (file.size < 1 || file.size > MAX_RETAIL_IMAGE_BYTES) throw new Error("invalid_size");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectRetailImage(bytes);
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!mime || mime !== file.type || !extension || !(acceptedExtensionsByMime[mime] as readonly string[]).includes(extension)) throw new Error("invalid_image");
  const image = sharp(bytes, { limitInputPixels: MAX_RETAIL_IMAGE_PIXELS, failOn: "error" });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_RETAIL_IMAGE_PIXELS) throw new Error("invalid_dimensions");
  // Decode and re-encode every upload. This deliberately omits withMetadata(),
  // so EXIF/GPS/device information and attacker-controlled image metadata are
  // never copied to the public Blob object.
  const normalized = await image
    .rotate()
    .toFormat(mime === "image/jpeg" ? "jpeg" : mime === "image/png" ? "png" : "webp")
    .toBuffer();
  const sanitized = new Uint8Array(normalized);
  return {
    mime,
    bytes: sanitized,
    sha256: crypto.createHash("sha256").update(sanitized).digest("hex"),
    extension: extensionByMime[mime],
  };
}
