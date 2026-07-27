// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const neonMocks = vi.hoisted(() => {
  const sql = vi.fn();
  return { neon: vi.fn(() => sql), query: null as { text: string; values: unknown[] } | null, sql };
});

vi.mock("@neondatabase/serverless", () => ({ neon: neonMocks.neon }));

import { updateCustomer } from "@/src/lib/retail/operations";

const customerId = "00000000-0000-4000-8000-000000000001";
const addressId = "00000000-0000-4000-8000-000000000002";
const idempotencyKey = "00000000-0000-4000-8000-000000000003";

describe("customer update CTE transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://test";
    neonMocks.sql.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
      neonMocks.query = { text: strings.join("?"), values };
      return [{ audit_count: 1 }];
    });
  });

  it("forces customer, address, and audit writes through one consumed CTE chain", async () => {
    await expect(updateCustomer(customerId, {
      name: "Updated customer", addressId, city: "Dubai", isDefault: true, idempotencyKey,
    })).resolves.toBeUndefined();

    expect(neonMocks.sql).toHaveBeenCalledOnce();
    const statement = neonMocks.query?.text.replace(/\s+/g, " ") ?? "";
    expect(statement).toContain("WITH customer_update AS (");
    expect(statement).toContain("RETURNING public_id");
    expect(statement).toContain("address_update AS (");
    expect(statement).toContain("FROM customer_update");
    expect(statement).toContain("CASE WHEN ?::boolean THEN retail_upsert_customer_address(");
    expect(statement).toContain("customer_update.public_id,?::uuid,?::text,?::text");
    expect(statement).toContain("audit_row AS (");
    expect(statement).toContain("FROM customer_update CROSS JOIN address_update");
    expect(statement).toContain("SELECT count(*)::int AS audit_count FROM audit_row");
  });

  it("treats an empty consumed CTE chain as customer_not_found", async () => {
    neonMocks.sql.mockReturnValueOnce([]);

    await expect(updateCustomer(customerId, {
      addressId, archive: true, idempotencyKey,
    })).rejects.toThrow("customer_not_found");

    expect(neonMocks.sql).toHaveBeenCalledOnce();
  });
});
