"use client";

import { useState, type FormEvent } from "react";

import type { Locale } from "@/src/lib/i18n";

export function RetailNewsletterSignup({ locale }: { locale: Locale }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const ar = locale === "ar";
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setState("sending");
    try {
      const response = await fetch("/api/retail/marketing/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, locale: ar ? "ar" : "en" }) });
      if (!response.ok) throw new Error("subscribe_failed");
      setEmail(""); setState("done");
    } catch { setState("error"); }
  };
  return <section className="noor-container pb-4" dir={ar ? "rtl" : undefined}>
    <div className="overflow-hidden rounded-[1.75rem] bg-[#351826] px-6 py-8 text-[#f7efe4] sm:px-9">
      <div className="grid items-end gap-6 md:grid-cols-[1fr_minmax(18rem,28rem)]"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#d5b783]">{ar ? "عروض TranquilBeads" : "TranquilBeads offers"}</p><h2 className="mt-3 font-serif text-3xl">{ar ? "كن أول من يعرف عن المنتجات والعروض الجديدة" : "New products and thoughtful offers, by email"}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#e2d2c8]">{ar ? "اشترك باختيارك. يمكنك إلغاء الاشتراك في أي وقت، ولن يؤثر ذلك في رسائل الطلب أو الشحن." : "Opt in for occasional retail offers. You can unsubscribe at any time; order and shipping email will continue separately."}</p></div>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}><label className="sr-only" htmlFor="retail-newsletter-email">{ar ? "البريد الإلكتروني" : "Email address"}</label><input id="retail-newsletter-email" required type="email" autoComplete="email" maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white px-4 py-3 text-[#211b16] outline-none" placeholder={ar ? "البريد الإلكتروني" : "Email address"}/><button disabled={state === "sending"} className="rounded-xl bg-[#c4a36e] px-5 py-3 font-semibold text-[#2b1721] disabled:opacity-60">{state === "sending" ? (ar ? "جارٍ الاشتراك…" : "Joining…") : (ar ? "اشترك" : "Join the list")}</button></form>
      </div>{state === "done" && <p className="mt-4 text-sm text-[#d5b783]" role="status">{ar ? "تحقق من بريدك الإلكتروني لتأكيد الاشتراك." : "Check your email to confirm your subscription."}</p>}{state === "error" && <p className="mt-4 text-sm text-red-300" role="alert">{ar ? "تعذر الاشتراك الآن. حاول مرة أخرى." : "We could not subscribe you. Please try again."}</p>}
    </div>
  </section>;
}
