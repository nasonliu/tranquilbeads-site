import { neon } from "@neondatabase/serverless";

import type { RetailOrderQuote } from "./catalog";
import { classifyWebhookRow } from "./webhook-result";
import { parsePaypalMinorAmount } from "./paypal";

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("retail_database_unavailable");
  return neon(connectionString);
}

export type RetailOrder = {
  paypal_order_id: string | null;
  client_request_id: string;
  currency: string;
  amount_minor: number;
  status: "pending" | "created" | "approved" | "capturing" | "captured" | "failed" | "refunded" | "reversed" | "denied";
  capture_id: string | null;
  items_snapshot: unknown;
};

function sameQuote(order: RetailOrder, quote: RetailOrderQuote) {
  return order.currency === quote.currency
    && Number(order.amount_minor) === quote.totalMinor
    && JSON.stringify(order.items_snapshot) === JSON.stringify(quote.items);
}

export async function reserveRetailOrder(requestId: string, quote: RetailOrderQuote) {
  const sql = getSql();
  await sql`INSERT INTO retail_orders (client_request_id, currency, amount_minor, status, items_snapshot)
    VALUES (${requestId}, ${quote.currency}, ${quote.totalMinor}, 'pending', ${JSON.stringify(quote.items)}::jsonb)
    ON CONFLICT (client_request_id) DO NOTHING`;
  const result = await sql`SELECT paypal_order_id, client_request_id, currency, amount_minor, status, capture_id, items_snapshot
    FROM retail_orders WHERE client_request_id = ${requestId} LIMIT 1`;
  const order = result[0] as RetailOrder | undefined;
  if (!order || !sameQuote(order, quote)) throw new Error("idempotency_conflict");
  return order;
}

export async function attachPaypalOrder(requestId: string, paypalOrderId: string) {
  const sql = getSql();
  const result = await sql`UPDATE retail_orders SET paypal_order_id = ${paypalOrderId}, status = 'created', updated_at = NOW()
    WHERE client_request_id = ${requestId} AND paypal_order_id IS NULL AND status = 'pending'
    RETURNING paypal_order_id`;
  return result.length === 1;
}

export async function getRetailOrderByRequestId(requestId: string) {
  const sql = getSql();
  const result = await sql`SELECT paypal_order_id, client_request_id, currency, amount_minor, status, capture_id, items_snapshot
    FROM retail_orders WHERE client_request_id = ${requestId} LIMIT 1`;
  return result[0] as RetailOrder | undefined;
}

export async function getRetailOrder(paypalOrderId: string) {
  const sql = getSql();
  const result = await sql`SELECT paypal_order_id, client_request_id, currency, amount_minor, status, capture_id, items_snapshot
    FROM retail_orders WHERE paypal_order_id = ${paypalOrderId} LIMIT 1`;
  return result[0] as RetailOrder | undefined;
}

export async function claimRetailCapture(paypalOrderId: string) {
  const sql = getSql();
  const result = await sql`UPDATE retail_orders SET status = 'capturing', capturing_started_at = NOW(), updated_at = NOW()
    WHERE paypal_order_id = ${paypalOrderId} AND (status IN ('created', 'approved') OR (status = 'capturing' AND capturing_started_at < NOW() - INTERVAL '5 minutes'))
    RETURNING paypal_order_id, client_request_id, currency, amount_minor, status, capture_id, items_snapshot`;
  return result[0] as RetailOrder | undefined;
}

export async function markRetailOrderCaptured(paypalOrderId: string, captureId: string) {
  const sql = getSql();
  const result = await sql`UPDATE retail_orders SET status = CASE WHEN status = 'capturing' THEN 'captured' ELSE status END,
    capture_id = CASE WHEN status = 'capturing' THEN ${captureId} ELSE capture_id END,
    captured_at = CASE WHEN status = 'capturing' THEN NOW() ELSE captured_at END,
    capturing_started_at = CASE WHEN status = 'capturing' THEN NULL ELSE capturing_started_at END,
    updated_at = CASE WHEN status = 'capturing' THEN NOW() ELSE updated_at END
    WHERE paypal_order_id = ${paypalOrderId} AND (status = 'capturing' OR (status = 'captured' AND capture_id = ${captureId}))
    RETURNING paypal_order_id`;
  return result.length === 1;
}

export async function restoreRetailOrderAfterCaptureFailure(paypalOrderId: string) {
  const sql = getSql();
  await sql`UPDATE retail_orders SET status = 'created', capturing_started_at = NULL, updated_at = NOW()
    WHERE paypal_order_id = ${paypalOrderId} AND status = 'capturing'`;
}

export type WebhookProcessResult = "processed" | "duplicate" | "retry";

