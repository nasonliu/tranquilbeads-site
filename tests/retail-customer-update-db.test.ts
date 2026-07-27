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
let operationRows: unknown[] = [{ audit_count: 1 }];

describe("customer update idempotency transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://test";
    process.env.RETAIL_DATABASE_IDENTITY = crypto.randomUUID();
    operationRows = [{ audit_count: 1 }];
    neonMocks.sql.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
      if (strings.join("?").includes("SELECT identity FROM retail_runtime_environment")) return [{ identity: process.env.RETAIL_DATABASE_IDENTITY }];
      neonMocks.query = { text: strings.join("?"), values };
      return operationRows;
    });
  });

  it("delegates customer, address, and audit writes to one DB-side idempotent operation", async () => {
    await expect(updateCustomer(customerId, {
      name: "Updated customer", addressId, city: "Dubai", isDefault: true, idempotencyKey,
    })).resolves.toBeUndefined();

    expect(neonMocks.sql).toHaveBeenCalledTimes(2);
    const statement = neonMocks.query?.text.replace(/\s+/g, " ") ?? "";
    expect(statement).toContain("SELECT * FROM retail_update_admin_customer(");
    expect(statement).toContain("?::uuid,?::text,?::uuid");
    expect(statement).toContain("?::boolean,?,?::uuid)");
  });

  it("treats an empty DB operation result as customer_not_found", async () => {
    operationRows = [];

    await expect(updateCustomer(customerId, {
      addressId, archive: true, idempotencyKey,
    })).rejects.toThrow("customer_not_found");

    expect(neonMocks.sql).toHaveBeenCalledTimes(2);
  });
});
