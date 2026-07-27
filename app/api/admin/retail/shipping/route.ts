import { assertSameOrigin,requireRetailAdmin } from "@/src/lib/retail/admin-auth";
import { disableShippingZone,listShippingZones,shippingDisableDto,shippingZoneDto,upsertShippingZone } from "@/src/lib/retail/operations";

export const runtime="nodejs";export const dynamic="force-dynamic";
const noStore={"cache-control":"no-store"};
const fail=(error:unknown,status=400)=>Response.json({ok:false,error:error instanceof Error?error.message:"invalid_request"},{status,headers:noStore});
export async function GET(){try{await requireRetailAdmin();return Response.json({ok:true,zones:await listShippingZones()},{headers:noStore});}catch{return fail(new Error("unauthorized"),401);}}
export async function POST(request:Request){try{await requireRetailAdmin();await assertSameOrigin();return Response.json({ok:true,zone:await upsertShippingZone(shippingZoneDto.parse(await request.json()))},{headers:noStore});}catch(error){return fail(error);}}
export async function DELETE(request:Request){try{await requireRetailAdmin();await assertSameOrigin();await disableShippingZone(shippingDisableDto.parse(await request.json()));return Response.json({ok:true},{headers:noStore});}catch(error){return fail(error);}}
