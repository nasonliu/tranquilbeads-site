import { z } from "zod";

import { requireRetailAgentPermission } from "@/src/lib/retail/agent-auth";
import { adjustInventory, fulfilAdminOrder, getAdminOrder, getRetailSalesSummary, inventoryAdjustmentDto, listAgentOrders, listInventory, listInventoryLedger, listRetailAdminAudit, listRetailSalesRows } from "@/src/lib/retail/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };

const queryDto = z.object({
  resource: z.enum(["inventory", "orders", "sales", "sales_detail", "audit"]),
  productId: z.string().uuid().optional(),
  status: z.string().trim().max(80).optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
  groupBy: z.enum(["day", "sku"]).default("day"),
  sku: z.string().trim().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  days: z.coerce.number().int().min(1).max(365).default(30),
  limit: z.coerce.number().int().min(1).max(250).default(50),
}).strict().superRefine((value, ctx) => {
  if (value.dateFrom && value.dateTo && new Date(value.dateTo) <= new Date(value.dateFrom)) ctx.addIssue({ code: "custom", message: "dateTo must be after dateFrom" });
});
const actionDto = z.discriminatedUnion("action", [
  inventoryAdjustmentDto.extend({ action: z.literal("inventory.adjust"), confirm: z.boolean().default(false) }),
  z.object({ action: z.literal("order.fulfil"), orderId: z.number().int().positive(), carrier: z.string().trim().max(100), tracking: z.string().trim().max(200), note: z.string().trim().max(2000).default(""), idempotencyKey: z.string().uuid(), confirm: z.boolean().default(false) }).strict(),
]);

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "invalid_request";
  const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("agent_") ? 503 : 400;
  return Response.json({ ok: false, error: status === 400 ? "invalid_request" : message }, { status, headers });
}

export async function GET(request: Request) {
  try {
    const input = queryDto.parse(Object.fromEntries(new URL(request.url).searchParams));
    if (input.resource === "inventory") {
      requireRetailAgentPermission(request, "inventory:write");
      return Response.json({ ok: true, resource: input.resource, balances: await listInventory(input.productId), ledger: await listInventoryLedger(input.productId) }, { headers });
    }
    if (input.resource === "orders") {
      requireRetailAgentPermission(request, "orders:read");
      const orders = await listAgentOrders(input);
      return Response.json({ ok: true, resource: input.resource, orders, offset: input.offset, limit: input.limit, hasMore: orders.length === input.limit }, { headers });
    }
    if (input.resource === "sales") {
      requireRetailAgentPermission(request, "finance:read");
      return Response.json({ ok: true, resource: input.resource, summary: await getRetailSalesSummary(input.days) }, { headers });
    }
    if (input.resource === "sales_detail") {
      requireRetailAgentPermission(request, "finance:read");
      const rows = await listRetailSalesRows(input);
      return Response.json({ ok: true, resource: input.resource, groupBy: input.groupBy, rows, offset: input.offset, limit: input.limit, hasMore: rows.length === input.limit }, { headers });
    }
    requireRetailAgentPermission(request, "audit:read");
    return Response.json({ ok: true, resource: input.resource, entries: await listRetailAdminAudit({ limit: input.limit }) }, { headers });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const input = actionDto.parse(await request.json());
    if (input.action === "inventory.adjust") {
      const actor = requireRetailAgentPermission(request, "inventory:write", input.confirm);
      const before = (await listInventory(input.productId))[0] ?? null;
      if (!input.confirm) return Response.json({ ok: true, dryRun: true, action: input.action, before, proposed: { delta: input.delta, reason: input.reason }, confirmationRequired: true }, { headers });
      const { action: _action, confirm: _confirm, ...data } = input; void _action; void _confirm;
      await adjustInventory(data, actor);
      const after = (await listInventory(input.productId))[0] ?? null;
      return Response.json({ ok: true, dryRun: false, action: input.action, before, after, idempotencyKey: input.idempotencyKey }, { headers });
    }
    const actor = requireRetailAgentPermission(request, "orders:fulfil", input.confirm);
    const before = await getAdminOrder(input.orderId);
    if (!input.confirm) return Response.json({ ok: true, dryRun: true, action: input.action, before, proposed: { carrier: input.carrier, tracking: input.tracking, note: input.note }, confirmationRequired: true }, { headers });
    const { action: _action, confirm: _confirm, ...data } = input; void _action; void _confirm;
    await fulfilAdminOrder(data, actor);
    const after = await getAdminOrder(input.orderId);
    return Response.json({ ok: true, dryRun: false, action: input.action, before, after, idempotencyKey: input.idempotencyKey }, { headers });
  } catch (error) { return failure(error); }
}
