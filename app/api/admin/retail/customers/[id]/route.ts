import { z } from "zod";
import { assertSameOrigin, requireRetailAdmin } from "@/src/lib/retail/admin-auth";
import { customerUpdateDto, updateCustomer } from "@/src/lib/retail/operations";
export const runtime="nodejs"; export const dynamic="force-dynamic";
type ParamsContext={params:Promise<{id:string}>};
export async function PATCH(request:Request,context:ParamsContext){try{await requireRetailAdmin();await assertSameOrigin();const {id}=await context.params;await updateCustomer(z.string().uuid().parse(id),customerUpdateDto.parse(await request.json()));return Response.json({ok:true},{headers:{"cache-control":"no-store"}})}catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:"invalid_request"},{status:400})}}
