import "server-only";

import { guardedRetailSql } from "./database-identity";
import { customerPortalUrl, issueNotificationCustomerPortalToken } from "./customer-portal";
import { isLocale, type Locale } from "@/src/lib/i18n";

type Fetcher=typeof fetch;
type NotificationRow={id:string;kind:string;recipient:string;payload:unknown;refunded_minor_text:unknown;order_id:number;public_id:string;client_request_id:string;currency:string;amount_minor:unknown;carrier:string|null;tracking_number:string|null;checkout_locale:string|null};
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
const recordPayload=(value:unknown):Record<string,unknown>=>{
  if(value===null||typeof value!=="object"||Array.isArray(value)||!([Object.prototype,null] as unknown[]).includes(Object.getPrototypeOf(value)))throw new Error("invalid_notification_payload");
  return value as Record<string,unknown>;
};
const ZERO_MINOR=BigInt(0),MINOR_PER_MAJOR=BigInt(100),POSTGRES_BIGINT_MAX=BigInt("9223372036854775807");
const parseMinor=(value:unknown):bigint|null=>{
  if(typeof value==="number")return Number.isSafeInteger(value)&&value>=0?BigInt(value):null;
  if(typeof value!=="string"||!(/^(?:0|[1-9][0-9]*)$/).test(value))return null;
  const parsed=BigInt(value);
  return parsed<=POSTGRES_BIGINT_MAX?parsed:null;
};
const formatMinor=(currency:unknown,minor:bigint)=>`${String(currency).trim()} ${minor/MINOR_PER_MAJOR}.${(minor%MINOR_PER_MAJOR).toString().padStart(2,"0")}`;

type NotificationCopy={subject:string;detail:string;portalLabel:string;help:string};
function notificationCopy(locale:Locale,kind:string,reference:string,amount:string,refundAmount:string,carrier:string|null,tracking:string|null):NotificationCopy{
  const details={
    order_confirmed:{en:`Payment received: ${amount}`,ar:`تم استلام الدفع: ${amount}`,zh:`已收到付款：${amount}`},
    order_fulfilled:{en:`Carrier: ${carrier??"-"}<br>Tracking: ${tracking??"-"}`,ar:`شركة الشحن: ${carrier??"-"}<br>رقم التتبع: ${tracking??"-"}`,zh:`承运商：${carrier??"-"}<br>追踪号：${tracking??"-"}`},
    order_refunded:{en:`Refunded so far: ${refundAmount}`,ar:`المبلغ المسترد حتى الآن: ${refundAmount}`,zh:`累计退款：${refundAmount}`},
    order_cancelled:{en:"Your order has been cancelled.",ar:"تم إلغاء طلبك.",zh:"您的订单已取消。"},
    payment_failed:{en:"We could not complete your payment.",ar:"تعذر إتمام دفعتك.",zh:"我们未能完成您的付款。"},
    checkout_expired:{en:"Your checkout expired before payment was completed.",ar:"انتهت صلاحية إتمام الطلب قبل اكتمال الدفع.",zh:"您的结账在付款完成前已过期。"},
  } as const;
  const state=details[kind as keyof typeof details];
  const subjects={
    order_confirmed:{en:`TranquilBeads order ${reference} confirmed`,ar:`تم تأكيد طلب TranquilBeads ${reference}`,zh:`TranquilBeads 订单 ${reference} 已确认`},
    order_fulfilled:{en:`TranquilBeads order ${reference} shipped`,ar:`تم شحن طلب TranquilBeads ${reference}`,zh:`TranquilBeads 订单 ${reference} 已发货`},
    order_refunded:{en:`TranquilBeads order ${reference} refund update`,ar:`تحديث استرداد طلب TranquilBeads ${reference}`,zh:`TranquilBeads 订单 ${reference} 退款更新`},
    order_cancelled:{en:`TranquilBeads order ${reference} cancelled`,ar:`تم إلغاء طلب TranquilBeads ${reference}`,zh:`TranquilBeads 订单 ${reference} 已取消`},
    payment_failed:{en:`TranquilBeads payment update for ${reference}`,ar:`تحديث الدفع لطلب TranquilBeads ${reference}`,zh:`TranquilBeads 订单 ${reference} 付款更新`},
    checkout_expired:{en:`TranquilBeads checkout expired for ${reference}`,ar:`انتهت صلاحية إتمام طلب TranquilBeads ${reference}`,zh:`TranquilBeads 订单 ${reference} 结账已过期`},
  } as const;
  const subject=subjects[kind as keyof typeof subjects];
  if(!state||!subject)throw new Error("unsupported_notification_kind");
  return {subject:subject[locale],detail:state[locale],portalLabel:locale==="ar"?"عرض طلبك وتحديثات التوصيل":locale==="zh"?"查看订单和配送更新":"View your order and delivery updates",help:locale==="ar"?"إذا احتجت إلى مساعدة، يُرجى الرد على هذه الرسالة الإلكترونية.":locale==="zh"?"如需帮助，请回复此邮件。":"If you need help, reply to this email."};
}

