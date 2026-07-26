import { del } from "@vercel/blob";

import { assertSameOrigin, requireRetailAdmin } from "@/src/lib/retail/admin-auth";
import { listRetailBlobDeleteOutbox, markRetailBlobDeleteOutbox } from "@/src/lib/retail/operations";

export const runtime = "nodejs";

// This endpoint is intentionally separate from metadata deletion: Blob is an
// external system, while the outbox is durable and retries remain idempotent.
export async function POST() {
  try {
    await requireRetailAdmin();
    await assertSameOrigin();
    const rows = await listRetailBlobDeleteOutbox();
    let processed = 0;
    for (const row of rows) {
      try { await del(String(row.blob_url)); await markRetailBlobDeleteOutbox(String(row.id), true); processed += 1; }
      catch { await markRetailBlobDeleteOutbox(String(row.id), false); }
    }
    return Response.json({ ok: true, processed }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return Response.json({ ok: false, error: error instanceof Error ? error.message : "unauthorized" }, { status: 401 }); }
}
