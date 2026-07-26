import { z } from "zod";
import { assertSameOrigin, requireRetailAdmin } from "@/src/lib/retail/admin-auth";
import { adjustInventory, inventoryAdjustmentDto, listInventory, listInventoryLedger } from "@/src/lib/retail/operations";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const noStore={"cache-control":"no-store"};
export async function GET(request:Request){try{await requireRetailAdmin();const url=new URL(request.url),id=url.searchParams.get("productId")??undefined;return Response.json({ok:true,balances:await listInventory(id),ledger:await listInventoryLedger(id)},{headers:noStore})}catch{return Response.json({ok:false},{status:401,headers:noStore})}}
export async function POST(request:Request){try{await requireRetailAdmin();await assertSameOrigin();await adjustInventory(inventoryAdjustmentDto.parse(await request.json()));return Response.json({ok:true},{headers:noStore})}catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:"invalid_request"},{status:400,headers:noStore})}}
