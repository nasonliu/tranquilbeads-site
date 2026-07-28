import { z } from "zod";
import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { closePayPalSettlementException, settlementCloseDto } from "@/src/lib/retail/settlements";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const noStore={"cache-control":"no-store"}; type Context={params:Promise<{id:string}>};
export async function POST(request:Request,context:Context){try{await requireRetailPermission("finance:write");await assertSameOrigin();const {id}=await context.params;await closePayPalSettlementException(z.string().uuid().parse(id),settlementCloseDto.parse(await request.json()));return Response.json({ok:true},{headers:noStore});}catch(error){const message=error instanceof Error?error.message:"invalid_request";const status=message==="unauthorized"?401:message==="forbidden"?403:400;return Response.json({ok:false,error:status===401?"unauthorized":status===403?"forbidden":"invalid_request"},{status,headers:noStore})}}
