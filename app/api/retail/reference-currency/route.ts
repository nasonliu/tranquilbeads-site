import { NextResponse } from "next/server";

import { refreshRetailReferenceCurrencySnapshot } from "@/src/lib/retail/reference-currency-server";

export async function GET() {
  const snapshot = await refreshRetailReferenceCurrencySnapshot();
  if (!snapshot) return NextResponse.json({ ok: false, error: "reference_rates_unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ ok: true, snapshot }, { headers: { "cache-control": "no-store" } });
}
