import { assertSameOrigin, requireRetailAdmin } from "@/src/lib/retail/admin-auth";
import { getLedgerPostingSummary, listLedgerEntries } from "@/src/lib/retail/operations";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(request:Request){try{await requireRetailAdmin();const status=new URL(request.url).searchParams.get("status")??undefined;const [entries,summary]=await Promise.all([listLedgerEntries(status),getLedgerPostingSummary()]);return Response.json({ok:true,entries,summary},{headers:{"cache-control":"no-store"}})}catch{return Response.json({ok:false},{status:401})}}
export async function POST(){try{await requireRetailAdmin();await assertSameOrigin();return Response.json({ok:false,error:"use_entry_route"},{status:405})}catch{return Response.json({ok:false},{status:401})}}
