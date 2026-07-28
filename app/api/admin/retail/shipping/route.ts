import { assertSameOrigin,requireRetailPermission } from "@/src/lib/retail/admin-auth";
import { disableShippingZone,listShippingZones,shippingDisableDto,shippingZoneDto,upsertShippingZone } from "@/src/lib/retail/operations";

export const runtime="nodejs";export const dynamic="force-dynamic";
const noStore={"cache-control":"no-store"};
const fail=(error:unknown,status=400)=>Response.json({ok:false,error:error instanceof Error?error.message:"invalid_request"},{status,headers:noStore});
const statusFor=(error:unknown)=>error instanceof Error&&error.message==="unauthorized"?401:error instanceof Error&&error.message==="forbidden"?403:400;
const safeError=(error:unknown)=>{const status=statusFor(error);return new Error(status===401?"unauthorized":status===403?"forbidden":"invalid_request");};
export async function GET(){try{await requireRetailPermission("shipping:write");return Response.json({ok:true,zones:await listShippingZones()},{headers:noStore});}catch(error){return fail(safeError(error),statusFor(error));}}
export async function POST(request:Request){try{const actor=await requireRetailPermission("shipping:write");await assertSameOrigin();return Response.json({ok:true,zone:await upsertShippingZone(shippingZoneDto.parse(await request.json()),actor)},{headers:noStore});}catch(error){return fail(safeError(error),statusFor(error));}}
export async function DELETE(request:Request){try{const actor=await requireRetailPermission("shipping:write");await assertSameOrigin();await disableShippingZone(shippingDisableDto.parse(await request.json()),actor);return Response.json({ok:true},{headers:noStore});}catch(error){return fail(safeError(error),statusFor(error));}}
