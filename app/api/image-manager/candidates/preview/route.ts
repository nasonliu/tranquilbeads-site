import { NextRequest, NextResponse } from "next/server";

// Requires local mounted volume — stubbed on Vercel
export async function GET(_req: NextRequest) {
  return new NextResponse("Not available on Vercel", { status: 403 });
}
