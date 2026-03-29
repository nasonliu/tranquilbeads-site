import { NextRequest, NextResponse } from "next/server";

// Local-only tool — on Vercel return empty data
export async function GET() {
  return NextResponse.json({ folders: {}, staticFiles: [] });
}

export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: "Upload disabled on Vercel" }, { status: 403 });
}
