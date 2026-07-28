// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => {
  const actor = { id: "owner", name: "Owner", role: "owner" as const, legacy: false };
  return {
    actor,
    assertSameOrigin: vi.fn(async () => undefined),
    hasRetailPermission: vi.fn(() => true),
    requireRetailPermission: vi.fn(async () => actor),
    listAdminReturns: vi.fn(async () => []),
    getAdminReturnNotes: vi.fn(async () => ({ customerNote: "", adminNote: "" })),
    transitionAdminReturn: vi.fn(async () => ({ publicId: "00000000-0000-4000-8000-000000000001", status: "received", replayed: false })),
    linkAdminReturnRefund: vi.fn(async () => undefined),
    listPayPalSettlementImports: vi.fn(async () => []),
    listPayPalSettlementExceptions: vi.fn(async () => []),
    listPayPalSettlementDetails: vi.fn(async () => ({ transactions: [], matches: [], payouts: [], payoutItems: [], page: { limit: 100, offset: 0 } })),
    importPayPalSettlement: vi.fn(async () => ({ id: "import-1" })),
    closePayPalSettlementException: vi.fn(async () => undefined),
  };
});

vi.mock("@/src/lib/retail/admin-auth", () => ({
  assertSameOrigin: fixture.assertSameOrigin,
  hasRetailPermission: fixture.hasRetailPermission,
  requireRetailPermission: fixture.requireRetailPermission,
}));
vi.mock("@/src/lib/retail/returns", () => ({
  adminReturnTransitionDto: { parse: (value: unknown) => value },
  adminReturnRefundLinkDto: { parse: (value: unknown) => value },
  getAdminReturnNotes: fixture.getAdminReturnNotes,
  linkAdminReturnRefund: fixture.linkAdminReturnRefund,
  listAdminReturns: fixture.listAdminReturns,
  transitionAdminReturn: fixture.transitionAdminReturn,
}));
vi.mock("@/src/lib/retail/settlements", () => ({
  settlementImportDto: { parse: (value: unknown) => value },
  settlementCloseDto: { parse: (value: unknown) => value },
  closePayPalSettlementException: fixture.closePayPalSettlementException,
  importPayPalSettlement: fixture.importPayPalSettlement,
  listPayPalSettlementDetails: fixture.listPayPalSettlementDetails,
  listPayPalSettlementExceptions: fixture.listPayPalSettlementExceptions,
  listPayPalSettlementImports: fixture.listPayPalSettlementImports,
}));

import { GET as listReturns } from "@/app/api/admin/retail/returns/route";
import { PATCH as transitionReturn } from "@/app/api/admin/retail/returns/[id]/route";
import { POST as linkRefund } from "@/app/api/admin/retail/returns/[id]/refund/route";
import { GET as returnNotes } from "@/app/api/admin/retail/returns/[id]/notes/route";
import { GET as listSettlements, POST as importSettlement } from "@/app/api/admin/retail/settlements/route";
import { POST as closeSettlementException } from "@/app/api/admin/retail/settlements/exceptions/[id]/close/route";

const id = "00000000-0000-4000-8000-000000000001";
const request = (body?: unknown) => new Request("https://preview.test/api", body === undefined ? undefined : { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

describe("retail admin routes pass the verified actor explicitly", () => {
  beforeEach(() => {
    for (const value of Object.values(fixture)) if (typeof value === "function" && "mockClear" in value) value.mockClear();
    fixture.requireRetailPermission.mockResolvedValue(fixture.actor);
  });

  it("does not rely on AsyncLocalStorage for return reads and mutations after permission awaits", async () => {
    await listReturns(new Request("https://preview.test/api/admin/retail/returns"));
    await transitionReturn(request({ status: "received", adminNote: "ok", sellableRestock: false, idempotencyKey: id }), { params: Promise.resolve({ id }) });
    await linkRefund(request({ refundRequestId: id, idempotencyKey: id }), { params: Promise.resolve({ id }) });
    await returnNotes(new Request("https://preview.test/api/admin/retail/returns"), { params: Promise.resolve({ id }) });

    expect(fixture.listAdminReturns).toHaveBeenCalledWith(undefined, fixture.actor);
    expect(fixture.transitionAdminReturn).toHaveBeenCalledWith(id, expect.any(Object), fixture.actor);
    expect(fixture.linkAdminReturnRefund).toHaveBeenCalledWith(id, expect.any(Object), fixture.actor);
    expect(fixture.getAdminReturnNotes).toHaveBeenCalledWith(id, fixture.actor);
  });

  it("passes the verified writer to settlement mutations while retaining the finance-read boundary for reports", async () => {
    await listSettlements(new Request("https://preview.test/api/admin/retail/settlements?state=open&limit=10&offset=0"));
    await importSettlement(request({ filename: "settlement.csv", format: "csv", content: "x", idempotencyKey: id }));
    await closeSettlementException(request({ note: "resolved", idempotencyKey: id }), { params: Promise.resolve({ id }) });

    expect(fixture.listPayPalSettlementImports).toHaveBeenCalledWith();
    expect(fixture.listPayPalSettlementExceptions).toHaveBeenCalledWith("open");
    expect(fixture.listPayPalSettlementDetails).toHaveBeenCalledWith({ state: "open", limit: 10, offset: 0 });
    expect(fixture.importPayPalSettlement).toHaveBeenCalledWith(expect.any(Object), fixture.actor);
    expect(fixture.closePayPalSettlementException).toHaveBeenCalledWith(id, expect.any(Object), fixture.actor);
  });
});
