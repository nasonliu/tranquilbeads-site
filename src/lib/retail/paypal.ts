import { formatMinorAmount, type RetailOrderQuote } from "./catalog";

type Fetcher = typeof fetch;
type PaypalContext = { clientId: string; clientSecret: string; baseUrl: string; fetcher?: Fetcher };
type WebhookContext = { webhookId: string; accessToken: string; baseUrl: string; fetcher?: Fetcher };

export class PaypalRefundRejectedError extends Error {
  constructor() { super("paypal_refund_rejected"); this.name = "PaypalRefundRejectedError"; }
}

function assertPaypalRequestId(requestId: string) {
  // PayPal documents a 38 single-byte character ceiling for this header.
  // Validate locally so a future caller cannot silently break checkout by
  // decorating an otherwise valid UUID.
  if (!/^[\x20-\x7e]{1,38}$/.test(requestId)) throw new Error("paypal_request_id_invalid");
}

async function throwPaypalApiError(response: Response, fallback: string): Promise<never> {
  let name = "UNKNOWN";
  let issues: string[] = [];
  try {
    const body = await response.json() as { name?: unknown; details?: Array<{ issue?: unknown }> };
    if (typeof body.name === "string" && /^[A-Z0-9_]{1,64}$/.test(body.name)) name = body.name;
    issues = (body.details ?? []).flatMap((detail) =>
      typeof detail.issue === "string" && /^[A-Z0-9_]{1,64}$/.test(detail.issue) ? [detail.issue] : [],
    ).slice(0, 4);
  } catch { /* PayPal can return an empty or non-JSON gateway response. */ }
  throw new Error(`${fallback}:${response.status}:${name}:${issues.join(",") || "UNKNOWN"}`);
}

