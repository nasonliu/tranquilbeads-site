import { assertSameOrigin, requireRetailAdmin } from "@/src/lib/retail/admin-auth";
import { listCustomers } from "@/src/lib/retail/operations";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){try{await requireRetailAdmin();return Response.json({ok:true,customers:await listCustomers()},{headers:{"cache-control":"no-store"}})}catch{return Response.json({ok:false},{status:401})}}
export async function POST(){try{await requireRetailAdmin();await assertSameOrigin();return Response.json({ok:false,error:"unsupported"},{status:405})}catch{return Response.json({ok:false},{status:401})}}
