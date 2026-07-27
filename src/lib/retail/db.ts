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
  subtotal_minor?: number;
  shipping_minor?: number;
  tax_minor?: number;
  discount_minor?: number;
  shipping_method?: string | null;
  checkout_email?: string | null;
  checkout_shipping?: unknown;
  status: "pending" | "created" | "approved" | "capturing" | "captured" | "failed" | "refunded" | "reversed" | "denied" | "expired" | "cancelled";
  capture_id: string | null;
  items_snapshot: unknown;
};

function sameQuote(order: RetailOrder, quote: RetailOrderQuote) {
  return order.currency === quote.currency
    && Number(order.amount_minor) === quote.totalMinor
    && JSON.stringify(order.items_snapshot) === JSON.stringify(quote.items);
}

export async function reserveRetailOrder(requestId: string, items: Array<{ sku: string; quantity: number }>) {
  // Legacy callers may still pass a quote, but the database is the sole price
  // and availability authority.  Only SKU/quantity reaches the SQL function.
  const sql = getSql();
  const result = await sql`SELECT o.paypal_order_id,o.client_request_id,o.currency,o.amount_minor,o.status,o.capture_id,o.items_snapshot
    FROM retail_create_checkout(${requestId}::uuid, ${JSON.stringify(items)}::jsonb) c
    JOIN retail_orders o ON o.id=c.order_id`;
  const order = result[0] as RetailOrder | undefined;
  if (!order) throw new Error("checkout_unavailable");
  return order;
}

export async function reserveRetailOrderV2(requestId:string,items:Array<{sku:string;quantity:number}>,checkout:unknown,expectedTotalMinor:number){
  const sql=getSql();
  const result=await sql`SELECT o.paypal_order_id,o.client_request_id,o.currency,o.subtotal_minor,o.shipping_minor,o.tax_minor,o.discount_minor,o.amount_minor,o.shipping_method,o.checkout_email,o.checkout_shipping,o.status,o.capture_id,o.items_snapshot FROM retail_create_checkout_v2(${requestId}::uuid,${JSON.stringify(items)}::jsonb,${JSON.stringify(checkout)}::jsonb,${expectedTotalMinor}) c JOIN retail_orders o ON o.id=c.order_id`;
  const order=result[0] as RetailOrder|undefined;
  if(!order)throw new Error("checkout_unavailable");
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
  const result = await sql`SELECT paypal_order_id, client_request_id, currency, subtotal_minor, shipping_minor, tax_minor, discount_minor, amount_minor, shipping_method, checkout_email, checkout_shipping, status, capture_id, items_snapshot
    FROM retail_orders WHERE client_request_id = ${requestId} LIMIT 1`;
  return result[0] as RetailOrder | undefined;
}

export async function getRetailOrder(paypalOrderId: string) {
  const sql = getSql();
  const result = await sql`SELECT paypal_order_id, client_request_id, currency, subtotal_minor, shipping_minor, tax_minor, discount_minor, amount_minor, shipping_method, checkout_email, checkout_shipping, status, capture_id, items_snapshot
    FROM retail_orders WHERE paypal_order_id = ${paypalOrderId} LIMIT 1`;
  return result[0] as RetailOrder | undefined;
}

export async function claimRetailCapture(paypalOrderId: string) {
  const sql = getSql();
  const result = await sql`UPDATE retail_orders SET status = 'capturing', capturing_started_at = NOW(), updated_at = NOW()
    WHERE paypal_order_id = ${paypalOrderId} AND (status IN ('created', 'approved') OR (status = 'capturing' AND capturing_started_at < NOW() - INTERVAL '5 minutes'))
      AND (SELECT count(*) FROM retail_inventory_reservations r WHERE r.order_id=retail_orders.id AND r.status='active') = jsonb_array_length(retail_orders.items_snapshot)
    RETURNING paypal_order_id, client_request_id, currency, amount_minor, status, capture_id, items_snapshot`;
  return result[0] as RetailOrder | undefined;
}

export async function listRetailCapturesNeedingReconciliation(){const sql=getSql();return sql`SELECT paypal_order_id,client_request_id,currency,amount_minor,status,capturing_started_at FROM retail_orders WHERE status='capturing' AND paypal_order_id IS NOT NULL AND capturing_started_at<now()-interval '2 minutes' ORDER BY capturing_started_at LIMIT 25` as unknown as Array<{paypal_order_id:string;client_request_id:string;currency:string;amount_minor:number;status:string;capturing_started_at:string}>;}

