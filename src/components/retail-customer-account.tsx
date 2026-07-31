"use client";

import { useState } from "react";

export function CustomerAccountLogin({ locale, error }: { locale: "en" | "ar"; error?: boolean }) {
  const [email, setEmail] = useState(""); const [submitted, setSubmitted] = useState(false); const [busy, setBusy] = useState(false);
  const ar = locale === "ar";
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); try { await fetch("/api/retail/customer-auth/request-link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, locale }) }); setSubmitted(true); } finally { setBusy(false); } }
  return <section className="noor-panel mx-auto max-w-md rounded-[1.75rem] p-7"><h1 className="text-3xl font-semibold">{ar ? "حسابي" : "My account"}</h1><p className="mt-3 text-sm text-muted">{ar ? "أدخل بريدك الإلكتروني وسنرسل رابط دخول آمنًا." : "Enter your email and we’ll send you a secure sign-in link."}</p>{error ? <p className="mt-4 text-sm text-red-700">{ar ? "انتهت صلاحية الرابط أو تم استخدامه. اطلب رابطًا جديدًا." : "That link has expired or was already used. Request a new one."}</p> : null}{submitted ? <p className="mt-5 rounded-xl bg-[#edf2e5] p-4 text-sm">{ar ? "إذا كان لديك حساب، تحقق من بريدك الإلكتروني." : "If an account exists for this address, check your email."}</p> : <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">{ar ? "البريد الإلكتروني" : "Email address"}<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2" autoComplete="email" /></label><button disabled={busy} className="rounded-xl bg-[#6b7a51] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? (ar ? "جارٍ الإرسال…" : "Sending…") : (ar ? "إرسال رابط الدخول" : "Email me a sign-in link")}</button></form>}</section>;
}

export function CustomerAccountLogout({ locale }: { locale: "en" | "ar" }) { const [busy, setBusy] = useState(false); const ar = locale === "ar"; return <button onClick={async () => { setBusy(true); await fetch("/api/retail/customer-auth/logout", { method: "POST" }); location.reload(); }} disabled={busy} className="text-sm text-[#6b7a51] hover:underline">{ar ? "تسجيل الخروج" : "Sign out"}</button>; }

export function CustomerMarketingPreferences({ locale }: { locale: "en" | "ar" }) {
  const [busy, setBusy] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);
  const ar = locale === "ar";
  if (withdrawn) return <p className="text-sm text-muted">{ar ? "تم إلغاء الاشتراك في رسائل العروض." : "You are unsubscribed from promotional emails."}</p>;
  return <button
    type="button"
    disabled={busy}
    onClick={async () => {
      setBusy(true);
      const response = await fetch("/api/retail/customer-auth/marketing/unsubscribe", { method: "POST" });
      if (response.ok) setWithdrawn(true);
      setBusy(false);
    }}
    className="text-sm font-medium text-[#6b7a51] hover:underline disabled:opacity-60"
  >
    {busy ? (ar ? "جارٍ الإلغاء…" : "Unsubscribing…") : (ar ? "إلغاء الاشتراك في رسائل العروض" : "Unsubscribe from promotional emails")}
  </button>;
}
