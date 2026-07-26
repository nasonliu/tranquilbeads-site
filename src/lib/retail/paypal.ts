import { formatMinorAmount, type RetailOrderQuote } from "./catalog";

type Fetcher = typeof fetch;
type PaypalContext = { clientId: string; clientSecret: string; baseUrl: string; fetcher?: Fetcher };
type WebhookContext = { webhookId: string; accessToken: string; baseUrl: string; fetcher?: Fetcher };

export function parsePaypalMinorAmount(value: string | undefined) {
  if (!value || !/^\d+\.\d{2}$/.test(value)) return null;
  const [whole, fraction] = value.split(".");
  const minor = Number(whole) * 100 + Number(fraction);
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export async function getPaypalAccessToken({ clientId, clientSecret, baseUrl, fetcher = fetch }: PaypalContext) {
  const response = await fetcher(`${baseUrl}/v1/oauth2/token`, { method: "POST", headers: { authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", cache: "no-store" });
  if (!response.ok) throw new Error("paypal_oauth_failed");
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("paypal_oauth_failed");
  return body.access_token;
}

export async function createPaypalOrder(quote: RetailOrderQuote, token: string, baseUrl: string, requestId: string, fetcher: Fetcher = fetch) {
  const response = await fetcher(`${baseUrl}/v2/checkout/orders`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "paypal-request-id": requestId, prefer: "return=representation" }, body: JSON.stringify({ intent: "CAPTURE", purchase_units: [{ amount: { currency_code: quote.currency, value: formatMinorAmount(quote.totalMinor) } }] }), cache: "no-store" });
  if (!response.ok) throw new Error("paypal_order_failed");
  const body = await response.json() as { id?: string; status?: string; purchase_units?: Array<{ amount?: { currency_code?: string; value?: string } }> };
  const amount = body.purchase_units?.[0]?.amount;
  if (!body.id || body.status !== "CREATED" || amount?.currency_code !== quote.currency || amount.value !== formatMinorAmount(quote.totalMinor)) throw new Error("paypal_order_failed");
  return body.id;
}

export async function capturePaypalOrder(orderId: string, quote: RetailOrderQuote, token: string, baseUrl: string, requestId: string, fetcher: Fetcher = fetch) {
  const response = await fetcher(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "paypal-request-id": requestId }, cache: "no-store" });
  if (!response.ok) throw new Error("paypal_capture_failed");
  const body = await response.json() as { status?: string; purchase_units?: Array<{ payments?: { captures?: Array<{ id?: string; status?: string; amount?: { currency_code?: string; value?: string } }> } }> };
  const capture = body.purchase_units?.[0]?.payments?.captures?.[0];
  if (body.status !== "COMPLETED" || capture?.status !== "COMPLETED" || !capture.id || capture.amount?.currency_code !== quote.currency || capture.amount.value !== formatMinorAmount(quote.totalMinor)) throw new Error("paypal_capture_invalid");
  return capture.id;
}

export async function verifyPaypalWebhook(headers: Headers, event: unknown, { webhookId, accessToken, baseUrl, fetcher = fetch }: WebhookContext) {
  const required = ["paypal-auth-algo", "paypal-cert-url", "paypal-transmission-id", "paypal-transmission-sig", "paypal-transmission-time"] as const;
  if (required.some((name) => !headers.get(name))) return false;
  const response = await fetcher(`${baseUrl}/v1/notifications/verify-webhook-signature`, { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ auth_algo: headers.get("paypal-auth-algo"), cert_url: headers.get("paypal-cert-url"), transmission_id: headers.get("paypal-transmission-id"), transmission_sig: headers.get("paypal-transmission-sig"), transmission_time: headers.get("paypal-transmission-time"), webhook_id: webhookId, webhook_event: event }), cache: "no-store" });
  if (!response.ok) return false;
  return (await response.json() as { verification_status?: string }).verification_status === "SUCCESS";
}
