import { afterEach, describe, expect, it, vi } from "vitest";

const { neon } = vi.hoisted(() => ({ neon: vi.fn() }));
vi.mock("@neondatabase/serverless", () => ({ neon }));

import { adjustInventory } from "@/src/lib/retail/operations";

const publicId = "d7a4c3e5-5e57-4a1f-ae7d-0f024d3ac111";
const idempotencyKey = "e4d39eb5-7d3b-414a-a3cf-890efe02c4fc";

describe("retail inventory adjustment", () => {
  const priorDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    vi.clearAllMocks();
    if (priorDatabaseUrl) process.env.DATABASE_URL = priorDatabaseUrl;
    else delete process.env.DATABASE_URL;
  });

  it("delegates the public-id adjustment and audit to one DB-side idempotent operation", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const query = vi.fn().mockResolvedValueOnce([{ adjusted: true }]);
    neon.mockReturnValue(query);

    await adjustInventory({ productId: publicId, delta: 3, reason: "MVP stock", idempotencyKey });

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, ...values] = query.mock.calls[0];
    expect(String(sql.raw.join(""))).toContain("retail_adjust_inventory_with_audit(");
    expect(values).toEqual([publicId, 3, "MVP stock", idempotencyKey]);
  });

  it("fails closed when the DB-side operation returns no result", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const query = vi.fn().mockResolvedValue([]);
    neon.mockReturnValue(query);

    await expect(adjustInventory({ productId: publicId, delta: 3, reason: "MVP stock", idempotencyKey })).rejects.toThrow("product_not_found");
    expect(query).toHaveBeenCalledTimes(1);
  });
});
