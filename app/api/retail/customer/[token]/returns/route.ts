import { customerReturnDto, createCustomerReturn, listCustomerReturnableLines, listCustomerReturns } from "@/src/lib/retail/returns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ token: string }> };
const headers = { "cache-control": "no-store, private", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow, noarchive" };

function unavailable() { return Response.json({ ok: false, error: "portal_unavailable" }, { status: 404, headers }); }

export async function GET(_request: Request, context: Context) {
  try {
    const { token } = await context.params;
    const [returns, returnableLines] = await Promise.all([listCustomerReturns(token), listCustomerReturnableLines(token)]);
    return Response.json({ ok: true, returns, returnableLines }, { headers });
  } catch { return unavailable(); }
}

export async function POST(request: Request, context: Context) {
  try {
    const { token } = await context.params;
    const value = await createCustomerReturn(token, customerReturnDto.parse(await request.json()));
    return Response.json({ ok: true, return: value }, { status: 201, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "return_unavailable";
    if (message === "portal_unavailable") return unavailable();
    return Response.json({ ok: false, error: "return_unavailable" }, { status: 400, headers });
  }
}
