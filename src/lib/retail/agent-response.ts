type AgentRow = Record<string, unknown>;

function timestamp(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString();
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

export function latestAgentTimestamp(rows: unknown[], fields: string[]) {
  let latest: string | null = null;
  for (const value of rows) {
    if (!value || typeof value !== "object") continue;
    const row = value as AgentRow;
    for (const field of fields) {
      const candidate = timestamp(row[field]);
      if (candidate && (!latest || candidate > latest)) latest = candidate;
    }
  }
  return latest;
}

export function agentObservedAt() {
  return new Date().toISOString();
}
