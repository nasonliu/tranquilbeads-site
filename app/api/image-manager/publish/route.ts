import { NextRequest, NextResponse } from "next/server";
import { execFileSync } from "child_process";

const IS_VERCEL = process.env.VERCEL === "1";
const SYNC_SCRIPT = "scripts/sync-products.py";
const PUBLISH_PATHS = [
  "app/data/image-manager-products.json",
  "src/data/site.ts",
  "public/images/imported",
];

type PublishFile = {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed" | "copied" | "untracked";
};

function git(args: string[]) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function parseStatus(code: string): PublishFile["status"] {
  if (code === "??") return "untracked";
  if (code.includes("D")) return "deleted";
  if (code.includes("R")) return "renamed";
  if (code.includes("C")) return "copied";
  if (code.includes("A")) return "added";
  return "modified";
}

function getPublishFiles(): PublishFile[] {
  const output = git(["status", "--porcelain=v1", "--untracked-files=all", "--", ...PUBLISH_PATHS]);
  if (!output.trim()) {
    return [];
  }

  return output
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter(Boolean)
    .map((line) => ({
      status: parseStatus(line.slice(0, 2)),
      path: line.slice(3).trim(),
    }))
    .filter((file) => !file.path.startsWith("public/images/imported/._"));
}

function getBranch() {
  return git(["rev-parse", "--abbrev-ref", "HEAD"]).trim();
}

function getDefaultCommitMessage() {
  return "chore: publish image-manager updates";
}

function syncSiteData() {
  const output = execFileSync("python3", [SYNC_SCRIPT], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();

  if (!output) {
    return null;
  }

  return JSON.parse(output) as {
    success?: boolean;
    added?: number;
    updated?: number;
    total?: number;
    message?: string;
  };
}

export async function GET() {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "Publish disabled on Vercel. Run locally." }, { status: 403 });
  }

  try {
    const files = getPublishFiles();
    return NextResponse.json({
      hasChanges: files.length > 0,
      branch: getBranch(),
      files,
      commitMessage: getDefaultCommitMessage(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to inspect publish status", detail: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "Publish disabled on Vercel. Run locally." }, { status: 403 });
  }

  try {
    const syncResult = syncSiteData();
    const files = getPublishFiles();
    if (files.length === 0) {
      return NextResponse.json({ error: "No publishable changes found" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as { commitMessage?: string };
    const commitMessage = body.commitMessage?.trim() || getDefaultCommitMessage();
    const branch = getBranch();

    git(["add", "--", ...PUBLISH_PATHS]);
    git(["commit", "-m", commitMessage]);
    git(["push", "origin", branch]);
    const commitSha = git(["rev-parse", "HEAD"]).trim();

    return NextResponse.json({
      success: true,
      branch,
      commitSha,
      commitMessage,
      files,
      sync: syncResult,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to publish changes", detail: String(error) },
      { status: 500 },
    );
  }
}
