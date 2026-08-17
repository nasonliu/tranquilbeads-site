import { assertSameOrigin, requireRetailAdmin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { listCustomers } from "@/src/lib/retail/operations";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){try{await requireRetailPermission("customers:write");return Response.json({ok:true,customers:await listCustomers()},{headers:{"cache-control":"no-store"}})}catch(e){const message=e instanceof Error?e.message:"invalid_request";const status=message==="unauthorized"?401:message==="forbidden"?403:400;return Response.json({ok:false,error:status===401?"unauthorized":status===403?"forbidden":"invalid_request"},{status})}}
export async function POST(){try{await requireRetailAdmin();await assertSameOrigin();return Response.json({ok:false,error:"unsupported"},{status:405})}catch{return Response.json({ok:false},{status:401})}}