export async function processVerifiedWebhook(
  eventId: string,
  eventType: string,
  rawPayload: string,
  payload: { resource?: { supplementary_data?: { related_ids?: { order_id?: string; capture_id?: string } }; id?: string; amount?: { currency_code?: string; value?: string } } },
): Promise<WebhookProcessResult> {
  const sql = getSql();
  const relatedIds = payload.resource?.supplementary_data?.related_ids;
  const resourceId = payload.resource?.id ?? null;
  const orderId = relatedIds?.order_id
    ?? (eventType === "CHECKOUT.ORDER.APPROVED" ? resourceId : null);
  const captureId = resourceId;
  const relatedCaptureId = relatedIds?.capture_id
    ?? (eventType === "PAYMENT.CAPTURE.REFUNDED" ? null : resourceId);
  const currency = payload.resource?.amount?.currency_code ?? null;
  const amountMinor = parsePaypalMinorAmount(payload.resource?.amount?.value);
  // A single CTE keeps event recording and order-state changes atomic. A transient
  // database failure commits neither, so PayPal may safely retry the delivery.
  const result = await sql`WITH event_row AS (
      INSERT INTO retail_webhook_events (paypal_event_id, event_type, raw_payload, payload, status)
      VALUES (${eventId}, ${eventType}, ${rawPayload}, ${JSON.stringify(payload)}::jsonb, 'received')
      ON CONFLICT (paypal_event_id) DO UPDATE SET status = retail_webhook_events.status
      RETURNING id, status
    ), capture_update AS (
      UPDATE retail_orders SET status = 'captured', capture_id = COALESCE(capture_id, ${captureId}), captured_at = COALESCE(captured_at, NOW()), updated_at = NOW()
      WHERE ${eventType} = 'PAYMENT.CAPTURE.COMPLETED' AND (SELECT status FROM event_row) = 'received'
        AND ${orderId} IS NOT NULL AND ${captureId} IS NOT NULL AND ${currency} = 'USD'
        AND ${amountMinor} IS NOT NULL AND paypal_order_id = ${orderId}
        AND (status IN ('created', 'approved', 'capturing') OR (status = 'captured' AND capture_id = ${captureId}))
        AND currency = ${currency} AND amount_minor = ${amountMinor}
      RETURNING paypal_order_id
    ), approval_update AS (
      UPDATE retail_orders SET status = CASE WHEN status = 'created' THEN 'approved' ELSE status END, updated_at = NOW()
      WHERE ${eventType} = 'CHECKOUT.ORDER.APPROVED' AND (SELECT status FROM event_row) = 'received'
        AND ${orderId} IS NOT NULL AND paypal_order_id = ${orderId} AND status IN ('created', 'approved', 'capturing', 'captured')
      RETURNING paypal_order_id
    ), refund_result AS (
      SELECT * FROM retail_apply_paypal_refund(
        ${eventType} = 'PAYMENT.CAPTURE.REFUNDED' AND (SELECT status FROM event_row) = 'received',
        ${captureId}, ${relatedCaptureId}, ${currency}, ${amountMinor}
      )
    ), reverse_update AS (
      UPDATE retail_orders SET status = 'reversed', updated_at = NOW()
      WHERE ${eventType} = 'PAYMENT.CAPTURE.REVERSED' AND ${relatedCaptureId} IS NOT NULL
        AND capture_id = ${relatedCaptureId} AND currency = ${currency} AND amount_minor = ${amountMinor}
        AND status IN ('captured', 'refunded', 'reversed')
      RETURNING paypal_order_id
    ), denied_update AS (
      UPDATE retail_orders SET status = 'denied', capturing_started_at = NULL, updated_at = NOW()
      WHERE ${eventType} = 'PAYMENT.CAPTURE.DENIED' AND ${orderId} IS NOT NULL
        AND paypal_order_id = ${orderId} AND currency = ${currency} AND amount_minor = ${amountMinor}
        AND status IN ('created', 'approved', 'capturing', 'denied')
      RETURNING paypal_order_id
    ), processed_event AS (
      UPDATE retail_webhook_events SET status = CASE WHEN ${eventType} IN ('PAYMENT.CAPTURE.COMPLETED', 'CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED', 'PAYMENT.CAPTURE.DENIED') THEN 'processed' ELSE 'ignored' END, processed_at = NOW()
    WHERE id IN (SELECT id FROM event_row)
      AND (SELECT status FROM event_row) = 'received'
      AND (${eventType} NOT IN ('PAYMENT.CAPTURE.COMPLETED', 'CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED', 'PAYMENT.CAPTURE.DENIED') OR EXISTS (SELECT 1 FROM capture_update) OR EXISTS (SELECT 1 FROM approval_update) OR EXISTS (SELECT 1 FROM refund_result) OR EXISTS (SELECT 1 FROM reverse_update) OR EXISTS (SELECT 1 FROM denied_update))
      RETURNING 'ready' AS status
    ), rejected_event AS (
      UPDATE retail_webhook_events SET status = 'rejected', reason = 'business_validation_failed', processed_at = NOW()
      WHERE id IN (SELECT id FROM event_row) AND (SELECT status FROM event_row) = 'received' AND NOT EXISTS (SELECT 1 FROM processed_event)
      RETURNING 'rejected' AS status
    )
    SELECT COALESCE((SELECT status FROM processed_event), (SELECT status FROM rejected_event), (SELECT status FROM event_row)) AS status` as { status?: string }[];
  return classifyWebhookRow(result[0]?.status);
}

export async function auditRetailEvent(orderId: string | null, action: string, detail: unknown) {
  const sql = getSql();
  await sql`INSERT INTO retail_order_audit (paypal_order_id, action, detail) VALUES (${orderId}, ${action}, ${JSON.stringify(detail)}::jsonb)`;
}
