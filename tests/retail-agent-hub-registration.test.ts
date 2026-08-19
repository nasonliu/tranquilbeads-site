import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const registration = JSON.parse(readFileSync("docs/retail-agent-hub.registration.json", "utf8")) as Record<string, unknown>;
const source = readFileSync("docs/retail-agent-hub.registration.json", "utf8");

describe("retail Agent Hub registration", () => {
  it("is a non-secret stdio registration with the exact 20-tool allowlist", () => {
    expect(registration).toMatchObject({
      id: "tranquilbeads-retail-ops",
      serverVersion: "1.1.1",
      productionPrincipal: {
        id: "ppcme-agent-hub-vm104",
        name: "PPC-ME Agent Hub VM 104",
        role: "owner",
        tokenEnvironment: "RETAIL_AGENT_HUB_TOKEN",
        productionOnly: true,
        secretValueIncluded: false,
      },
      transport: { type: "stdio", launcher: "scripts/run-retail-ops-mcp.sh" },
      readiness: { toolsListExactCount: 20 },
    });
    const tools = registration.toolAllowlist as string[];
    expect(tools).toHaveLength(20);
    expect(new Set(tools).size).toBe(20);
    expect(source).not.toMatch(/Bearer\s+[A-Za-z0-9_-]{24,}/i);
    expect(source).not.toMatch(/"RETAIL_AGENT_TOKEN"\s*:\s*"[^"$]/);
    expect(source).not.toContain("/Users/");
    expect(source).not.toContain("raw_sql\": true");
  });
});
