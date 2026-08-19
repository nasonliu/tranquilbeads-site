import { z } from "zod";

import { requireRetailAgentPermission } from "@/src/lib/retail/agent-auth";
import { agentCatalogActionDto, executeAgentCatalogAction, getAgentCatalogSnapshot } from "@/src/lib/retail/agent-catalog";
import { agentObservedAt, latestAgentTimestamp } from "@/src/lib/retail/agent-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };

function failure(error: unknown, read = false) {
  const message = error instanceof Error ? error.message : "invalid_request";
  const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("agent_") ? 503 : 400;
  if (read && status === 400) {
    // Do not serialize or log database/driver details. This stable marker is
    // enough to correlate the failed route without exposing query text.
    console.error("retail_agent_catalog_unavailable");
    return Response.json({ ok: false, error: "agent_catalog_unavailable" }, { status: 503, headers });
  }
  return Response.json({ ok: false, error: status === 400 ? "invalid_request" : message }, { status, headers });
}

export async function GET(request: Request) {
  try {
    requireRetailAgentPermission(request, "products:write");
    const snapshot = await getAgentCatalogSnapshot();
    const counts = { products: snapshot.products.length, styles: snapshot.styles.length, variants: snapshot.variants.length };
    const count = counts.products + counts.styles + counts.variants;
    const watermarks = {
      productsUpdatedAt: latestAgentTimestamp(snapshot.products, ["updated_at", "created_at"]),
      stylesUpdatedAt: latestAgentTimestamp(snapshot.styles, ["updated_at", "created_at"]),
      variantsUpdatedAt: latestAgentTimestamp(snapshot.variants, ["updated_at", "created_at"]),
    };
    return Response.json({
      ok: true,
      snapshot,
      observedAt: agentObservedAt(),
      count,
      counts,
      empty: count === 0,
      sourceWindow: { type: "full_catalog_snapshot" },
      watermarks,
    }, { headers });
  } catch (error) { return failure(error, true); }
}

export async function POST(request: Request) {
  try {
    const actor = requireRetailAgentPermission(request, "products:write", true);
    const input = agentCatalogActionDto.parse(await request.json());
    const result = await executeAgentCatalogAction(input, actor);
    return Response.json({ ok: true, action: input.action, ...result }, { status: result.created ? 201 : 200, headers });
  } catch (error) {
    // Validation and database details intentionally share a stable public error.
    return failure(error instanceof z.ZodError ? new Error("invalid_request") : error);
  }
}
