import { cookies } from "next/headers";
import { assertSameOrigin, clearRetailAdminSession, requireRetailAdmin, revokeRetailAdminSession } from "@/src/lib/retail/admin-auth";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function POST(){try{await requireRetailAdmin();await assertSameOrigin();await revokeRetailAdminSession((await cookies()).get("retail_admin")?.value);await clearRetailAdminSession();return Response.json({ok:true},{headers:{"cache-control":"no-store"}})}catch{return Response.json({ok:false},{status:401,headers:{"cache-control":"no-store"}})}}
