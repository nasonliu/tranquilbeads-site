"use client";

import Link from "next/link";
import { useState } from "react";

import type { Locale } from "@/src/lib/i18n";

export function RetailUnsubscribe({ locale, token }: { locale: Locale; token: string }) {
  const [done, setDone] = useState(false); const [busy, setBusy] = useState(false); const ar = locale === "ar";
  const unsubscribe = async () => { setBusy(true); await fetch("/api/retail/marketing/unsubscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => undefined); setDone(true); setBusy(false); };
  return <main className="noor-container py-12" dir={ar ? "rtl" : undefined}><section className="noor-panel mx-auto max-w-xl rounded-[1.75rem] p-8"><h1 className="noor-title text-3xl">{ar ? "إدارة رسائل العروض" : "Marketing email preferences"}</h1>{done ? <><p className="mt-4 text-muted">{ar ? "تم إلغاء اشتراكك في رسائل العروض. ستستمر رسائل الطلب والشحن عند الحاجة." : "You are unsubscribed from promotional email. Necessary order and shipping messages will continue."}</p><Link className="mt-6 inline-block text-accent-deep underline" href={`/${locale}/shop`}>{ar ? "العودة إلى المتجر" : "Return to the shop"}</Link></> : <><p className="mt-4 text-muted">{ar ? "لن يؤثر إلغاء الاشتراك في رسائل الطلب أو الدفع أو الشحن." : "Unsubscribing does not affect order, payment, refund, or shipping email."}</p><button disabled={busy || !token} onClick={() => void unsubscribe()} className="mt-6 rounded-xl bg-accent px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? (ar ? "جارٍ الإلغاء…" : "Unsubscribing…") : (ar ? "إلغاء الاشتراك" : "Unsubscribe")}</button></>}</section></main>;
}
