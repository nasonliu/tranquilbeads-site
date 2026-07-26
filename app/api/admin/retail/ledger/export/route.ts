import { assertSameOrigin, requireRetailAdmin } from "@/src/lib/retail/admin-auth";
import { listLedgerEntries } from "@/src/lib/retail/operations";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const csv=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;
export async function GET(request:Request){try{await requireRetailAdmin();const status=new URL(request.url).searchParams.get("status")??undefined;const rows=await listLedgerEntries(status);const header="id,order,kind,posting_amount_minor,currency,reconciliation_status,paypal_reference,created_at";const body=rows.map((r:any)=>[r.id,r.paypal_order_id,r.kind,r.amount_minor,r.currency,r.reconciliation_status,r.paypal_reference,r.created_at].map(csv).join(",")).join("\n");return new Response(`${header}\n${body}\n`,{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":"attachment; filename=retail-ledger-postings.csv","cache-control":"no-store"}})}catch{return Response.json({ok:false},{status:401})}}
export async function POST(){try{await requireRetailAdmin();await assertSameOrigin();return Response.json({ok:false},{status:405})}catch{return Response.json({ok:false},{status:401})}}
