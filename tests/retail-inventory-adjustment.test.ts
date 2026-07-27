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

  it("maps the operator-facing product public_id to the internal primary key before writing inventory", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const query = vi.fn().mockResolvedValueOnce([{ adjusted: true }]).mockResolvedValueOnce([]);
    neon.mockReturnValue(query);

    await adjustInventory({ productId: publicId, delta: 3, reason: "MVP stock", idempotencyKey });

    expect(query).toHaveBeenCalledTimes(2);
    const [sql, ...values] = query.mock.calls[0];
    expect(String(sql.raw.join(""))).toContain("retail_adjust_inventory(p.id");
    expect(String(sql.raw.join(""))).toContain("WHERE p.public_id=");
    expect(values).toEqual([3, "MVP stock", idempotencyKey, publicId]);
  });

  it("fails closed without recording an audit entry when no product has that public_id", async () => {
    process.env.DATABASE_URL = "postgres://test";
    const query = vi.fn().mockResolvedValue([]);
    neon.mockReturnValue(query);

    await expect(adjustInventory({ productId: publicId, delta: 3, reason: "MVP stock", idempotencyKey })).rejects.toThrow("product_not_found");
    expect(query).toHaveBeenCalledTimes(1);
  });
});