export function parsePaypalMinorAmount(value: string | undefined) {
  if (!value || !/^\d+\.\d{2}$/.test(value)) return null;
  const [whole, fraction] = value.split(".");
  const minor = Number(whole) * 100 + Number(fraction);
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

function parsePaypalNonNegativeMinorAmount(value: string | undefined) {
  if (!value || !/^\d+\.\d{2}$/.test(value)) return null;
  const [whole, fraction] = value.split(".");
  const minor = Number(whole) * 100 + Number(fraction);
  return Number.isSafeInteger(minor) && minor >= 0 ? minor : null;
}

export type PaypalCaptureBreakdown = { grossMinor: number; feeMinor: number; netMinor: number };
export function parsePaypalCaptureBreakdown(value: unknown): PaypalCaptureBreakdown | null {
  if (!value || typeof value !== "object") return null;
  const breakdown = value as { gross_amount?: { currency_code?: string; value?: string }; paypal_fee?: { currency_code?: string; value?: string }; net_amount?: { currency_code?: string; value?: string } };
  const gross = parsePaypalMinorAmount(breakdown.gross_amount?.value);
  const fee = parsePaypalNonNegativeMinorAmount(breakdown.paypal_fee?.value);
  const net = parsePaypalNonNegativeMinorAmount(breakdown.net_amount?.value);
  if (gross === null || fee === null || net === null || breakdown.gross_amount?.currency_code !== "USD" || breakdown.paypal_fee?.currency_code !== "USD" || breakdown.net_amount?.currency_code !== "USD" || gross - fee !== net) return null;
  return { grossMinor: gross, feeMinor: fee, netMinor: net };
}

export async function getPaypalAccessToken({ clientId, clientSecret, baseUrl, fetcher = fetch }: PaypalContext) {
  const response = await fetcher(`${baseUrl}/v1/oauth2/token`, { method: "POST", headers: { authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", cache: "no-store" });
  if (!response.ok) throw new Error("paypal_oauth_failed");
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("paypal_oauth_failed");
  return body.access_token;
}

export async function createPaypalOrder(quote: RetailOrderQuote, token: string, baseUrl: string, requestId: string, fetcher: Fetcher = fetch) {
  assertPaypalRequestId(requestId);
  const hasBreakdown = [quote.subtotalMinor, quote.shippingMinor, quote.taxMinor, quote.discountMinor].every((value) => Number.isSafeInteger(value));
  const amount = hasBreakdown ? {
    currency_code: quote.currency,
    value: formatMinorAmount(quote.totalMinor),
    breakdown: {
      item_total: { currency_code: quote.currency, value: formatMinorAmount(quote.subtotalMinor!) },
      shipping: { currency_code: quote.currency, value: formatMinorAmount(quote.shippingMinor!) },
      tax_total: { currency_code: quote.currency, value: formatMinorAmount(quote.taxMinor!) },
      discount: { currency_code: quote.currency, value: formatMinorAmount(quote.discountMinor!) },
    },
  } : { currency_code: quote.currency, value: formatMinorAmount(quote.totalMinor) };
  const purchaseUnit: Record<string, unknown> = { amount };
  if (hasBreakdown) purchaseUnit.items = quote.items.map((line) => ({ name: line.sku, sku: line.sku, quantity: String(line.quantity), unit_amount: { currency_code: quote.currency, value: formatMinorAmount(line.unitAmountMinor) } }));
  if (quote.shipping) purchaseUnit.shipping = { name: { full_name: quote.shipping.recipient }, address: { address_line_1: quote.shipping.line1, address_line_2: quote.shipping.line2 || undefined, admin_area_2: quote.shipping.city, admin_area_1: quote.shipping.region || undefined, postal_code: quote.shipping.postalCode || undefined, country_code: quote.shipping.country } };
  const response = await fetcher(`${baseUrl}/v2/checkout/orders`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "paypal-request-id": requestId, prefer: "return=representation" }, body: JSON.stringify({ intent: "CAPTURE", purchase_units: [purchaseUnit], application_context: quote.shipping ? { shipping_preference: "SET_PROVIDED_ADDRESS", user_action: "PAY_NOW" } : undefined }), cache: "no-store" });
  if (!response.ok) await throwPaypalApiError(response, "paypal_order_failed");
  const body = await response.json() as { id?: string; status?: string; purchase_units?: Array<{ amount?: { currency_code?: string; value?: string } }> };
  const responseAmount = body.purchase_units?.[0]?.amount;
  if (!body.id || body.status !== "CREATED" || responseAmount?.currency_code !== quote.currency || responseAmount.value !== formatMinorAmount(quote.totalMinor)) throw new Error("paypal_order_failed");
  return body.id;
}

export async function refundPaypalCapture(captureId: string, amountMinor: number, currency: string, reason: string, token: string, baseUrl: string, requestId: string, fetcher: Fetcher = fetch) {
  assertPaypalRequestId(requestId);
  const response = await fetcher(`${baseUrl}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "paypal-request-id": requestId, prefer: "return=representation" }, body: JSON.stringify({ amount: { currency_code: currency, value: formatMinorAmount(amountMinor) }, note_to_payer: reason.slice(0, 255) }), cache: "no-store" });
  if (!response.ok) {
    // Only a permanent client rejection proves PayPal did not accept the
    // refund. Timeouts, rate limits, conflicts, and 5xx responses are unknown
    // outcomes and must retain the local pending/idempotency guard.
    if (response.status >= 400 && response.status < 500 && ![408, 409, 425, 429].includes(response.status)) throw new PaypalRefundRejectedError();
    throw new Error("paypal_refund_unknown");
  }
  const body = await response.json() as { id?: string; status?: string; amount?: { currency_code?: string; value?: string } };
  if (!body.id || body.status !== "COMPLETED" || body.amount?.currency_code !== currency || body.amount.value !== formatMinorAmount(amountMinor)) throw new Error("paypal_refund_invalid");
  return body.id;
}

export async function capturePaypalOrder(orderId: string, quote: RetailOrderQuote, token: string, baseUrl: string, requestId: string, fetcher: Fetcher = fetch) {
  assertPaypalRequestId(requestId);
  const response = await fetcher(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "paypal-request-id": requestId }, cache: "no-store" });
  if (!response.ok) throw new Error("paypal_capture_failed");
  const body = await response.json() as { status?: string; purchase_units?: Array<{ payments?: { captures?: Array<{ id?: string; status?: string; amount?: { currency_code?: string; value?: string } }> } }> };
  const capture = body.purchase_units?.[0]?.payments?.captures?.[0];
  if (body.status !== "COMPLETED" || capture?.status !== "COMPLETED" || !capture.id || capture.amount?.currency_code !== quote.currency || capture.amount.value !== formatMinorAmount(quote.totalMinor)) throw new Error("paypal_capture_invalid");
  return capture.id;
}

export async function getPaypalOrderDetails(orderId: string, token: string, baseUrl: string, fetcher: Fetcher = fetch) {
  const response = await fetcher(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error("paypal_order_details_failed");
  const body = await response.json() as { payer?: { email_address?: string; name?: { given_name?: string; surname?: string } }; purchase_units?: Array<{ shipping?: { name?: { full_name?: string }; address?: { address_line_1?: string; address_line_2?: string; admin_area_1?: string; admin_area_2?: string; postal_code?: string; country_code?: string } }; payments?: { captures?: Array<{ seller_receivable_breakdown?: unknown }> } }> };
  const payer = body.payer;
  const shipping = body.purchase_units?.[0]?.shipping;
  return {
    customer: { email: payer?.email_address ?? "", name: [payer?.name?.given_name, payer?.name?.surname].filter(Boolean).join(" ") },
    shipping: { recipient: shipping?.name?.full_name ?? "", line1: shipping?.address?.address_line_1 ?? "", line2: shipping?.address?.address_line_2 ?? "", region: shipping?.address?.admin_area_1 ?? "", city: shipping?.address?.admin_area_2 ?? "", postalCode: shipping?.address?.postal_code ?? "", country: shipping?.address?.country_code ?? "" },
    breakdown: parsePaypalCaptureBreakdown(body.purchase_units?.[0]?.payments?.captures?.[0]?.seller_receivable_breakdown),
  };
}

export async function getPaypalOrderState(orderId: string, token: string, baseUrl: string, fetcher: Fetcher = fetch) {
  const response = await fetcher(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error("paypal_order_state_failed");
  const body = await response.json() as { status?: string; purchase_units?: Array<{ payments?: { captures?: Array<{ id?: string; status?: string; amount?: { currency_code?: string; value?: string } }> } }> };
  const capture = body.purchase_units?.[0]?.payments?.captures?.find((entry) => entry.status === "COMPLETED");
  return { status: body.status ?? "UNKNOWN", captureId: capture?.id ?? null, captureCurrency: capture?.amount?.currency_code ?? null, captureAmountMinor: parsePaypalMinorAmount(capture?.amount?.value) };
}

export async function verifyPaypalWebhook(headers: Headers, event: unknown, { webhookId, accessToken, baseUrl, fetcher = fetch }: WebhookContext) {
  const required = ["paypal-auth-algo", "paypal-cert-url", "paypal-transmission-id", "paypal-transmission-sig", "paypal-transmission-time"] as const;
  if (required.some((name) => !headers.get(name))) return false;
  const response = await fetcher(`${baseUrl}/v1/notifications/verify-webhook-signature`, { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ auth_algo: headers.get("paypal-auth-algo"), cert_url: headers.get("paypal-cert-url"), transmission_id: headers.get("paypal-transmission-id"), transmission_sig: headers.get("paypal-transmission-sig"), transmission_time: headers.get("paypal-transmission-time"), webhook_id: webhookId, webhook_event: event }), cache: "no-store" });
  if (!response.ok) return false;
  return (await response.json() as { verification_status?: string }).verification_status === "SUCCESS";
}
