import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";

import { assertSameOrigin, requireRetailAdmin } from "@/src/lib/retail/admin-auth";

const IMPORTED_DIR = path.join(process.cwd(), "public/images/imported");
const STATIC_IMAGES_DIR = path.join(process.cwd(), "public/images");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 24_000_000;

function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function toPublicUrl(...segments: string[]) {
  return `/${segments.map((segment) => segment.replace(/\\/g, "/")).join("/")}`;
}

function sanitizeSlug(slug: string) {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "product";
}

function isPublicImageEntry(entry: fs.Dirent) {
  return entry.isFile() && !entry.name.startsWith(".") && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase());
}

function detectImageMime(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

async function normalizeUpload(upload: File) {
  if (upload.size < 1 || upload.size > MAX_IMAGE_BYTES) throw new Error("invalid_size");
  const bytes = new Uint8Array(await upload.arrayBuffer());
  const mime = detectImageMime(bytes);
  if (!mime || upload.type !== mime) throw new Error("invalid_image");

  const input = sharp(bytes, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: "error" }).rotate();
  const metadata = await input.metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_IMAGE_PIXELS) throw new Error("invalid_dimensions");

  const output = mime === "image/png"
    ? await input.png().toBuffer()
    : mime === "image/webp"
      ? await input.webp().toBuffer()
      : await input.jpeg().toBuffer();
  if (output.length > MAX_IMAGE_BYTES) throw new Error("invalid_size");
  return { bytes: output, mime, extension: mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg" };
}

function listImportedImages() {
  ensureDirectoryExists(IMPORTED_DIR);

  return fs.readdirSync(IMPORTED_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .sort((left, right) => left.name.localeCompare(right.name))
    .reduce<Record<string, string[]>>((acc, entry) => {
      const folderPath = path.join(IMPORTED_DIR, entry.name);
      const urls = fs.readdirSync(folderPath, { withFileTypes: true })
        .filter(isPublicImageEntry)
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((file) => toPublicUrl("images", "imported", entry.name, file.name));

      acc[entry.name] = urls;
      return acc;
    }, {});
}

function listStaticImages() {
  if (!fs.existsSync(STATIC_IMAGES_DIR)) {
    return [];
  }

  return fs.readdirSync(STATIC_IMAGES_DIR, { withFileTypes: true })
    .filter(isPublicImageEntry)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => toPublicUrl("images", entry.name));
}

export async function GET() {
  return NextResponse.json({
    folders: listImportedImages(),
    staticFiles: listStaticImages(),
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireRetailAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertSameOrigin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const rawSlug = String(formData.get("slug") ?? "");
    const isUpload =
      !!file &&
      typeof file === "object" &&
      "name" in file &&
      typeof (file as { name?: unknown }).name === "string" &&
      "arrayBuffer" in file &&
      typeof (file as { arrayBuffer?: unknown }).arrayBuffer === "function";

    if (!isUpload) {
      return NextResponse.json({ error: "Missing image file" }, { status: 400 });
    }

    const upload = file as File;
    const slug = sanitizeSlug(rawSlug);
    const normalized = await normalizeUpload(upload);
    const targetDir = path.join(IMPORTED_DIR, slug);
    ensureDirectoryExists(targetDir);

    const targetName = `${Date.now()}-upload.${normalized.extension}`;
    const targetPath = path.join(targetDir, targetName);
    fs.writeFileSync(targetPath, normalized.bytes);

    return NextResponse.json({
      url: toPublicUrl("images", "imported", slug, targetName),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid image upload" },
      { status: 400 },
    );
  }
}
