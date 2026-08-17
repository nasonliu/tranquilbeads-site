import { z } from "zod";

import { requireRetailAgentPermission } from "@/src/lib/retail/agent-auth";
import { agentCatalogActionDto, executeAgentCatalogAction, getAgentCatalogSnapshot } from "@/src/lib/retail/agent-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "invalid_request";
  const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("agent_") ? 503 : 400;
  if (status !== 401 && status !== 403) console.error("retail_agent_catalog_failure", message);
  return Response.json({ ok: false, error: status === 400 ? "invalid_request" : message }, { status, headers });
}

export async function GET(request: Request) {
  try {
    requireRetailAgentPermission(request, "products:write");
    return Response.json({ ok: true, snapshot: await getAgentCatalogSnapshot() }, { headers });
  } catch (error) { return failure(error); }
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
