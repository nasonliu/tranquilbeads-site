// @vitest-environment node
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const neonMocks = vi.hoisted(() => {
  const sql = Object.assign(vi.fn(), { transaction: vi.fn() });
  return { neon: vi.fn(() => sql), sql };
});

vi.mock("@neondatabase/serverless", () => ({ neon: neonMocks.neon }));

import { guardedRetailSql } from "@/src/lib/retail/database-identity";

const read = (path: string) => readFileSync(path, "utf8");

describe("retail database identity sentinel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://test";
    delete process.env.RETAIL_DATABASE_URL;
    process.env.RETAIL_DATABASE_IDENTITY = crypto.randomUUID();
  });

  it("prefers the retail-only database URL over the marketplace default", async () => {
    process.env.RETAIL_DATABASE_URL = "postgres://preview-retail";
    neonMocks.sql
      .mockResolvedValueOnce([{ identity: process.env.RETAIL_DATABASE_IDENTITY }])
      .mockResolvedValueOnce([{ ok: true }]);

    await expect(guardedRetailSql()`SELECT true AS ok`).resolves.toEqual([{ ok: true }]);
    expect(neonMocks.neon).toHaveBeenCalledWith("postgres://preview-retail");
  });

  it("uses the same retail-first URL precheck in cron and notifications", () => {
    expect(read("app/api/cron/retail/reservations/route.ts")).toContain("process.env.RETAIL_DATABASE_URL || process.env.DATABASE_URL");
    expect(read("src/lib/retail/notifications.ts")).toContain("process.env.RETAIL_DATABASE_URL||process.env.DATABASE_URL");
  });

  it("allows a query only after the connected database returns the configured identity", async () => {
    neonMocks.sql
      .mockResolvedValueOnce([{ identity: process.env.RETAIL_DATABASE_IDENTITY }])
      .mockResolvedValueOnce([{ ok: true }]);

    await expect(guardedRetailSql()`SELECT true AS ok`).resolves.toEqual([{ ok: true }]);
    expect(neonMocks.sql).toHaveBeenCalledTimes(2);
  });

  it("rejects a query before business SQL when the database identity differs", async () => {
    neonMocks.sql.mockResolvedValueOnce([{ identity: "a-different-database-identity" }]);

    await expect(guardedRetailSql()`SELECT true AS ok`).rejects.toThrow("retail_database_identity_mismatch");
    expect(neonMocks.sql).toHaveBeenCalledOnce();
    expect(neonMocks.sql.transaction).not.toHaveBeenCalled();
  });

  it("guards transaction batches with the same identity check", async () => {
    neonMocks.sql.mockResolvedValueOnce([{ identity: process.env.RETAIL_DATABASE_IDENTITY }]);
    neonMocks.sql.transaction.mockResolvedValueOnce([[{ ok: true }]]);
    const query = guardedRetailSql();

    await expect(query.transaction(() => [])).resolves.toEqual([[{ ok: true }]]);
    expect(neonMocks.sql.transaction).toHaveBeenCalledOnce();
  });
});
