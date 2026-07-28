// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const neonMocks = vi.hoisted(() => {
  const sql = Object.assign(vi.fn(), { transaction: vi.fn() });
  return { neon: vi.fn(() => sql), queries: [] as Array<{ text: string; values: unknown[] }>, sql };
});

vi.mock("@neondatabase/serverless", () => ({ neon: neonMocks.neon }));

import { processVerifiedWebhook, summarizeVerifiedPaypalWebhook } from "@/src/lib/retail/db";

describe("verified webhook database transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://test";
    process.env.RETAIL_DATABASE_IDENTITY = crypto.randomUUID();
    neonMocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      if (strings.join("?").includes("SELECT identity FROM retail_runtime_environment")) return [{ identity: process.env.RETAIL_DATABASE_IDENTITY }];
      return [];
    });
    neonMocks.sql.transaction.mockImplementation((build) => {
      const tx = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ text: strings.join("?"), values }));
      neonMocks.queries = build(tx);
      return Promise.resolve([[], [{ status: "processed" }], [], [{ status: "processed" }]]);
    });
  });

  it("uses a non-interactive transaction with separate event lifecycle statements", async () => {
    await expect(processVerifiedWebhook(
      "webhook-event", "PAYMENT.CAPTURE.COMPLETED", "{}",
      { resource: { id: "capture", amount: { currency_code: "USD", value: "12.00" }, supplementary_data: { related_ids: { order_id: "order" } } } },
    )).resolves.toBe("processed");

    expect(neonMocks.sql.transaction).toHaveBeenCalledOnce();
    expect(neonMocks.queries).toHaveLength(4);
    const statements = neonMocks.queries.map(({ text }) => text.replace(/\s+/g, " "));
    expect(statements[0]).toContain("INSERT INTO retail_webhook_events");
    expect(statements[0]).toContain("ON CONFLICT (paypal_event_id) DO NOTHING");
    expect(statements[0]).toContain("?::text, ?::text, ?::text, ?::jsonb");
    expect(statements[0]).not.toContain("UPDATE");
    expect(statements[1]).toContain("WITH capture_update AS");
    expect(statements[1]).toContain("UPDATE retail_webhook_events SET status = CASE");
    expect(statements[1]).toContain("retail_apply_paypal_capture(?::text, ?::text, ?::jsonb, ?::jsonb, ?::bigint, ?::bigint)");
    expect(statements[1]).toContain("paypal_event_id=?::text");
    expect(statements[1]).not.toContain("INSERT INTO retail_webhook_events");
    expect(statements[1]).not.toContain("processed_event AS");
    expect(statements[2]).toContain("UPDATE retail_webhook_events SET status = 'rejected'");
    expect(statements[3]).toContain("SELECT status FROM retail_webhook_events");
    expect(statements[3]).toContain("paypal_event_id=?::text");
  });

  it("acknowledges an already-completed event as a duplicate without reprocessing it", async () => {
    neonMocks.sql.transaction.mockResolvedValueOnce([[], [], [], [{ status: "processed" }]]);

    await expect(processVerifiedWebhook("webhook-event", "PAYMENT.CAPTURE.COMPLETED", "{}", {})).resolves.toBe("duplicate");
  });

  it("persists only an allowlisted summary and keeps an unlinked dispute retryable", async () => {
    neonMocks.sql.transaction.mockResolvedValueOnce([[], [], [], [{ status: "received" }]]);
    const raw = JSON.stringify({ resource: { id: "DISPUTE-1", payer: { email_address: "buyer@example.test" } } });

    await expect(processVerifiedWebhook(
      "dispute-event", "CUSTOMER.DISPUTE.CREATED", raw,
      { resource: { dispute_id: "DISPUTE-1", disputed_transactions: [{ seller_transaction_id: "CAPTURE-1" }] } },
    )).resolves.toBe("retry");

    const statements = neonMocks.queries.map(({ text }) => text.replace(/\s+/g, " "));
    expect(statements[0]).toContain("INSERT INTO retail_webhook_events");
    expect(statements[1]).toContain("dispute_result AS");
    expect(statements[1]).toContain("retail_apply_paypal_dispute");
    expect(statements[2]).toContain("AND NOT ?");
  });

  it("redacts arbitrary PayPal payload fields from persisted event summaries", () => {
    expect(summarizeVerifiedPaypalWebhook("event", "CUSTOMER.DISPUTE.CREATED", {
      resource: {
        dispute_id: "DISPUTE-1",
        amount: { currency_code: "USD", value: "12.00" },
        supplementary_data: { related_ids: { order_id: "ORDER-1", capture_id: "CAPTURE-1" } },
        disputed_transactions: [{ seller_transaction_id: "CAPTURE-1" }],
        // The webhook can carry more fields, but none are copied into storage.
        ...({ payer: { email_address: "buyer@example.test" } } as object),
      },
    })).toEqual({
      paypalEventId: "event", eventType: "CUSTOMER.DISPUTE.CREATED", resourceId: null, disputeId: "DISPUTE-1",
      relatedOrderId: "ORDER-1", relatedCaptureId: "CAPTURE-1", sellerTransactionIds: ["CAPTURE-1"], currency: "USD", amountMinor: 1200,
    });
  });
});
