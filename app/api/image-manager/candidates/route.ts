import { NextRequest, NextResponse } from "next/server";

// This tool requires local filesystem access — stubbed on Vercel
export async function GET() {
  return NextResponse.json({ error: "Not available on Vercel" }, { status: 403 });
}

export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: "Not available on Vercel" }, { status: 403 });
}
