import crypto from "node:crypto";

import { hasRetailPermission, retailRoles, type RetailAdminActor, type RetailPermission, type RetailRole } from "./admin-auth";

export type RetailAgentActor = RetailAdminActor & { legacy: false };
type ConfiguredAgent = RetailAgentActor & { token: string };

function configuredAgents(): ConfiguredAgent[] {
  const raw = process.env.RETAIL_AGENT_OPERATORS_JSON;
  const previewImportToken = process.env.VERCEL_ENV === "preview"
    ? process.env.RETAIL_AGENT_PREVIEW_IMPORT_TOKEN
    : undefined;
  const previewImportActor: ConfiguredAgent[] = previewImportToken && previewImportToken.length >= 32
    ? [{ id: "preview-catalog-import", name: "Preview catalog importer", role: "operations", token: previewImportToken, legacy: false }]
    : [];
  if (!raw) return previewImportActor;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return previewImportActor;
    const ids = new Set<string>();
    return [...parsed.flatMap((row): ConfiguredAgent[] => {
      if (!row || typeof row !== "object") return [];
      const value = row as Record<string, unknown>;
      const id = typeof value.id === "string" ? value.id.trim() : "";
      const name = typeof value.name === "string" ? value.name.trim() : "";
      const role = typeof value.role === "string" && retailRoles.includes(value.role as RetailRole) ? value.role as RetailRole : undefined;
      const token = typeof value.token === "string" ? value.token : "";
      if (!id || !name || !role || token.length < 32 || ids.has(id)) return [];
      ids.add(id);
      return [{ id, name, role, token, legacy: false }];
    }), ...previewImportActor];
  } catch { return previewImportActor; }
}

function tokenDigest(value: string) { return crypto.createHash("sha256").update(value).digest(); }

function bearerToken(request: Request) {
  const value = request.headers.get("authorization");
  const match = value?.match(/^Bearer ([^\s]+)$/i);
  return match?.[1] ?? null;
}

// Compare fixed-length digests so malformed or differently-sized tokens do not
// bypass the constant-time comparison used for every configured machine actor.
export function authenticateRetailAgent(request: Request): RetailAgentActor | null {
  const token = bearerToken(request);
  if (!token) return null;
  const presented = tokenDigest(token);
  let actor: RetailAgentActor | null = null;
  for (const candidate of configuredAgents()) {
    const matches = crypto.timingSafeEqual(presented, tokenDigest(candidate.token));
    if (matches) actor = { id: candidate.id, name: candidate.name, role: candidate.role, legacy: false };
  }
  return actor;
}

export function requireRetailAgentPermission(request: Request, permission: RetailPermission, write = false): RetailAgentActor {
  if (process.env.RETAIL_AGENT_ENABLED !== "true") throw new Error("agent_api_disabled");
  if (write && process.env.RETAIL_AGENT_CATALOG_WRITE_ENABLED !== "true") throw new Error("agent_write_disabled");
  if (write && process.env.VERCEL_ENV === "production" && process.env.RETAIL_AGENT_PRODUCTION_ENABLED !== "true") throw new Error("agent_production_write_disabled");
  const actor = authenticateRetailAgent(request);
  if (!actor) throw new Error("unauthorized");
  if (!hasRetailPermission(actor, permission)) throw new Error("forbidden");
  return actor;
}
