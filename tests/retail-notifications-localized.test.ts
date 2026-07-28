// @vitest-environment node
import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const mocked = vi.hoisted(() => {
  let rows: Row[] = [];
  const sql = vi.fn((strings: TemplateStringsArray) => {
    const text = strings.join("?").replace(/\s+/g, " ");
    if (text.includes("retail_runtime_environment")) return [{ identity: process.env.RETAIL_DATABASE_IDENTITY }];
    if (text.includes("FROM claimed c")) return rows;
    if (text.includes("retail_issue_notification_portal_token")) return [{ usable: true }];
    return [];
  });
  return { sql, neon: vi.fn(() => sql), setRows: (next: Row[]) => { rows = next; } };
});

vi.mock("@neondatabase/serverless", () => ({ neon: mocked.neon }));

import { deliverRetailNotifications } from "@/src/lib/retail/notifications";

const row = (locale: "en" | "ar" | "zh", kind = "order_confirmed"): Row => ({
  id: crypto.randomUUID(), kind, recipient: "buyer@example.test", payload: {}, order_id: 42,
  public_id: "a7b7b2a2-fd05-4a84-8420-4639a9b5b03b", client_request_id: crypto.randomUUID(),
  currency: "USD", amount_minor: "1234", carrier: "DHL", tracking_number: "TRACK-1", checkout_locale: locale,
});

