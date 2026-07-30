import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
vi.mock("@/src/lib/retail/database-identity", () => ({ guardedRetailSql: () => query }));

describe("retail catalog admin snapshot queries", () => {
  beforeEach(() => query.mockReset().mockResolvedValue([]));

  it("groups the product creation timestamp used to order the full style snapshot", async () => {
    const { listCatalogStyles } = await import("@/src/lib/retail/catalog-admin");
    await listCatalogStyles();

    const strings = query.mock.calls[0]?.[0] as TemplateStringsArray;
    const sql = strings.join("?");
    expect(sql).toContain("GROUP BY s.id,image.blob_url,p.public_id,p.sku,p.title_en,p.created_at");
    expect(sql).toContain("ORDER BY p.created_at DESC");
  });
});