export async function markRetailOrderCaptured(paypalOrderId: string, captureId: string, customer: unknown = {}, shipping: unknown = {}, feeMinor: number | null = null, netMinor: number | null = null) {
  const sql = getSql();
  const result = await sql`SELECT retail_apply_paypal_capture(${paypalOrderId}, ${captureId}, ${JSON.stringify(customer)}::jsonb, ${JSON.stringify(shipping)}::jsonb, ${feeMinor}, ${netMinor}) AS applied`;
  return result[0]?.applied === true;
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
  customer: unknown = {}, shipping: unknown = {}, feeMinor: number | null = null, netMinor: number | null = null,
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
  // Neon submits this non-interactive batch as one transaction. Keeping the
  // insert separate avoids modifying an event row twice in one CTE, which
  // PostgreSQL may silently skip under MVCC. A pre-existing `received` row is
  // deliberately eligible again so interrupted deliveries can recover.
  const [, processedRows, rejectedRows, finalRows] = await sql.transaction((tx) => [
    tx`INSERT INTO retail_webhook_events (paypal_event_id, event_type, raw_payload, payload, status)
      VALUES (${eventId}::text, ${eventType}::text, ${rawPayload}::text, ${JSON.stringify(payload)}::jsonb, 'received')
      ON CONFLICT (paypal_event_id) DO NOTHING`,
    tx`WITH capture_update AS (
      SELECT retail_apply_paypal_capture(${orderId}::text, ${captureId}::text, ${JSON.stringify(customer)}::jsonb, ${JSON.stringify(shipping)}::jsonb, ${feeMinor}::bigint, ${netMinor}::bigint) AS applied
      WHERE ${eventType}::text = 'PAYMENT.CAPTURE.COMPLETED'
        AND EXISTS (SELECT 1 FROM retail_webhook_events WHERE paypal_event_id=${eventId}::text AND status='received')
        AND ${orderId}::text IS NOT NULL AND ${captureId}::text IS NOT NULL AND ${currency}::text = 'USD'
        AND ${amountMinor}::bigint IS NOT NULL
        AND EXISTS(SELECT 1 FROM retail_orders WHERE paypal_order_id=${orderId}::text AND currency=${currency}::text AND amount_minor=${amountMinor}::bigint)
    ), approval_update AS (
      UPDATE retail_orders SET status = CASE WHEN status = 'created' THEN 'approved' ELSE status END, updated_at = NOW()
      WHERE ${eventType}::text = 'CHECKOUT.ORDER.APPROVED'
        AND EXISTS (SELECT 1 FROM retail_webhook_events WHERE paypal_event_id=${eventId}::text AND status='received')
        AND ${orderId}::text IS NOT NULL AND paypal_order_id = ${orderId}::text AND status IN ('created', 'approved', 'capturing', 'captured')
      RETURNING paypal_order_id
    ), refund_result AS (
      SELECT * FROM retail_apply_paypal_refund(
        ${eventType}::text = 'PAYMENT.CAPTURE.REFUNDED' AND EXISTS (SELECT 1 FROM retail_webhook_events WHERE paypal_event_id=${eventId}::text AND status='received'),
        ${captureId}::text, ${relatedCaptureId}::text, ${currency}::text, ${amountMinor}::bigint
      )
    ), reverse_update AS (
      SELECT retail_apply_paypal_reversal(${relatedCaptureId}::text, ${eventId}::text, ${currency}::text, ${amountMinor}::bigint) AS applied
      WHERE ${eventType}::text = 'PAYMENT.CAPTURE.REVERSED'
        AND EXISTS (SELECT 1 FROM retail_webhook_events WHERE paypal_event_id=${eventId}::text AND status='received')
        AND ${relatedCaptureId}::text IS NOT NULL
    ), denied_release AS (
      SELECT retail_release_order_reservations(${orderId}::text, 'payment_denied') AS released
      WHERE ${eventType}::text = 'PAYMENT.CAPTURE.DENIED'
        AND EXISTS (SELECT 1 FROM retail_webhook_events WHERE paypal_event_id=${eventId}::text AND status='received')
        AND ${orderId}::text IS NOT NULL
    ), denied_update AS (
      UPDATE retail_orders SET status = 'denied', capturing_started_at = NULL, updated_at = NOW()
      WHERE ${eventType}::text = 'PAYMENT.CAPTURE.DENIED'
        AND EXISTS (SELECT 1 FROM retail_webhook_events WHERE paypal_event_id=${eventId}::text AND status='received')
        AND ${orderId}::text IS NOT NULL
        AND paypal_order_id = ${orderId}::text AND currency = ${currency}::text AND amount_minor = ${amountMinor}::bigint
        AND status IN ('created', 'approved', 'capturing', 'denied')
        AND EXISTS(SELECT 1 FROM denied_release WHERE released)
      RETURNING paypal_order_id
    )
    UPDATE retail_webhook_events SET status = CASE WHEN ${eventType}::text IN ('PAYMENT.CAPTURE.COMPLETED', 'CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED', 'PAYMENT.CAPTURE.DENIED') THEN 'processed' ELSE 'ignored' END, processed_at = NOW()
    WHERE paypal_event_id=${eventId}::text AND status = 'received'
      AND (${eventType}::text NOT IN ('PAYMENT.CAPTURE.COMPLETED', 'CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED', 'PAYMENT.CAPTURE.DENIED') OR EXISTS (SELECT 1 FROM capture_update WHERE applied) OR EXISTS (SELECT 1 FROM approval_update) OR EXISTS (SELECT 1 FROM refund_result) OR EXISTS (SELECT 1 FROM reverse_update WHERE applied) OR EXISTS (SELECT 1 FROM denied_update))
      RETURNING status`,
    tx`UPDATE retail_webhook_events SET status = 'rejected', reason = 'business_validation_failed', processed_at = NOW()
      WHERE paypal_event_id=${eventId}::text AND status = 'received'
      RETURNING status`,
    tx`SELECT status FROM retail_webhook_events WHERE paypal_event_id=${eventId}::text`,
  ]);
  if (processedRows[0]) return "processed";
  if (rejectedRows[0]) return "duplicate";
  return classifyWebhookRow(finalRows[0]?.status);
}

export async function auditRetailEvent(orderId: string | null, action: string, detail: unknown) {
  const sql = getSql();
  await sql`INSERT INTO retail_order_audit (paypal_order_id, action, detail) VALUES (${orderId}, ${action}, ${JSON.stringify(detail)}::jsonb)`;
}