describe("localized retail notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://retail-test";
    delete process.env.RETAIL_DATABASE_URL;
    process.env.RETAIL_DATABASE_IDENTITY = "retail-notifications-localized";
    process.env.RETAIL_RESEND_API_KEY = "test-key";
    process.env.RETAIL_EMAIL_FROM = "orders@example.test";
    process.env.RETAIL_PORTAL_TOKEN_SECRET = "notification-token-secret-at-least-32-bytes";
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example.test";
  });

  it.each([
    ["en", "TranquilBeads order", "View your order and delivery updates", "/en/shop/account/"],
    ["ar", "تم تأكيد طلب TranquilBeads", "عرض طلبك وتحديثات التوصيل", "/ar/shop/account/"],
    ["zh", "TranquilBeads 订单", "查看订单和配送更新", "/zh/shop/account/"],
  ] as const)("renders %s confirmation and portal link in the order locale", async (locale, subjectText, linkText, path) => {
    mocked.setRows([row(locale)]);
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(deliverRetailNotifications(fetcher)).resolves.toMatchObject({ sent: 1, failed: 0 });
    const message = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(message.subject).toContain(subjectText);
    expect(message.html).toContain(linkText);
    expect(message.html).toContain(path);
  });

  it("localizes shipment, refund, cancellation, and payment-failure events instead of falling back to confirmation", async () => {
    mocked.setRows([
      { ...row("zh", "order_fulfilled"), payload: { carrier: "SF", tracking: "SF-1" } },
      { ...row("ar", "order_refunded"), payload: { refundedMinor: 500 }, refunded_minor_text: "500" },
      row("zh", "order_cancelled"), row("ar", "payment_failed"),
    ]);
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(deliverRetailNotifications(fetcher)).resolves.toMatchObject({ sent: 4, failed: 0 });
    const messages = fetcher.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    expect(messages.map((message) => message.html).join(" ")).toContain("承运商：SF");
    expect(messages.map((message) => message.html).join(" ")).toContain("المبلغ المسترد حتى الآن");
    expect(messages.map((message) => message.subject).join(" ")).toContain("已取消");
    expect(messages.map((message) => message.html).join(" ")).toContain("تعذر إتمام دفعتك");
  });

  it("fails closed for an unsupported outbox kind", async () => {
    mocked.setRows([row("en", "low_stock")]);
    const fetcher = vi.fn();
    await expect(deliverRetailNotifications(fetcher)).resolves.toMatchObject({ sent: 0, failed: 1 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails only malformed rows in a mixed batch and never sends malformed payloads or amounts", async () => {
    mocked.setRows([
      row("en"),
      { ...row("en"), payload: [] },
      { ...row("en"), amount_minor: "-1" },
      { ...row("en", "order_refunded"), payload: { refundedMinor: "1235" }, refunded_minor_text: "1235" },
      row("zh", "order_cancelled"),
    ]);
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(deliverRetailNotifications(fetcher)).resolves.toMatchObject({ processed: 5, sent: 2, failed: 3 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each(["-1", "1.5", "01", "NaN", "Infinity", "9223372036854775808"])("rejects non-canonical or out-of-range order minor value %s", async (amountMinor) => {
    mocked.setRows([{ ...row("en", "order_cancelled"), amount_minor: amountMinor }]);
    const fetcher = vi.fn();
    await expect(deliverRetailNotifications(fetcher)).resolves.toMatchObject({ processed: 1, sent: 0, failed: 1 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ["negative", -1], ["fractional", 1.5], ["NaN", Number.NaN],
    ["positive infinity", Number.POSITIVE_INFINITY], ["negative infinity", Number.NEGATIVE_INFINITY],
    ["above MAX_SAFE_INTEGER", Number.MAX_SAFE_INTEGER + 1],
  ] as const)("rejects %s numeric order minor", async (_label, amountMinor) => {
    mocked.setRows([{ ...row("en", "order_cancelled"), amount_minor: amountMinor }]);
    const fetcher = vi.fn();
    await expect(deliverRetailNotifications(fetcher)).resolves.toMatchObject({ processed: 1, sent: 0, failed: 1 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["-1", "1.5", "01", "NaN", "Infinity", "9223372036854775808"])("rejects non-canonical or out-of-range refunded minor value %s", async (refundedMinor) => {
    mocked.setRows([{ ...row("en", "order_refunded"), payload: { refundedMinor }, refunded_minor_text: refundedMinor }]);
    const fetcher = vi.fn();
    await expect(deliverRetailNotifications(fetcher)).resolves.toMatchObject({ processed: 1, sent: 0, failed: 1 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("accepts safe integer numbers and canonical Neon BIGINT strings", async () => {
    mocked.setRows([
      { ...row("en", "order_cancelled"), amount_minor: 1234 },
      { ...row("en", "order_refunded"), amount_minor: "1234", payload: { refundedMinor: "500" }, refunded_minor_text: "500" },
    ]);
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(deliverRetailNotifications(fetcher)).resolves.toMatchObject({ processed: 2, sent: 2, failed: 0 });
    const messages = fetcher.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    expect(messages[1]?.html).toContain("USD 5.00");
  });

  it("formats canonical decimal strings above MAX_SAFE_INTEGER without precision loss", async () => {
    mocked.setRows([{ ...row("en"), amount_minor: "9007199254740990" }]);
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(deliverRetailNotifications(fetcher)).resolves.toMatchObject({ sent: 1, failed: 0 });
    const message = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(message.html).toContain("USD 90071992547409.90");
  });

  it("accepts and precisely formats the PostgreSQL BIGINT maximum", async () => {
    mocked.setRows([{
      ...row("en", "order_refunded"), amount_minor: "9223372036854775807",
      payload: { refundedMinor: "9223372036854775807" }, refunded_minor_text: "9223372036854775807",
    }]);
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(deliverRetailNotifications(fetcher)).resolves.toMatchObject({ sent: 1, failed: 0 });
    const message = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(message.html).toContain("USD 92233720368547758.07");
  });

  it("does not claim or deliver when the server-only portal secret is missing or too short", async () => {
    mocked.setRows([row("en")]);
    const fetcher = vi.fn();
    delete process.env.RETAIL_PORTAL_TOKEN_SECRET;
    await expect(deliverRetailNotifications(fetcher)).resolves.toEqual({ processed: 0, sent: 0, failed: 0, configured: false });
    process.env.RETAIL_PORTAL_TOKEN_SECRET = "too-short";
    await expect(deliverRetailNotifications(fetcher)).resolves.toEqual({ processed: 0, sent: 0, failed: 0, configured: false });
    expect(mocked.sql).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps a confirmation portal token stable across a retry for the same outbox row", async () => {
    mocked.setRows([row("en")]);
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await deliverRetailNotifications(fetcher);
    await deliverRetailNotifications(fetcher);
    const links = fetcher.mock.calls.map((call) => String(JSON.parse(String(call[1]?.body)).html).match(/https:\/\/preview\.example\.test\/en\/shop\/account\/([A-Za-z0-9_-]{43})/)?.[1]);
    expect(links).toHaveLength(2);
    expect(links[0]).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(links[1]).toBe(links[0]);
  });
});
