import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPaypalSettlementRows, paypalSettlementSyncDto } from "@/src/lib/retail/paypal-reporting";

function configure() {
  vi.stubEnv("RETAIL_SHOP_ENABLED", "true");
  vi.stubEnv("RETAIL_PAYMENT_MODE", "sandbox");
  vi.stubEnv("PAYPAL_CLIENT_ID", "client-id");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "client-secret");
  vi.stubEnv("PAYPAL_WEBHOOK_ID", "webhook-id");
  vi.stubEnv("RETAIL_DATABASE_URL", "postgres://example.invalid/db");
  vi.stubEnv("RETAIL_DATABASE_IDENTITY", "preview-identity");
  vi.stubEnv("RETAIL_DATABASE_ENVIRONMENT", "preview");
  vi.stubEnv("VERCEL_ENV", "preview");
}

afterEach(() => vi.unstubAllEnvs());

describe("PayPal Reporting settlement sync", () => {
  it("requests the official reporting endpoint and keeps only normalized USD accounting fields", async () => {
    configure();
    const calls: Array<{ input: string; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ input: String(input), init });
      if (String(input).endsWith("/v1/oauth2/token")) return Response.json({ access_token: "access-token" });
      return Response.json({ total_pages: 1, transaction_details: [
        { transaction_info: { transaction_id: "PAYPALUSD123456789", transaction_event_code: "T0006", transaction_status: "S", transaction_amount: { currency_code: "USD", value: "100.00" }, fee_amount: { currency_code: "USD", value: "-4.00" }, net_amount: { currency_code: "USD", value: "96.00" }, paypal_reference_id: "CAPTURE12345678901", transaction_updated_date: "2026-08-18T01:00:00Z" } },
        { transaction_info: { transaction_id: "PAYPALEUR123456789", transaction_event_code: "T0006", transaction_status: "S", transaction_amount: { currency_code: "EUR", value: "20.00" } } },
      ] });
    });
    const report = await fetchPaypalSettlementRows({ days: 7 }, fetcher as typeof fetch, new Date("2026-08-18T08:00:00Z"));
    expect(report.rows).toEqual([{ transactionId: "PAYPALUSD123456789", transactionType: "T0006", transactionStatus: "S", currency: "USD", gross: "100.00", fee: "-4.00", net: "96.00", relatedCaptureId: "CAPTURE12345678901", occurredAt: "2026-08-18T01:00:00Z" }]);
    expect(report.skipped).toBe(1);
    expect(calls[1]?.input).toContain("/v1/reporting/transactions?");
    expect(calls[1]?.input).toContain("fields=transaction_info");
    expect(new Headers(calls[1]?.init?.headers).get("authorization")).toBe("Bearer access-token");
  });

  it("limits one manual sync window to 31 days", () => {
    expect(() => paypalSettlementSyncDto.parse({ days: 32, idempotencyKey: crypto.randomUUID() })).toThrow();
  });
});
