import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMPORTED_DIR = path.join(process.cwd(), "public/images/imported");
const STATIC_IMAGES_DIR = path.join(process.cwd(), "public/images");
const TOP_LEVEL_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"]);

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

function sanitizeFilename(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  const name = path.basename(filename, ext);
  const safeBase = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "upload";
  return `${safeBase}${ext || ".jpg"}`;
}

function listImportedImages() {
  ensureDirectoryExists(IMPORTED_DIR);

  return fs.readdirSync(IMPORTED_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
    .reduce<Record<string, string[]>>((acc, entry) => {
      const folderPath = path.join(IMPORTED_DIR, entry.name);
      const urls = fs.readdirSync(folderPath, { withFileTypes: true })
        .filter((file) => file.isFile())
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
    .filter((entry) => entry.isFile())
    .filter((entry) => TOP_LEVEL_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
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
    const filename = sanitizeFilename(upload.name);
    const targetDir = path.join(IMPORTED_DIR, slug);
    ensureDirectoryExists(targetDir);

    const targetName = `${Date.now()}-${filename}`;
    const targetPath = path.join(targetDir, targetName);
    const bytes = Buffer.from(await upload.arrayBuffer());
    fs.writeFileSync(targetPath, bytes);

    return NextResponse.json({
      url: toPublicUrl("images", "imported", slug, targetName),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to upload image", detail: String(error) },
      { status: 500 },
    );
  }
}
