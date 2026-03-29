import { NextRequest, NextResponse } from "next/server";

import { getOriginRepo, maskToken, readLocalConfig, writeLocalConfig } from "@/src/lib/image-manager-local-config";

const IS_VERCEL = process.env.VERCEL === "1";

export async function GET() {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "Config disabled on Vercel. Run locally." }, { status: 403 });
  }

  try {
    const config = readLocalConfig();
    const { repo } = getOriginRepo();

    return NextResponse.json({
      hasGithubToken: Boolean(config.githubToken),
      githubTokenMask: maskToken(config.githubToken),
      hasFnosConfig: Boolean(config.fnosBaseUrl && config.fnosToken && config.fnosSecret),
      fnosBaseUrl: config.fnosBaseUrl || null,
      fnosTokenMask: maskToken(config.fnosToken),
      fnosSecretMask: maskToken(config.fnosSecret),
      repo,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load config", detail: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "Config disabled on Vercel. Run locally." }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      githubToken?: string;
      fnosBaseUrl?: string;
      fnosToken?: string;
      fnosSecret?: string;
    };
    const config = readLocalConfig();
    const githubToken = body.githubToken?.trim() || "";
    const fnosBaseUrl = body.fnosBaseUrl?.trim().replace(/\/$/, "") || "";
    const fnosToken = body.fnosToken?.trim() || "";
    const fnosSecret = body.fnosSecret?.trim() || "";
    const { repo } = getOriginRepo();

    if (body.action === "test") {
      const tokenToTest = githubToken || config.githubToken || "";
      if (!tokenToTest) {
        return NextResponse.json({ error: "Missing GitHub token" }, { status: 400 });
      }

      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenToTest}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "tranquilbeads-image-manager",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        return NextResponse.json({ error: "GitHub auth failed" }, { status: 400 });
      }

      const user = await response.json() as { login?: string };
      return NextResponse.json({
        success: true,
        login: user.login || null,
        repo,
      });
    }

    const nextConfig = {
      ...(config.githubToken ? { githubToken: config.githubToken } : {}),
      ...(config.fnosBaseUrl ? { fnosBaseUrl: config.fnosBaseUrl } : {}),
      ...(config.fnosToken ? { fnosToken: config.fnosToken } : {}),
      ...(config.fnosSecret ? { fnosSecret: config.fnosSecret } : {}),
      ...(githubToken ? { githubToken } : {}),
      ...(fnosBaseUrl ? { fnosBaseUrl } : {}),
      ...(fnosToken ? { fnosToken } : {}),
      ...(fnosSecret ? { fnosSecret } : {}),
    };
    writeLocalConfig(nextConfig);

    return NextResponse.json({
      success: true,
      hasGithubToken: Boolean(githubToken),
      githubTokenMask: maskToken(githubToken),
      hasFnosConfig: Boolean(nextConfig.fnosBaseUrl && nextConfig.fnosToken && nextConfig.fnosSecret),
      fnosBaseUrl: nextConfig.fnosBaseUrl || null,
      fnosTokenMask: maskToken(nextConfig.fnosToken),
      fnosSecretMask: maskToken(nextConfig.fnosSecret),
      repo,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save config", detail: String(error) },
      { status: 500 },
    );
  }
}
