import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { resolveCandidateImagePath } from "@/src/lib/image-manager-candidates";

const IS_VERCEL = process.env.VERCEL === "1";

function contentTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    case ".jpg":
    case ".jpeg":
    default:
      return "image/jpeg";
  }
}

export async function GET(request: Request | NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "Not available on Vercel" }, { status: 403 });
  }

  const rawPath = new URL(request.url).searchParams.get("path");
  if (!rawPath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const filePath = resolveCandidateImagePath(rawPath);
  if (!filePath) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentTypeFor(filePath),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
