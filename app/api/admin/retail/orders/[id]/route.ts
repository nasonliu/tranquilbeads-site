import { z } from "zod";
import { assertSameOrigin, requireRetailAdmin } from "@/src/lib/retail/admin-auth";
import { cancelAdminOrder,cancellationDto,fulfilAdminOrder, fulfilmentDto, getAdminOrder } from "@/src/lib/retail/operations";
export const runtime="nodejs"; export const dynamic="force-dynamic";
type ParamsContext={params:Promise<{id:string}>};
export async function GET(_request:Request,context:ParamsContext){try{await requireRetailAdmin();const {id}=await context.params;const order=await getAdminOrder(z.coerce.number().int().positive().parse(id));return order?Response.json({ok:true,order},{headers:{"cache-control":"no-store"}}):Response.json({ok:false},{status:404})}catch{return Response.json({ok:false},{status:401})}}
export async function PATCH(request:Request,context:ParamsContext){try{await requireRetailAdmin();await assertSameOrigin();const {id}=await context.params,orderId=z.coerce.number().int().positive().parse(id),raw=await request.json();if(raw.action==="cancel"){await cancelAdminOrder(orderId,cancellationDto.parse(raw));return Response.json({ok:true},{headers:{"cache-control":"no-store"}});}const body=fulfilmentDto.parse({...raw,orderId});await fulfilAdminOrder(body);return Response.json({ok:true},{headers:{"cache-control":"no-store"}})}catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:"invalid_request"},{status:400})}}
