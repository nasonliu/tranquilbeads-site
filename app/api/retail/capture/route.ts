import { z } from "zod";

import { getRetailPaymentGate } from "@/src/lib/retail/gate";
import { capturePaypalOrder, getPaypalAccessToken, getPaypalOrderDetails } from "@/src/lib/retail/paypal";

export const runtime = "nodejs";
const schema = z.object({ orderId: z.string().min(1).max(128) }).strict();
type PaypalOrderDetails = Awaited<ReturnType<typeof getPaypalOrderDetails>>;
const emptyPaypalOrderDetails: PaypalOrderDetails = { customer: { email: "", name: "" }, shipping: { recipient: "", line1: "", line2: "", region: "", city: "", postalCode: "", country: "" }, breakdown: null };

export async function POST(request: Request) {
  const gate = getRetailPaymentGate();
  if (!gate.enabled) return Response.json({ ok: false, error: "retail_unavailable" }, { status: 503 });
  let input: z.infer<typeof schema>;
  try { input = schema.parse(await request.json()); } catch { return Response.json({ ok: false, error: "invalid_request" }, { status: 400 }); }
  const { config } = gate;
  try {
    const { auditRetailEvent, claimRetailCapture, getRetailOrder, markRetailOrderCaptured, restoreRetailOrderAfterCaptureFailure } = await import("@/src/lib/retail/db");
    const current = await getRetailOrder(input.orderId);
    if (!current) return Response.json({ ok: false, error: "order_not_found" }, { status: 404 });
    if (current.status === "expired") return Response.json({ ok: false, error: "checkout_expired" }, { status: 410 });
    if (current.status === "captured") return Response.json({ ok: true, orderId: input.orderId });
    const order = await claimRetailCapture(input.orderId);
    if (!order) return Response.json({ ok: false, error: current.status === "capturing" ? "capture_in_progress" : "order_unavailable" }, { status: 409 });
    const quote = { currency: order.currency, totalMinor: Number(order.amount_minor), items: [] };
    let token: string;
    let captureId: string;
    try {
      token = await getPaypalAccessToken({ clientId: config.paypalClientId, clientSecret: config.paypalClientSecret, baseUrl: config.paypalBaseUrl });
      captureId = await capturePaypalOrder(input.orderId, quote, token, config.paypalBaseUrl, `retail-capture-${input.orderId}`);
    } catch {
      // No remote capture was confirmed, so this hold may safely return to the
      // retryable created state. Never do this after captureId is known.
      await restoreRetailOrderAfterCaptureFailure(input.orderId);
      return Response.json({ ok: false, error: "capture_unavailable" }, { status: 503 });
    }
    let details: PaypalOrderDetails = emptyPaypalOrderDetails;
    try { details = await getPaypalOrderDetails(input.orderId, token!, config.paypalBaseUrl); } catch { /* webhook or a later admin read can enrich snapshots */ }
    try {
      if (!await markRetailOrderCaptured(input.orderId, captureId!, details.customer, details.shipping, details.breakdown?.feeMinor ?? null, details.breakdown?.netMinor ?? null)) return Response.json({ ok: false, error: "capture_conflict" }, { status: 409 });
      await auditRetailEvent(input.orderId, "captured", { captureId });
      return Response.json({ ok: true, orderId: input.orderId });
    } catch {
      // Preserve `capturing`: the stable capture id and verified webhook can
      // converge accounting/inventory without ever asking PayPal to charge again.
      return Response.json({ ok: false, error: "capture_reconciliation_pending" }, { status: 503 });
    }
  } catch { return Response.json({ ok: false, error: "capture_unavailable" }, { status: 503 }); }
}
