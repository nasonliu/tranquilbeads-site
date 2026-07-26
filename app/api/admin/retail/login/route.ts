import { z } from "zod";
import { assertSameOrigin, consumeRetailAdminLoginFailure, setRetailAdminSession, verifyRetailAdminPassword } from "@/src/lib/retail/admin-auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request) { try { await assertSameOrigin(); const {password}=z.object({password:z.string().min(16).max(256)}).parse(await request.json()); if(!verifyRetailAdminPassword(password)){const allowed=await consumeRetailAdminLoginFailure(request);return Response.json({ok:false,...(!allowed?{error:"rate_limited"}:{})},{status:allowed?401:429});} await setRetailAdminSession(); return Response.json({ok:true},{headers:{"cache-control":"no-store"}}); } catch { return Response.json({ok:false},{status:400}); } }
