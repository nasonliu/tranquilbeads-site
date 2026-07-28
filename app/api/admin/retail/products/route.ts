import { assertSameOrigin, requireRetailAdmin, requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { createAdminProduct, listAdminProducts, productDto } from "@/src/lib/retail/operations";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const fail=(error:unknown,status=400)=>Response.json({ok:false,error:error instanceof Error?error.message:"invalid_request"},{status,headers:{"cache-control":"no-store"}});
export async function GET(){try{await requireRetailAdmin();return Response.json({ok:true,products:await listAdminProducts()},{headers:{"cache-control":"no-store"}})}catch{return fail(new Error("unauthorized"),401)}}
export async function POST(request:Request){try{const actor=await requireRetailPermission("products:write");await assertSameOrigin();return Response.json({ok:true,product:await createAdminProduct(productDto.parse(await request.json()),actor)},{status:201,headers:{"cache-control":"no-store"}})}catch(e){const message=e instanceof Error?e.message:"invalid_request";return fail(new Error(message==="unauthorized"||message==="forbidden"?message:"invalid_request"),message==="unauthorized"?401:message==="forbidden"?403:400)}}
