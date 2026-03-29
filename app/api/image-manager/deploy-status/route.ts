import { NextRequest, NextResponse } from "next/server";

import { getOriginRepo, readLocalConfig } from "@/src/lib/image-manager-local-config";

const IS_VERCEL = process.env.VERCEL === "1";

type CheckRun = {
  name?: string;
  status?: string;
  conclusion?: string | null;
  details_url?: string | null;
};

type CommitStatus = {
  context?: string;
  state?: string;
  target_url?: string | null;
};

function pickVercelCheck(checkRuns: CheckRun[]) {
  return checkRuns.find((check) => (check.name || "").toLowerCase().includes("vercel")) || null;
}

function pickVercelStatus(statuses: CommitStatus[]) {
  return statuses.find((status) => (status.context || "").toLowerCase().includes("vercel")) || null;
}

function normalizeDeploymentState(check: CheckRun | null, status: CommitStatus | null) {
  const checkStatus = check?.status?.toLowerCase();
  const conclusion = check?.conclusion?.toLowerCase();
  const commitState = status?.state?.toLowerCase();

  if (checkStatus === "queued" || checkStatus === "in_progress" || commitState === "pending") {
    return "building";
  }

  if (conclusion === "success" || commitState === "success") {
    return "ready";
  }

  if (conclusion && conclusion !== "neutral") {
    return "error";
  }

  if (commitState === "failure" || commitState === "error") {
    return "error";
  }

  return "unknown";
}

export async function GET(request: Request | NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "Deploy status disabled on Vercel. Run locally." }, { status: 403 });
  }

  try {
    const sha = new URL(request.url).searchParams.get("sha")?.trim() || "";
    const { repo } = getOriginRepo();

    if (!repo) {
      return NextResponse.json({ error: "Unsupported origin remote", commitSha: sha }, { status: 400 });
    }

    const config = readLocalConfig();
    if (!config.githubToken) {
      return NextResponse.json({
        state: "not_configured",
        commitSha: sha,
        repo,
        deploymentUrl: null,
        productionUrl: null,
      });
    }

    const headers = {
      Authorization: `Bearer ${config.githubToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "tranquilbeads-image-manager",
    };

    const [checksRes, statusRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}/commits/${sha}/check-runs`, { headers, cache: "no-store" }),
      fetch(`https://api.github.com/repos/${repo}/commits/${sha}/status`, { headers, cache: "no-store" }),
    ]);

    const checksJson = checksRes.ok ? await checksRes.json() as { check_runs?: CheckRun[] } : { check_runs: [] };
    const statusJson = statusRes.ok ? await statusRes.json() as { statuses?: CommitStatus[] } : { statuses: [] };

    const vercelCheck = pickVercelCheck(checksJson.check_runs || []);
    const vercelStatus = pickVercelStatus(statusJson.statuses || []);
    const state = normalizeDeploymentState(vercelCheck, vercelStatus);

    return NextResponse.json({
      state,
      repo,
      commitSha: sha,
      deploymentUrl: vercelCheck?.details_url || null,
      productionUrl: vercelStatus?.target_url || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load deploy status", detail: String(error) },
      { status: 500 },
    );
  }
}
