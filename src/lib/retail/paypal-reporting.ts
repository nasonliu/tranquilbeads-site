import "server-only";

import { z } from "zod";

import type { RetailAdminActor } from "./admin-auth";
import { getRetailServerConfig } from "./config";
import { getPaypalAccessToken } from "./paypal";
import { importPayPalSettlement } from "./settlements";

type Fetcher = typeof fetch;
type PaypalMoney = { currency_code?: string; value?: string };
type PaypalTransactionInfo = {
  transaction_id?: string;
  transaction_event_code?: string;
  transaction_status?: string;
  transaction_amount?: PaypalMoney;
  fee_amount?: PaypalMoney;
  net_amount?: PaypalMoney;
  paypal_reference_id?: string;
  transaction_updated_date?: string;
  transaction_initiation_date?: string;
};

export const paypalSettlementSyncDto = z.object({
  days: z.number().int().min(1).max(31).default(7),
  idempotencyKey: z.string().uuid(),
}).strict();

function normalizedRow(info: PaypalTransactionInfo) {
  const currency = info.transaction_amount?.currency_code;
  const currencies = [currency, info.fee_amount?.currency_code, info.net_amount?.currency_code].filter(Boolean);
  if (!info.transaction_id || !info.transaction_event_code || !info.transaction_status || currency !== "USD" || currencies.some((value) => value !== "USD") || !info.transaction_amount?.value) return null;
  return {
    transactionId: info.transaction_id,
    transactionType: info.transaction_event_code,
    transactionStatus: info.transaction_status,
    currency,
    gross: info.transaction_amount.value,
    fee: info.fee_amount?.value ?? null,
    net: info.net_amount?.value ?? null,
    relatedCaptureId: info.paypal_reference_id ?? null,
    occurredAt: info.transaction_updated_date ?? info.transaction_initiation_date ?? null,
  };
}

export async function fetchPaypalSettlementRows(input: { days: number }, fetcher: Fetcher = fetch, now = new Date()) {
  const config = getRetailServerConfig();
  if (!config.enabled) throw new Error("paypal_reporting_unavailable");
  const token = await getPaypalAccessToken({ clientId: config.paypalClientId, clientSecret: config.paypalClientSecret, baseUrl: config.paypalBaseUrl, fetcher });
  const end = new Date(now);
  const start = new Date(now.getTime() - input.days * 24 * 60 * 60 * 1000);
  const rows: Array<ReturnType<typeof normalizedRow>> = [];
  let skipped = 0;
  let page = 1;
  let totalPages = 1;
  do {
    const query = new URLSearchParams({ start_date: start.toISOString(), end_date: end.toISOString(), fields: "transaction_info", page_size: "500", page: String(page) });
    const response = await fetcher(`${config.paypalBaseUrl}/v1/reporting/transactions?${query}`, { headers: { authorization: `Bearer ${token}`, "PayPal-Enforce-ISO8601-Format": "true" }, cache: "no-store" });
    if (!response.ok) throw new Error(response.status === 403 ? "paypal_reporting_permission_required" : "paypal_reporting_failed");
    const body = await response.json() as { transaction_details?: Array<{ transaction_info?: PaypalTransactionInfo }>; total_pages?: number };
    for (const detail of body.transaction_details ?? []) {
      const row = normalizedRow(detail.transaction_info ?? {});
      if (row) rows.push(row); else skipped += 1;
    }
    totalPages = Math.min(Math.max(Number(body.total_pages ?? 1), 1), 20);
    page += 1;
  } while (page <= totalPages);
  return { rows: rows.filter((row): row is NonNullable<typeof row> => Boolean(row)), skipped, start: start.toISOString(), end: end.toISOString() };
}

export async function syncPaypalSettlements(input: z.infer<typeof paypalSettlementSyncDto>, actor: RetailAdminActor, fetcher: Fetcher = fetch, now = new Date()) {
  const report = await fetchPaypalSettlementRows(input, fetcher, now);
  if (!report.rows.length) return { imported: null, rowCount: 0, skipped: report.skipped, start: report.start, end: report.end };
  const result = await importPayPalSettlement({
    filename: `paypal-api-${report.start.slice(0, 10)}-${report.end.slice(0, 10)}.json`,
    format: "json",
    content: JSON.stringify(report.rows),
    idempotencyKey: input.idempotencyKey,
  }, actor);
  return { imported: result, rowCount: report.rows.length, skipped: report.skipped, start: report.start, end: report.end };
}
