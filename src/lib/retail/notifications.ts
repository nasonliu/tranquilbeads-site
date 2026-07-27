import "server-only";

import { guardedRetailSql } from "./database-identity";

type Fetcher=typeof fetch;
type NotificationRow={id:string;kind:string;recipient:string;payload:Record<string,unknown>;public_id:string;client_request_id:string;currency:string;amount_minor:number;carrier:string|null;tracking_number:string|null};
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));

export async function deliverRetailNotifications(fetcher:Fetcher=fetch){
  const databaseUrl=process.env.DATABASE_URL,apiKey=process.env.RETAIL_RESEND_API_KEY,from=process.env.RETAIL_EMAIL_FROM;
  if(!databaseUrl||!apiKey||!from)return{processed:0,sent:0,failed:0,configured:false};
  const q=guardedRetailSql();
  await q`UPDATE retail_notification_outbox SET status='failed',claimed_at=NULL,last_error=COALESCE(last_error,'delivery_lease_expired') WHERE status='processing' AND claimed_at<now()-interval '10 minutes'`;
  const rows=await q`WITH candidates AS (SELECT id FROM retail_notification_outbox WHERE status IN ('pending','failed') AND available_at<=now() AND attempts<8 AND recipient IS NOT NULL ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 10),claimed AS (UPDATE retail_notification_outbox n SET status='processing',claimed_at=now(),attempts=attempts+1 FROM candidates c WHERE n.id=c.id RETURNING n.*) SELECT c.id,c.kind,c.recipient,c.payload,o.public_id,o.client_request_id,o.currency,o.amount_minor,o.carrier,o.tracking_number FROM claimed c JOIN retail_orders o ON o.id=c.order_id` as unknown as NotificationRow[];
  let sent=0,failed=0;
  for(const row of rows){
    const reference=String(row.public_id),amount=`${String(row.currency).trim()} ${(Number(row.amount_minor)/100).toFixed(2)}`;
    const subject=row.kind==="order_confirmed"?`TranquilBeads order ${reference} confirmed`:row.kind==="order_fulfilled"?`TranquilBeads order ${reference} shipped`:`TranquilBeads order ${reference} refund update`;
    const refundedMinor=Number(row.payload.refundedMinor??0),refundAmount=`${String(row.currency).trim()} ${(refundedMinor/100).toFixed(2)}`;
    const detail=row.kind==="order_fulfilled"?`Carrier: ${row.carrier??"-"}<br>Tracking: ${row.tracking_number??"-"}`:row.kind==="order_refunded"?`Refunded so far: ${refundAmount}`:`Payment received: ${amount}`;
    const html=`<h1>${escapeHtml(subject)}</h1><p>${escapeHtml(detail).replace("&lt;br&gt;","<br>")}</p><p>Order reference: ${escapeHtml(reference)}</p><p>If you need help, reply to this email.</p>`;
    try{
      const response=await fetcher("https://api.resend.com/emails",{method:"POST",headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json","idempotency-key":`retail-notification-${row.id}`},body:JSON.stringify({from,to:[row.recipient],subject,html}),cache:"no-store"});
      if(!response.ok)throw new Error(`email_${response.status}`);
      await q`UPDATE retail_notification_outbox SET status='sent',claimed_at=NULL,sent_at=now(),last_error=NULL WHERE id=${row.id}::uuid AND status='processing'`;sent++;
    }catch(error){const message=error instanceof Error?error.message.slice(0,200):"delivery_failed";await q`UPDATE retail_notification_outbox SET status='failed',claimed_at=NULL,last_error=${message},available_at=now()+make_interval(secs=>LEAST(3600,60*(2^LEAST(attempts,6)))) WHERE id=${row.id}::uuid AND status='processing'`;failed++;}
  }
  return{processed:rows.length,sent,failed,configured:true};
}
