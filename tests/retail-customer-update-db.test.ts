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
let operationRows: unknown[] = [{ address_id: addressId, replayed: false }];
let readbackRows: unknown[] = [{ public_id: customerId, addresses: [] }];
let mutationQuery: { text: string; values: unknown[] } | null = null;
const actor = { id: "owner-a", name: "Owner A", role: "owner" as const, legacy: false };

describe("customer update idempotency transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://test";
    process.env.RETAIL_DATABASE_IDENTITY = crypto.randomUUID();
    operationRows = [{ address_id: addressId, replayed: false }];
    readbackRows = [{ public_id: customerId, addresses: [] }];
    mutationQuery = null;
    Object.assign(neonMocks.sql, { unsafe: vi.fn((value: string) => value) });
    neonMocks.sql.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join("?");
      if (text.includes("SELECT identity FROM retail_runtime_environment")) return [{ identity: process.env.RETAIL_DATABASE_IDENTITY }];
      neonMocks.query = { text, values };
      if (text.includes("retail_update_admin_customer_as_actor")) { mutationQuery = { text, values }; return operationRows; }
      return readbackRows;
    });
  });

  it("delegates customer, address, and audit writes to one DB-side idempotent operation", async () => {
    await Promise.resolve();
    await expect(updateCustomer(customerId, {
      name: "Updated customer", addressId, city: "Dubai", isDefault: true, idempotencyKey,
    }, actor)).resolves.toEqual({ customer: { public_id: customerId, addresses: [] }, addressId, replayed: false });

    expect(neonMocks.sql).toHaveBeenCalledTimes(3);
    const statement = mutationQuery?.text.replace(/\s+/g, " ") ?? "";
    expect(statement).toContain("SELECT * FROM retail_update_admin_customer_as_actor(");
    expect(statement).toContain("?::uuid,?::text,?::uuid");
    expect(statement).toContain("?::boolean,?,?::uuid,?,?,?,?)");
    expect(mutationQuery?.values.slice(-4)).toEqual(["owner-a", "Owner A", "owner", false]);
  });

  it("treats an empty DB operation result as customer_not_found", async () => {
    operationRows = [];

    await expect(updateCustomer(customerId, {
      addressId, archive: true, idempotencyKey,
    }, actor)).rejects.toThrow("customer_not_found");

    expect(neonMocks.sql).toHaveBeenCalledTimes(2);
  });

  it("uses the explicit actor after an awaited boundary", async () => {
    await Promise.resolve();
    await expect(updateCustomer(customerId, { name: "No actor", idempotencyKey }, actor)).resolves.toMatchObject({ addressId });
    expect(mutationQuery?.values.slice(-4)).toEqual(["owner-a", "Owner A", "owner", false]);
  });
});
