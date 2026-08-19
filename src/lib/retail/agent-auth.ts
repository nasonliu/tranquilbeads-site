import crypto from "node:crypto";

import { hasRetailPermission, retailRoles, type RetailAdminActor, type RetailPermission, type RetailRole } from "./admin-auth";

export type RetailAgentActor = RetailAdminActor & { legacy: false };
type ConfiguredAgent = RetailAgentActor & { token: string };

const HUB_AGENT = {
  id: "ppcme-agent-hub-vm104",
  name: "PPC-ME Agent Hub VM 104",
  role: "owner" as const,
};

function productionHubAgent(): ConfiguredAgent[] {
  const token = process.env.VERCEL_ENV === "production"
    ? process.env.RETAIL_AGENT_HUB_TOKEN
    : undefined;
  return token && token.length >= 32
    ? [{ ...HUB_AGENT, token, legacy: false }]
    : [];
}

function configuredAgents(): ConfiguredAgent[] {
  const raw = process.env.RETAIL_AGENT_OPERATORS_JSON;
  const hubAgent = productionHubAgent();
  const previewImportToken = process.env.VERCEL_ENV === "preview"
    ? process.env.RETAIL_AGENT_PREVIEW_IMPORT_TOKEN
    : undefined;
  const previewImportActor: ConfiguredAgent[] = previewImportToken && previewImportToken.length >= 32
    ? [{ id: "preview-catalog-import", name: "Preview catalog importer", role: "operations", token: previewImportToken, legacy: false }]
    : [];
  const fixedAgents = [...previewImportActor, ...hubAgent];
  if (!raw) return fixedAgents;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fixedAgents;
    // When the dedicated Hub secret is configured, its identity and role are
    // fixed by code and cannot be shadowed by the legacy JSON configuration.
    const ids = new Set<string>(hubAgent.map((agent) => agent.id));
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
    }), ...fixedAgents];
  } catch { return fixedAgents; }
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
