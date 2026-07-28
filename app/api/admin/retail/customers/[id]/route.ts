import { z } from "zod";
import { assertSameOrigin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { customerUpdateDto, getAdminCustomerAddressBookPii, updateCustomer } from "@/src/lib/retail/operations";
export const runtime="nodejs"; export const dynamic="force-dynamic";
type ParamsContext={params:Promise<{id:string}>};
const noStore={"cache-control":"no-store"};
function errorResponse(error:unknown){const message=error instanceof Error?error.message:"invalid_request";const status=message==="unauthorized"?401:message==="forbidden"?403:400;return Response.json({ok:false,error:status===401?"unauthorized":status===403?"forbidden":"invalid_request"},{status,headers:noStore});}

// Full address data is intentionally separate from the ordinary directory and
// write response. The permission check and the database audit receipt happen
// before operations.ts performs the unmasked select.
export async function GET(_request:Request,context:ParamsContext){try{const actor=await requireRetailPermission("orders:pii");const {id}=await context.params;const customer=await getAdminCustomerAddressBookPii(z.string().uuid().parse(id),actor);return Response.json({ok:true,customer},{headers:noStore});}catch(e){return errorResponse(e)}}

export async function PATCH(request:Request,context:ParamsContext){try{const actor=await requireRetailPermission("customers:write");await assertSameOrigin();const {id}=await context.params;const result=await updateCustomer(z.string().uuid().parse(id),customerUpdateDto.parse(await request.json()),actor);return Response.json({ok:true,...result},{headers:noStore});}catch(e){return errorResponse(e)}}