export async function deliverRetailNotifications(fetcher:Fetcher=fetch){
  const databaseUrl=process.env.RETAIL_DATABASE_URL||process.env.DATABASE_URL,apiKey=process.env.RETAIL_RESEND_API_KEY,from=process.env.RETAIL_EMAIL_FROM,portalTokenSecret=process.env.RETAIL_PORTAL_TOKEN_SECRET;
  if(!databaseUrl||!apiKey||!from||!portalTokenSecret||portalTokenSecret.length<32)return{processed:0,sent:0,failed:0,configured:false};
  const q=guardedRetailSql();
  await q`UPDATE retail_notification_outbox SET status='failed',claimed_at=NULL,last_error=COALESCE(last_error,'delivery_lease_expired') WHERE status='processing' AND claimed_at<now()-interval '10 minutes'`;
  const rows=await q`WITH candidates AS (SELECT id FROM retail_notification_outbox WHERE status IN ('pending','failed') AND available_at<=now() AND attempts<8 AND recipient IS NOT NULL ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 10),claimed AS (UPDATE retail_notification_outbox n SET status='processing',claimed_at=now(),attempts=attempts+1 FROM candidates c WHERE n.id=c.id RETURNING n.*) SELECT c.id,c.kind,c.recipient,c.payload,c.payload->>'refundedMinor' AS refunded_minor_text,c.order_id,o.public_id,o.client_request_id,o.currency,o.amount_minor,o.carrier,o.tracking_number,o.checkout_locale FROM claimed c JOIN retail_orders o ON o.id=c.order_id` as unknown as NotificationRow[];
  let sent=0,failed=0;
  for(const row of rows){
    try{
      const payload=recordPayload(row.payload);
      const orderAmountMinor=parseMinor(row.amount_minor);
      if(orderAmountMinor===null)throw new Error("invalid_order_amount_minor");
      let refundedMinor=ZERO_MINOR;
      if(row.kind==="order_refunded"){
        const parsedRefundedMinor=parseMinor(row.refunded_minor_text);
        if(parsedRefundedMinor===null)throw new Error("invalid_refunded_minor");
        refundedMinor=parsedRefundedMinor;
      }
      if(row.kind==="order_refunded"&&refundedMinor>orderAmountMinor)throw new Error("invalid_refunded_minor");
      const reference=String(row.public_id),amount=formatMinor(row.currency,orderAmountMinor);
      const refundAmount=formatMinor(row.currency,refundedMinor);
      const candidateLocale=String(row.checkout_locale);
      const locale:Locale=isLocale(candidateLocale)?candidateLocale:"en";
      const carrier=typeof payload.carrier==="string"?payload.carrier:row.carrier;
      const tracking=typeof payload.tracking==="string"?payload.tracking:row.tracking_number;
      const copy=notificationCopy(locale,row.kind,reference,amount,refundAmount,carrier,tracking);
      // The deterministic bearer credential exists only while constructing this
      // message; it is never written to the outbox or included in error/log text.
      const portalLink=row.kind==="order_confirmed"?customerPortalUrl((await issueNotificationCustomerPortalToken(Number(row.order_id),row.id)).token,locale):null;
      const portalHtml=portalLink?`<p><a href="${escapeHtml(portalLink)}">${escapeHtml(copy.portalLabel)}</a></p>`:"";
      const html=`<h1>${escapeHtml(copy.subject)}</h1><p>${escapeHtml(copy.detail).replaceAll("&lt;br&gt;","<br>")}</p><p>${locale==="ar"?"مرجع الطلب":locale==="zh"?"订单编号":"Order reference"}: ${escapeHtml(reference)}</p>${portalHtml}<p>${escapeHtml(copy.help)}</p>`;
      const response=await fetcher("https://api.resend.com/emails",{method:"POST",headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json","idempotency-key":`retail-notification-${row.id}`},body:JSON.stringify({from,to:[row.recipient],subject:copy.subject,html}),cache:"no-store"});
      if(!response.ok)throw new Error(`email_${response.status}`);
      await q`UPDATE retail_notification_outbox SET status='sent',claimed_at=NULL,sent_at=now(),last_error=NULL WHERE id=${row.id}::uuid AND status='processing'`;sent++;
    }catch(error){const message=error instanceof Error?error.message.slice(0,200):"delivery_failed";await q`UPDATE retail_notification_outbox SET status='failed',claimed_at=NULL,last_error=${message},available_at=now()+make_interval(secs=>LEAST(3600,60*(2^LEAST(attempts,6)))) WHERE id=${row.id}::uuid AND status='processing'`;failed++;}
  }
  return{processed:rows.length,sent,failed,configured:true};
}
