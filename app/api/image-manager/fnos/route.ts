import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { fnosRequest, getFnosConfig, listFnosGalleryItems } from "@/src/lib/fnos-gallery";

const IS_VERCEL = process.env.VERCEL === "1";
const IMPORTED_DIR = path.join(process.cwd(), "public/images/imported");

function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
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
  const baseName = path.basename(filename, ext)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "fnos-image";
  return `${baseName}${ext || ".jpg"}`;
}

export async function GET(request: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "fnOS gallery is local-only." }, { status: 403 });
  }

  try {
    const config = getFnosConfig();
    if (!config) {
      return NextResponse.json({ connected: false, items: [] });
    }

    const { searchParams } = new URL(request.url);
    const items = await listFnosGalleryItems(config, {
      material: searchParams.get("material") || "",
      name: searchParams.get("name") || "",
      limit: Number(searchParams.get("limit") || "48"),
      offset: Number(searchParams.get("offset") || "0"),
    });

    return NextResponse.json({
      connected: true,
      items: items.map((item) => ({
        id: item.id,
        fileName: item.fileName,
        filePath: item.filePath,
        fileType: item.fileType,
        score: item.score,
        reasons: item.reasons,
        previewUrl: `/api/image-manager/fnos/preview?path=${encodeURIComponent(item.previewPath)}`,
        importPath: item.originalPath,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load fnOS gallery", detail: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "fnOS import is local-only." }, { status: 403 });
  }

  try {
    const config = getFnosConfig();
    if (!config) {
      return NextResponse.json({ error: "Missing fnOS config" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      slug?: string;
      importPath?: string;
      fileName?: string;
    };

    const slug = sanitizeSlug(body.slug || "");
    const importPath = body.importPath?.trim() || "";
    const fileName = sanitizeFilename(body.fileName || "fnos-image.jpg");

    if (!slug || !importPath) {
      return NextResponse.json({ error: "Missing slug or importPath" }, { status: 400 });
    }

    const response = await fnosRequest(config, {
      path: importPath,
      accept: "*/*",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch image from fnOS" }, { status: 502 });
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const targetDir = path.join(IMPORTED_DIR, slug);
    ensureDirectoryExists(targetDir);

    const targetName = `${Date.now()}-${fileName}`;
    fs.writeFileSync(path.join(targetDir, targetName), bytes);

    return NextResponse.json({
      url: `/images/imported/${slug}/${targetName}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to import fnOS image", detail: String(error) },
      { status: 500 },
    );
  }
}
