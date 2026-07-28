import { z } from "zod";

import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { cancelAdminOrder, cancellationDto, fulfilAdminOrder, fulfilmentDto, getAdminOrder, getAdminOrderPii } from "@/src/lib/retail/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type ParamsContext = { params: Promise<{ id: string }> };
const noStore = { "cache-control": "no-store" };

export async function GET(request: Request, context: ParamsContext) {
  try {
    const { id } = await context.params;
    const orderId = z.coerce.number().int().positive().parse(id);
    const query = new URL(request.url).searchParams;
    if (query.get("include") === "pii" || query.get("includePii") === "1") {
      const actor = await requireRetailPermission("orders:pii");
      const order = await getAdminOrder(orderId);
      if (!order) return Response.json({ ok: false }, { status: 404, headers: noStore });
      return Response.json({ ok: true, order: { ...order, pii: await getAdminOrderPii(orderId, actor) } }, { headers: noStore });
    }
    await requireRetailPermission("orders:read");
    const order = await getAdminOrder(orderId);
    if (!order) return Response.json({ ok: false }, { status: 404, headers: noStore });
    return Response.json({ ok: true, order }, { headers: noStore });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400;
    return Response.json({ ok: false, error: status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "invalid_request" }, { status, headers: noStore });
  }
}

export async function PATCH(request: Request, context: ParamsContext) {
  try {
    await assertSameOrigin();
    const { id } = await context.params;
    const orderId = z.coerce.number().int().positive().parse(id);
    const raw = await request.json();
    if (raw.action === "cancel") {
      await requireRetailPermission("orders:cancel");
      const order = await getAdminOrder(orderId);
      if (!order) throw new Error("order_not_found");
      if (order.paypal_order_id) throw new Error("order_requires_payment_reconciliation");
      await cancelAdminOrder(orderId, cancellationDto.parse(raw));
      return Response.json({ ok: true }, { headers: noStore });
    }
    await requireRetailPermission("orders:fulfil");
    await fulfilAdminOrder(fulfilmentDto.parse({ ...raw, orderId }));
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    const code = ["unauthorized", "forbidden", "order_not_found", "order_requires_payment_reconciliation"].includes(message) ? message : "invalid_request";
    const status = code === "unauthorized" ? 401 : code === "forbidden" ? 403 : 400;
    return Response.json({ ok: false, error: code }, { status, headers: noStore });
  }
}
