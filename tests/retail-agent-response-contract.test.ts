import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { latestAgentTimestamp } from "@/src/lib/retail/agent-response";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  getSnapshot: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("@/src/lib/retail/agent-auth", () => ({ requireRetailAgentPermission: mocks.requirePermission }));
vi.mock("@/src/lib/retail/agent-catalog", async () => {
  const { z } = await import("zod");
  return {
    agentCatalogActionDto: z.object({ action: z.string() }),
    executeAgentCatalogAction: mocks.execute,
    getAgentCatalogSnapshot: mocks.getSnapshot,
  };
});

describe("retail Agent response metadata", () => {
  afterEach(() => vi.restoreAllMocks());

  it("derives only real timestamp watermarks from returned rows", () => {
    expect(latestAgentTimestamp([{ updated_at: "2026-08-18T01:00:00Z" }, { updated_at: "2026-08-19T02:00:00Z" }], ["updated_at"]))
      .toBe("2026-08-19T02:00:00.000Z");
    expect(latestAgentTimestamp([], ["updated_at"])).toBeNull();
    expect(latestAgentTimestamp([{ updated_at: "not-a-date" }], ["updated_at"])).toBeNull();
  });

  it("returns a complete empty catalogue with observedAt and nullable watermarks", async () => {
    mocks.getSnapshot.mockResolvedValue({ products: [], styles: [], variants: [] });
    const { GET } = await import("@/app/api/agent/retail/catalog/route");
    const response = await GET(new Request("https://example.test/api/agent/retail/catalog"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true, count: 0, counts: { products: 0, styles: 0, variants: 0 }, empty: true,
      sourceWindow: { type: "full_catalog_snapshot" },
      watermarks: { productsUpdatedAt: null, stylesUpdatedAt: null, variantsUpdatedAt: null },
    });
    expect(new Date(body.observedAt).toISOString()).toBe(body.observedAt);
  });

  it("maps catalogue read failures to one stable 503 without logging database details", async () => {
    mocks.getSnapshot.mockRejectedValue(new Error("sensitive database query detail"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { GET } = await import("@/app/api/agent/retail/catalog/route");
    const response = await GET(new Request("https://example.test/api/agent/retail/catalog"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "agent_catalog_unavailable" });
    expect(error).toHaveBeenCalledWith("retail_agent_catalog_unavailable");
    expect(error.mock.calls.flat().join(" ")).not.toContain("sensitive database query detail");
  });

  it("keeps metadata on all requested operations reads without exposing PII", () => {
    const source = readFileSync("app/api/agent/retail/operations/route.ts", "utf8");
    for (const resource of ['input.resource === "orders"', 'input.resource === "sales"', 'input.resource === "sales_detail"']) expect(source).toContain(resource);
    for (const field of ["observedAt", "count", "empty", "sourceWindow", "watermarks"]) expect(source).toContain(field);
    expect(source).not.toContain("orders:pii");
  });

  it("keeps native sharp outside read-only route module initialization", () => {
    const service = readFileSync("src/lib/retail/media-service.ts", "utf8");
    expect(service).not.toContain('import { validateRetailImage } from "./upload-validation"');
    expect(service).toContain('await import("./upload-validation")');
  });
});
