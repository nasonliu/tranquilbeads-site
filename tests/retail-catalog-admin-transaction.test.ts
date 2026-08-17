import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
const transaction = vi.fn();
let transactionStatements: { kind?: string; sql?: string }[] = [];
vi.mock("@/src/lib/retail/database-identity", () => ({ guardedRetailSql: () => query }));

describe("retail catalog admin transactions", () => {
  beforeEach(() => {
    query.mockReset().mockResolvedValue([]);
    transaction.mockReset().mockImplementation(async (build) => {
      const tx = vi.fn((strings: TemplateStringsArray) => ({ kind: "NeonQueryPromise", sql: strings.join("?") }));
      transactionStatements = build(tx);
      return [];
    });
    Object.assign(query, { transaction });
  });

  it("constructs idempotency, domain, and audit queries from the transaction SQL tag", async () => {
    const { createPromotion } = await import("@/src/lib/retail/catalog-admin");
    await createPromotion({
      code: "SUMMER10",
      kind: "percent",
      amount: 1_000,
      minimumSubtotalMinor: 0,
      scope: { all: true },
      active: true,
      idempotencyKey: "fd100336-8e74-494b-9c9e-2d08f4ed9d01",
    }, { id: "operator-1", name: "Operator", role: "owner", legacy: false });

    // The guarded tag returns a plain Promise. Only the two idempotency replay
    // reads may use it directly; all mutation statements are built by tx.
    expect(query).toHaveBeenCalledTimes(2);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transactionStatements).toHaveLength(3);
    expect(transactionStatements.every((statement) => statement.kind === "NeonQueryPromise")).toBe(true);
  });

  it("builds the live style update lock and mutation from the transaction SQL tag", async () => {
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "style-row", product_id: "product-row" }])
      .mockResolvedValueOnce([]);
    const { updateCatalogStyle } = await import("@/src/lib/retail/catalog-admin");
    await updateCatalogStyle("72a42247-368f-4de6-bc71-847a0134379b", {
      titleEn: "Updated style",
      idempotencyKey: "82a42247-368f-4de6-bc71-847a0134379b",
    }, { id: "operator-1", name: "Operator", role: "owner", legacy: false });

    expect(query).toHaveBeenCalledTimes(3);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transactionStatements).toHaveLength(4);
    expect(transactionStatements.every((statement) => statement.kind === "NeonQueryPromise")).toBe(true);
    expect(transactionStatements.map((statement) => statement.sql).join("\n")).toContain("UPDATE retail_product_styles");
  });
});
