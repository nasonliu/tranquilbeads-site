import { z } from "zod";
import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { reconciliationDto, updateReconciliation } from "@/src/lib/retail/operations";
export const runtime="nodejs"; export const dynamic="force-dynamic";
type ParamsContext={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:ParamsContext){try{await requireRetailPermission("finance:write");await assertSameOrigin();const {id}=await context.params;await updateReconciliation(z.string().uuid().parse(id),reconciliationDto.parse(await request.json()));return Response.json({ok:true},{headers:{"cache-control":"no-store"}})}catch(e){const message=e instanceof Error?e.message:"invalid_request";const status=message==="unauthorized"?401:message==="forbidden"?403:400;return Response.json({ok:false,error:status===401?"unauthorized":status===403?"forbidden":"invalid_request"},{status})}}
