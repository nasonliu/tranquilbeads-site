import { del } from "@vercel/blob";

import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { assertRetailBlobUrl, getRetailBlobConfig } from "@/src/lib/retail/blob";
import { listRetailBlobDeleteOutbox, markRetailBlobDeleteOutbox } from "@/src/lib/retail/operations";

export const runtime = "nodejs";

// This endpoint is intentionally separate from metadata deletion: Blob is an
// external system, while the outbox is durable and retries remain idempotent.
export async function POST() {
  try {
    await requireRetailPermission("products:write");
    await assertSameOrigin();
    const blobConfig = getRetailBlobConfig();
    const rows = await listRetailBlobDeleteOutbox();
    let processed = 0;
    for (const row of rows) {
      try { const url = String(row.blob_url); assertRetailBlobUrl(url, blobConfig.hostname); await del(url, blobConfig.auth); await markRetailBlobDeleteOutbox(String(row.id), true); processed += 1; }
      catch { await markRetailBlobDeleteOutbox(String(row.id), false); }
    }
    return Response.json({ ok: true, processed }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400;
    return Response.json({ ok: false, error: status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "invalid_request" }, { status, headers: { "cache-control": "no-store" } });
  }
}
