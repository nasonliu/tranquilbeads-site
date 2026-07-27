// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const neonMocks = vi.hoisted(() => {
  const sql = vi.fn();
  return { neon: vi.fn(() => sql), queries: [] as string[], sql };
});

vi.mock("@neondatabase/serverless", () => ({ neon: neonMocks.neon }));

import { reserveRetailOrderV2 } from "@/src/lib/retail/db";

describe("retail checkout reservation readback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    neonMocks.queries = [];
    process.env.DATABASE_URL = "postgres://test";
    delete process.env.RETAIL_DATABASE_URL;
    process.env.RETAIL_DATABASE_IDENTITY = crypto.randomUUID();
    neonMocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const statement = strings.join("?").replace(/\s+/g, " ");
      if (statement.includes("SELECT identity FROM retail_runtime_environment")) return [{ identity: process.env.RETAIL_DATABASE_IDENTITY }];
      neonMocks.queries.push(statement);
      if (statement.includes("FROM retail_orders WHERE client_request_id")) {
        return [{ client_request_id: "00000000-0000-4000-8000-000000000001", currency: "USD", amount_minor: 3000, subtotal_minor: 2500, shipping_minor: 500, tax_minor: 0, discount_minor: 0, items_snapshot: [], checkout_shipping: {}, status: "pending" }];
      }
      // Reproduce the managed-preview behavior: the function writes the order
      // successfully but its set-returning result is empty to the caller.
      return [];
    });
  });

  it("reads the committed order back by stable request id even when the function returns no rows", async () => {
    await expect(reserveRetailOrderV2(
      "00000000-0000-4000-8000-000000000001",
      [{ sku: "MVP-SANDBOX-20260727", quantity: 1 }],
      { email: "buyer@example.test" },
      3000,
    )).resolves.toMatchObject({ status: "pending", amount_minor: 3000 });

    expect(neonMocks.queries).toHaveLength(2);
    expect(neonMocks.queries[0]).toContain("SELECT * FROM retail_create_checkout_v2(");
    expect(neonMocks.queries[1]).toContain("FROM retail_orders WHERE client_request_id=?::uuid LIMIT 1");
  });
});
