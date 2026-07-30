import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { authenticateRetailAgent, requireRetailAgentPermission } from "@/src/lib/retail/agent-auth";
import { agentCatalogActionDto } from "@/src/lib/retail/agent-catalog";

const read = (name: string) => fs.readFileSync(path.join(process.cwd(), name), "utf8");

describe("retail agent catalog API contract", () => {
  it("authenticates only configured machine principals with a sufficiently long bearer token", () => {
    const prior = process.env.RETAIL_AGENT_OPERATORS_JSON;
    process.env.RETAIL_AGENT_OPERATORS_JSON = JSON.stringify([{ id: "catalog-1", name: "Catalog", role: "operations", token: "t".repeat(32) }, { id: "invalid", name: "Invalid", role: "owner", token: "short" }]);
    expect(authenticateRetailAgent(new Request("http://localhost", { headers: { authorization: `Bearer ${"t".repeat(32)}` } }))).toEqual({ id: "catalog-1", name: "Catalog", role: "operations", legacy: false });
    expect(authenticateRetailAgent(new Request("http://localhost", { headers: { authorization: "Bearer wrong" } }))).toBeNull();
    if (prior === undefined) delete process.env.RETAIL_AGENT_OPERATORS_JSON; else process.env.RETAIL_AGENT_OPERATORS_JSON = prior;
  });

  it("keeps reads and writes behind explicit, independently revocable switches", () => {
    const saved = { enabled: process.env.RETAIL_AGENT_ENABLED, write: process.env.RETAIL_AGENT_CATALOG_WRITE_ENABLED, production: process.env.RETAIL_AGENT_PRODUCTION_ENABLED, vercel: process.env.VERCEL_ENV, operators: process.env.RETAIL_AGENT_OPERATORS_JSON };
    const request = new Request("http://localhost", { headers: { authorization: `Bearer ${"t".repeat(32)}` } });
    try {
      process.env.RETAIL_AGENT_OPERATORS_JSON = JSON.stringify([{ id: "catalog-1", name: "Catalog", role: "operations", token: "t".repeat(32) }]);
      process.env.RETAIL_AGENT_ENABLED = "false";
      expect(() => requireRetailAgentPermission(request, "products:write")).toThrow("agent_api_disabled");
      process.env.RETAIL_AGENT_ENABLED = "true";
      process.env.RETAIL_AGENT_CATALOG_WRITE_ENABLED = "false";
      expect(() => requireRetailAgentPermission(request, "products:write", true)).toThrow("agent_write_disabled");
      process.env.RETAIL_AGENT_CATALOG_WRITE_ENABLED = "true";
      process.env.VERCEL_ENV = "production";
      process.env.RETAIL_AGENT_PRODUCTION_ENABLED = "false";
      expect(() => requireRetailAgentPermission(request, "products:write", true)).toThrow("agent_production_write_disabled");
    } finally {
      for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    }
  });

  it("keeps the public API narrow and maps writes to audited, idempotent domain services", () => {
    const auth = read("src/lib/retail/agent-auth.ts");
    const catalog = read("src/lib/retail/agent-catalog.ts");
    const route = read("app/api/agent/retail/catalog/route.ts");
    const media = read("app/api/agent/retail/media/route.ts");
    expect(auth).toContain("timingSafeEqual");
    expect(auth).toContain("RETAIL_AGENT_OPERATORS_JSON");
    for (const action of ["product.create", "product.update", "product.content.replace", "style.create", "style.update", "variant.create", "variant.update", "media.reorder"]) expect(catalog).toContain(action);
    expect(catalog).toContain("createAdminProduct");
    expect(catalog).toContain("createCatalogVariant");
    expect(catalog).toContain("reorderRetailProductImages");
    expect(read("src/lib/retail/operations.ts")).toContain("p.media_version AS image_version");
    expect(route).toContain('requireRetailAgentPermission(request, "products:write")');
    expect(auth).toContain("RETAIL_AGENT_ENABLED");
    expect(auth).toContain("RETAIL_AGENT_CATALOG_WRITE_ENABLED");
    expect(auth).toContain("RETAIL_AGENT_PRODUCTION_ENABLED");
    expect(media).toContain("uploadRetailProductImage");
    expect(media).toContain("deleteRetailProductImage");
    expect(media).toContain("reorderRetailProductImages");
  });

  it("accepts the documented flat draft, PDP, SKC, SKU, and media action envelopes", () => {
    const key = "00000000-0000-4000-8000-000000000001";
    const productId = "00000000-0000-4000-8000-000000000002";
    const styleId = "00000000-0000-4000-8000-000000000003";
    const variantId = "00000000-0000-4000-8000-000000000004";
    const imageId = "00000000-0000-4000-8000-000000000005";
    const actions = [
      { action: "product.create", sku: "AGENT-001", slug: "agent-001", titleEn: "Agent product", titleAr: "منتج", titleZh: "Agent 商品", descriptionEn: "", descriptionAr: "", descriptionZh: "", status: "draft", amountMinor: 1999, onHand: 5, idempotencyKey: key },
      { action: "product.update", productId, status: "published", idempotencyKey: key },
      { action: "product.content.replace", productId, highlights: [{ en: "Quality", ar: "جودة", zh: "品质" }], details: [], aPlus: [], idempotencyKey: key },
      { action: "style.create", productId, code: "RED", titleEn: "Red", titleAr: "أحمر", titleZh: "红色", optionValues: { en: { Color: "Red" }, ar: { Color: "أحمر" }, zh: { Color: "红色" } }, idempotencyKey: key },
      { action: "style.update", styleId, position: 1, idempotencyKey: key },
      { action: "variant.create", productId, styleId, sku: "AGENT-001-RED", titleEn: "Red", titleAr: "أحمر", titleZh: "红色", optionValues: { en: { Color: "Red" }, ar: { Color: "أحمر" }, zh: { Color: "红色" } }, amountMinor: 2099, onHand: 3, idempotencyKey: key },
      { action: "variant.update", variantId, onHand: 4, idempotencyKey: key },
      { action: "media.reorder", productId, imageIds: [imageId], expectedVersion: 0, idempotencyKey: key },
    ];
    for (const action of actions) expect(agentCatalogActionDto.safeParse(action).success).toBe(true);
    expect(agentCatalogActionDto.safeParse({ ...actions[0], status: "published" }).success).toBe(false);
    expect(agentCatalogActionDto.safeParse({ ...actions[0], status: "archived" }).success).toBe(false);
    expect(agentCatalogActionDto.safeParse({ action: "raw.sql", sql: "DELETE FROM retail_products", idempotencyKey: key }).success).toBe(false);
  });
});
