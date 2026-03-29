import { NextRequest, NextResponse } from "next/server";

const IS_VERCEL = process.env.VERCEL === "1";
type LocalHandlers = typeof import("@/src/lib/local-image-manager-candidates-route");

async function loadLocalHandlers() {
  const testLoader = (
    globalThis as typeof globalThis & {
      __loadLocalImageManagerCandidatesRoute?: () => Promise<LocalHandlers>;
    }
  ).__loadLocalImageManagerCandidatesRoute;

  if (testLoader) {
    return await testLoader();
  }

  return (0, eval)(
    `import(${JSON.stringify("@/src/lib/local-image-manager-candidates-route")})`,
  ) as Promise<LocalHandlers>;
}

export async function GET(request: Request | NextRequest) {
  if (IS_VERCEL) {
    return NextResponse.json({ error: "Not available on Vercel" }, { status: 403 });
  }

  try {
    const { handleCandidatesGet } = await loadLocalHandlers();
    return await handleCandidatesGet(request);
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
    const { handleCandidatesPost } = await loadLocalHandlers();
    return await handleCandidatesPost(request);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to import image", detail: String(error) },
      { status: 500 },
    );
  }
}
