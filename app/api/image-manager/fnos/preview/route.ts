import { NextRequest, NextResponse } from "next/server";

import { fnosRequest, getFnosConfig } from "@/src/lib/fnos-gallery";

const IS_VERCEL = process.env.VERCEL === "1";

export async function GET(request: NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "fnOS preview is local-only." }, { status: 403 });
  }

  try {
    const config = getFnosConfig();
    if (!config) {
      return NextResponse.json({ error: "Missing fnOS config" }, { status: 400 });
    }

    const path = new URL(request.url).searchParams.get("path") || "";
    if (!path) {
      return NextResponse.json({ error: "Missing preview path" }, { status: 400 });
    }

    const response = await fnosRequest(config, {
      path,
      accept: "*/*",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Preview not found" }, { status: 404 });
    }

    return new NextResponse(await response.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load fnOS preview", detail: String(error) },
      { status: 500 },
    );
  }
}
