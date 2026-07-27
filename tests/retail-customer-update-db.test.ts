// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const neonMocks = vi.hoisted(() => {
  const sql = Object.assign(vi.fn(), { transaction: vi.fn() });
  return { neon: vi.fn(() => sql), queries: [] as Array<{ text: string; values: unknown[] }>, sql };
});

vi.mock("@neondatabase/serverless", () => ({ neon: neonMocks.neon }));

import { updateCustomer } from "@/src/lib/retail/operations";

const customerId = "00000000-0000-4000-8000-000000000001";
const addressId = "00000000-0000-4000-8000-000000000002";
const idempotencyKey = "00000000-0000-4000-8000-000000000003";

describe("customer update database transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://test";
    neonMocks.sql.transaction.mockImplementation((build) => {
      const tx = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ text: strings.join("?"), values }));
      neonMocks.queries = build(tx);
      return Promise.resolve([[], [], []]);
    });
  });

  it("executes the address function inside the same transaction as customer and audit writes", async () => {
    await expect(updateCustomer(customerId, {
      name: "Updated customer", addressId, city: "Dubai", isDefault: true, idempotencyKey,
    })).resolves.toBeUndefined();

    expect(neonMocks.sql.transaction).toHaveBeenCalledOnce();
    expect(neonMocks.sql).not.toHaveBeenCalled();
    expect(neonMocks.queries).toHaveLength(3);
    const statements = neonMocks.queries.map(({ text }) => text.replace(/\s+/g, " "));
    expect(statements[0]).toContain("UPDATE retail_customers");
    expect(statements[0]).toContain("?::text");
    expect(statements[0]).toContain("?::uuid");
    expect(statements[1]).toContain("SELECT retail_upsert_customer_address(");
    expect(statements[1]).toContain("?::uuid,?::uuid,?::text,?::text");
    expect(statements[1]).toContain("?::boolean,?::boolean");
    expect(statements[1]).toContain("WHERE ?::boolean");
    expect(statements[2]).toContain("INSERT INTO retail_admin_audit");
    expect(statements[2]).toContain("?::text,?::jsonb");
  });

  it("does not fall back to separate writes when a transaction statement fails", async () => {
    neonMocks.sql.transaction.mockRejectedValueOnce(new Error("address not found"));

    await expect(updateCustomer(customerId, {
      addressId, archive: true, idempotencyKey,
    })).rejects.toThrow("address not found");

    expect(neonMocks.sql.transaction).toHaveBeenCalledOnce();
    expect(neonMocks.sql).not.toHaveBeenCalled();
  });
});
