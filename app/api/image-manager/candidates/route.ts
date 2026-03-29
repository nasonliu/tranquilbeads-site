import { NextRequest, NextResponse } from "next/server";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  buildBroadCandidateQuerySql,
  buildCandidateQuerySql,
  mapDatabasePathToMountedPath,
  rankCandidateImages,
  type CandidateImageRecord,
} from "@/src/lib/image-manager-candidates";

const IS_VERCEL = process.env.VERCEL === "1";
const IMPORTED_DIR = path.join(process.cwd(), "public/images/imported");
const QUERY_SCRIPT = path.join(process.cwd(), "scripts/query-image-manager-candidates.py");

function readCandidates(sql: string): CandidateImageRecord[] {
  const stdout = execFileSync("python3", [QUERY_SCRIPT, sql], {
    encoding: "utf8",
  });
  const trimmed = stdout.trim();
  if (!trimmed) {
    return [];
  }
  return JSON.parse(trimmed) as CandidateImageRecord[];
}

export async function GET(request: Request | NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "Not available on Vercel" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const material = url.searchParams.get("material") ?? "";
    const name = url.searchParams.get("name") ?? "";
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "24", 10) || 24;

    let candidates = readCandidates(buildCandidateQuerySql({ material, name, limit }));
    if (candidates.length === 0) {
      candidates = readCandidates(buildBroadCandidateQuerySql({ material, name, limit }));
    }

    return NextResponse.json({
      candidates: rankCandidateImages(candidates, { material, name, limit }).map((candidate) => ({
        ...candidate,
        previewUrl: `/api/image-manager/candidates/preview?path=${encodeURIComponent(candidate.original_path)}`,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load image candidates", detail: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "Not available on Vercel" }, { status: 403 });
  }

  try {
    const payload = await request.json();
    const slug = String(payload.slug ?? "").trim();
    const originalPath = String(payload.originalPath ?? "").trim();

    if (!slug || !originalPath) {
      return NextResponse.json({ error: "Missing slug or originalPath" }, { status: 400 });
    }

    const sourcePath = mapDatabasePathToMountedPath(originalPath);
    if (!fs.existsSync(sourcePath)) {
      return NextResponse.json({ error: "Source image not found" }, { status: 404 });
    }

    const targetDir = path.join(IMPORTED_DIR, slug);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const baseName = path.basename(sourcePath).replace(/[^a-zA-Z0-9._-]/g, "-");
    const targetName = `${Date.now()}-${baseName}`;
    const targetPath = path.join(targetDir, targetName);
    fs.copyFileSync(sourcePath, targetPath);

    return NextResponse.json({ url: `/images/imported/${slug}/${targetName}` });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to import image", detail: String(error) },
      { status: 500 },
    );
  }
}
