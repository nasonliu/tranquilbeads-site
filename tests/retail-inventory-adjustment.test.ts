import { afterEach, describe, expect, it, vi } from "vitest";

const { neon } = vi.hoisted(() => ({ neon: vi.fn() }));
const actorMocks = vi.hoisted(() => ({ current: { id: "warehouse-a", name: "Warehouse A", role: "warehouse" as const, legacy: false } as { id: string; name: string; role: "warehouse"; legacy: boolean } | null }));
vi.mock("@neondatabase/serverless", () => ({ neon }));
vi.mock("@/src/lib/retail/admin-auth", () => ({ currentRetailAdminActor: () => actorMocks.current }));

import { adjustInventory } from "@/src/lib/retail/operations";

const publicId = "d7a4c3e5-5e57-4a1f-ae7d-0f024d3ac111";
const idempotencyKey = "e4d39eb5-7d3b-414a-a3cf-890efe02c4fc";

describe("retail inventory adjustment", () => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorIdentity = process.env.RETAIL_DATABASE_IDENTITY;

  afterEach(() => {
    vi.clearAllMocks();
    actorMocks.current = { id: "warehouse-a", name: "Warehouse A", role: "warehouse", legacy: false };
    if (priorDatabaseUrl) process.env.DATABASE_URL = priorDatabaseUrl;
    else delete process.env.DATABASE_URL;
    if (priorIdentity) process.env.RETAIL_DATABASE_IDENTITY = priorIdentity;
    else delete process.env.RETAIL_DATABASE_IDENTITY;
  });

  it("delegates the public-id adjustment and audit to one DB-side idempotent operation", async () => {
    process.env.DATABASE_URL = "postgres://inventory-adjustment-success";
    process.env.RETAIL_DATABASE_IDENTITY = "inventory-adjustment-success";
    const query = vi.fn()
      .mockResolvedValueOnce([{ identity: "inventory-adjustment-success" }])
      .mockResolvedValueOnce([{ adjusted: true }]);
    neon.mockReturnValue(query);

    await adjustInventory({ productId: publicId, delta: 3, reason: "MVP stock", idempotencyKey });

    expect(query).toHaveBeenCalledTimes(2);
    const [sql, ...values] = query.mock.calls[1];
    expect(String(sql.raw.join(""))).toContain("retail_adjust_inventory_as_actor(");
    expect(values).toEqual([publicId, 3, "MVP stock", idempotencyKey, "warehouse-a", "Warehouse A", "warehouse", false]);
  });

  it("fails closed when the DB-side operation returns no result", async () => {
    process.env.DATABASE_URL = "postgres://inventory-adjustment-not-found";
    process.env.RETAIL_DATABASE_IDENTITY = "inventory-adjustment-not-found";
    const query = vi.fn()
      .mockResolvedValueOnce([{ identity: "inventory-adjustment-not-found" }])
      .mockResolvedValueOnce([]);
    neon.mockReturnValue(query);

    await expect(adjustInventory({ productId: publicId, delta: 3, reason: "MVP stock", idempotencyKey })).rejects.toThrow("product_not_found");
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("fails closed without an actor and does not attempt the guarded DB query", async () => {
    process.env.DATABASE_URL = "postgres://inventory-adjustment-no-actor";
    process.env.RETAIL_DATABASE_IDENTITY = "inventory-adjustment-no-actor";
    actorMocks.current = null;
    const query = vi.fn();
    neon.mockReturnValue(query);

    await expect(adjustInventory({ productId: publicId, delta: 3, reason: "MVP stock", idempotencyKey })).rejects.toThrow("admin_actor_missing");
    expect(query).not.toHaveBeenCalled();
  });
});
