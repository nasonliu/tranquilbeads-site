"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useRetailCart } from "@/src/components/retail-cart";
import { RetailReferenceMoney } from "@/src/components/retail-reference-currency";
import type { RetailCheckout, RetailQuote, RetailShippingZone } from "@/src/data/retail/types";
import type { Locale } from "@/src/lib/i18n";

type PaypalButtonConfig = {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onCancel: () => void;
  onError: () => void;
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: PaypalButtonConfig) => { render: (container: HTMLElement) => void };
    };
  }
}

const paypalLoads = new Map<string, Promise<void>>();

function paypalLocale(locale: Locale) {
  if (locale === "ar") return "ar_EG";
  if (locale === "zh") return "zh_CN";
  return "en_US";
}

/**
 * Loads each exact PayPal client/currency/locale combination once. A failed
 * load is removed from both the DOM and cache so the next customer action can
 * retry it instead of being stuck behind a rejected promise.
 */
export function loadRetailPaypalSdk(clientId: string, currency: string, locale: Locale = "en") {
  const providerLocale = paypalLocale(locale);
  const key = `${clientId}:${currency}:${providerLocale}`;
  const scriptId = `paypal-retail-sdk-${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const existingLoad = paypalLoads.get(key);
  if (existingLoad) return existingLoad;

  const load = new Promise<void>((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");
    const fail = () => {
      paypalLoads.delete(key);
      script.remove();
      reject(new Error("paypal_sdk_failed"));
    };

    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", fail, { once: true });

    if (!existingScript) {
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture&locale=${providerLocale}`;
      script.async = true;
      document.body.append(script);
    }
  });

  paypalLoads.set(key, load);
  return load;
}

const emptyFields = {
  email: "",
  recipient: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
  phone: "",
};

const promotionErrors = new Set(["invalid_promotion", "promotion_unavailable", "promotion_exhausted"]);
function shippingZoneLabel(zone: RetailShippingZone, locale: Locale) {
  const name = zone.name[locale] ?? zone.name.en;
  if (!zone.deliveryMinDays && !zone.deliveryMaxDays) return name;
  const range = zone.deliveryMinDays === zone.deliveryMaxDays
    ? `${zone.deliveryMinDays}`
    : `${zone.deliveryMinDays ?? "?"}–${zone.deliveryMaxDays ?? "?"}`;
  const days = locale === "ar" ? `${range} أيام عمل` : locale === "zh" ? `${range} 个工作日` : `${range} business days`;
  return `${name} · ${days}`;
}
const checkoutFields = [
  { key: "email", en: "Email", ar: "البريد الإلكتروني", type: "email", autoComplete: "email" },
  { key: "recipient", en: "Recipient", ar: "اسم المستلم", type: "text", autoComplete: "name" },
  { key: "line1", en: "Address line 1", ar: "العنوان", type: "text", autoComplete: "address-line1" },
  { key: "line2", en: "Address line 2", ar: "تفاصيل إضافية للعنوان", type: "text", autoComplete: "address-line2" },
  { key: "city", en: "City", ar: "المدينة", type: "text", autoComplete: "address-level2" },
  { key: "region", en: "Region", ar: "المنطقة", type: "text", autoComplete: "address-level1" },
  { key: "postalCode", en: "Postal code", ar: "الرمز البريدي", type: "text", autoComplete: "postal-code" },
  { key: "phone", en: "Phone", ar: "رقم الهاتف", type: "tel", autoComplete: "tel" },
] as const;

function requestBody(
  items: Array<{ variantSku: string; quantity: number }>,
  checkout: RetailCheckout,
  promotionCode: string,
) {
  const code = promotionCode.trim();
  return { items, checkout, ...(code ? { promotionCode: code } : {}) };
}

export function RetailCheckoutPage({
  locale,
  zones,
  paypalClientId,
  enabled,
}: {
  locale: Locale;
  zones: RetailShippingZone[];
  paypalClientId?: string;
  enabled: boolean;
}) {
  const cart = useRetailCart();
  const router = useRouter();
  const [fields, setFields] = useState(emptyFields);
  const [terms, setTerms] = useState(false);
  const [accountIntent, setAccountIntent] = useState<"guest" | "create_or_access">("guest");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [promotionCode, setPromotionCode] = useState("");
  const [quote, setQuote] = useState<RetailQuote>();
  const [message, setMessage] = useState("");
  const payment = useRef<HTMLDivElement>(null);
  const requestId = useRef<string | undefined>(undefined);
  const checkoutExpiredDuringOrder = useRef(false);
  const latest = useRef<{
    cart: typeof cart;
    checkout: RetailCheckout;
    items: Array<{ variantSku: string; quantity: number }>;
    promotionCode: string;
  } | undefined>(undefined);

  const isArabic = locale === "ar";
  const label = (english: string, arabic: string) => isArabic ? arabic : english;
  const items = useMemo(
    () => Object.entries(cart?.cart ?? {}).map(([variantSku, quantity]) => ({ variantSku, quantity })),
    [cart?.cart],
  );
  const checkout = useMemo<RetailCheckout>(() => ({
    ...fields,
    termsVersion: "2026-07-28",
    termsAccepted: true,
    locale,
    accountIntent,
    marketingConsent,
  }), [accountIntent, fields, locale, marketingConsent]);
  const valid = Boolean(
    items.length && fields.email && fields.recipient && fields.line1 && fields.city
      && fields.postalCode && fields.phone && fields.country && terms,
  );

  latest.current = { cart, checkout, items, promotionCode };

  function resetSensitiveCheckout() {
    setFields(emptyFields);
    setTerms(false);
    setAccountIntent("guest");
    setMarketingConsent(false);
    setPromotionCode("");
    setQuote(undefined);
    requestId.current = undefined;
    payment.current?.replaceChildren();
  }

  // A quote is immutable: editing checkout inputs, cart lines, or discount
  // code requires an explicit fresh quote before a PayPal button can appear.
  useEffect(() => {
    setQuote(undefined);
    requestId.current = undefined;
  }, [checkout, items, promotionCode]);

  async function getQuote() {
    if (!valid) {
      setMessage(label(
        "Complete the delivery address and accept the terms to continue.",
        "أكمل العنوان ووافق على الشروط للمتابعة.",
      ));
      return;
    }

    try {
      const response = await fetch("/api/retail/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody(items, checkout, promotionCode)),
      });
      const body = await response.json().catch(() => ({}));

      if (response.ok && body.quote) {
        setQuote(body.quote as RetailQuote);
        setMessage("");
        return;
      }

      if (promotionErrors.has(body.error)) {
        setMessage(label(
          "This promotion code is not available. Check it and try again.",
          "رمز الخصم غير متاح. تحقق منه وحاول مجددًا.",
        ));
      } else if (body.error === "checkout_expired") {
        setMessage(label("Checkout expired. Please try again.", "انتهت صلاحية سلة الدفع. يرجى المحاولة مرة أخرى."));
      } else {
        setMessage(label("Checkout could not start.", "تعذر بدء الدفع."));
      }
    } catch {
      setMessage(label("Checkout could not start.", "تعذر بدء الدفع."));
    }
  }

  useEffect(() => {
    const node = payment.current;
    if (!quote || !valid || !paypalClientId || !enabled || !node) return;

    let disposed = false;
    loadRetailPaypalSdk(paypalClientId, "USD", locale)
      .then(() => {
        if (disposed || !window.paypal) return;

        node.replaceChildren();
        window.paypal.Buttons({
          createOrder: async () => {
            const current = latest.current;
            if (!current) throw new Error("checkout_unavailable");
            requestId.current ??= crypto.randomUUID();

            const response = await fetch("/api/retail/orders", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                requestId: requestId.current,
                expectedTotalMinor: quote.totalMinor,
                ...requestBody(current.items, current.checkout, current.promotionCode),
              }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || !body.orderId) {
              if (response.status === 410 || body.error === "checkout_expired") {
                requestId.current = undefined;
                checkoutExpiredDuringOrder.current = true;
              }
              throw new Error("order_failed");
            }
            return body.orderId as string;
          },
          onApprove: async ({ orderID }) => {
            const completedRequestId = requestId.current;
            const response = await fetch("/api/retail/capture", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ orderId: orderID, requestId: completedRequestId }),
            });
            const body = await response.json().catch(() => ({}));
            if (response.ok && body.ok === true && completedRequestId) {
              Object.keys(latest.current?.cart?.cart ?? {}).forEach((sku) => latest.current?.cart?.update(sku, 0));
              resetSensitiveCheckout();
              router.push(`/${locale}/shop/order/${completedRequestId}`);
            } else {
              setMessage(label("Payment could not be completed.", "تعذر إتمام الدفع."));
            }
          },
          onCancel: () => {
            resetSensitiveCheckout();
            setMessage(label("Payment was cancelled. Your checkout details were cleared.", "تم إلغاء الدفع ومسح بيانات إتمام الشراء."));
          },
          onError: () => {
            if (checkoutExpiredDuringOrder.current) {
              checkoutExpiredDuringOrder.current = false;
              setQuote(undefined);
              setMessage(label("Checkout expired. Please confirm the price and try again.", "انتهت صلاحية سلة الدفع. أكّد السعر وحاول مرة أخرى."));
              return;
            }
            setMessage(label("Checkout could not start.", "تعذر بدء الدفع."));
          },
        }).render(node);
      })
      .catch(() => setMessage(label("Checkout could not start.", "تعذر بدء الدفع.")));

    return () => {
      disposed = true;
      node.replaceChildren();
    };
  }, [enabled, locale, paypalClientId, quote, router, valid]);

  if (!cart) return null;

  return <main className="noor-container py-8" dir={isArabic ? "rtl" : undefined}>
    <Link className="text-sm font-medium text-accent-deep hover:underline" href={`/${locale}/shop`}>
      {isArabic ? "العودة إلى المتجر ←" : "← Back to shop"}
    </Link>
    <h1 className="noor-title mt-5 text-4xl">{label("Checkout", "إتمام الشراء")}</h1>
    {!items.length ? <p className="mt-5 text-muted">{label("Your bag is empty.", "سلتك فارغة.")}</p> : <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section className="noor-panel space-y-5 rounded-2xl p-6">
        <h2 className="text-xl font-semibold">{label("Contact and delivery", "معلومات التواصل والتوصيل")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer gap-3 rounded-xl border border-black/10 bg-white/60 p-4 text-sm">
          <input aria-label={label("Continue as guest with email", "الشراء بالبريد الإلكتروني")} type="radio" checked={accountIntent === "guest"} onChange={() => setAccountIntent("guest")} />
          {label("Continue as guest with email", "الشراء بالبريد الإلكتروني")}
        </label>
        <label className="flex cursor-pointer gap-3 rounded-xl border border-black/10 bg-white/60 p-4 text-sm">
          <input aria-label={label("Create or access an account by email", "إنشاء حساب أو الوصول إليه بالبريد الإلكتروني")} type="radio" checked={accountIntent === "create_or_access"} onChange={() => setAccountIntent("create_or_access")} />
          {label("Create or access an account by email", "إنشاء حساب أو الوصول إليه بالبريد الإلكتروني")}
        </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
        {checkoutFields.map(({ key, en, ar, type = "text", autoComplete }) => {
          const name = label(en, ar);
          return <label key={key} className="block text-sm font-medium">
            {name}
            <input
              aria-label={name}
              type={type}
              autoComplete={autoComplete}
              value={fields[key]}
              onChange={(event) => setFields((current) => ({ ...current, [key]: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 outline-none transition focus:border-accent"
            />
          </label>;
        })}
        </div>
        <label className="block text-sm font-medium">
          {label("Country", "الدولة")}
        <select aria-label={label("Country", "الدولة")} value={fields.country} onChange={(event) => setFields((current) => ({ ...current, country: event.target.value }))} className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 outline-none transition focus:border-accent">
          <option value="">{label("Select country", "اختر الدولة")}</option>
          {zones.map((zone) => <option key={zone.country} value={zone.country}>{shippingZoneLabel(zone, locale)}</option>)}
        </select>
        </label>
        <label className="flex gap-3 text-sm leading-6">
          <input aria-label={label("Email me product news and offers (optional)", "أرسل لي أخبار المنتجات والعروض عبر البريد الإلكتروني (اختياري)")} type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} />
          {label("Email me product news and offers (optional)", "أرسل لي أخبار المنتجات والعروض عبر البريد الإلكتروني (اختياري)")}
        </label>
        <label className="flex gap-3 text-sm leading-6">
          <input aria-label={label("I accept the terms of sale", "أوافق على شروط البيع")} type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} />
          {label("I accept the terms of sale", "أوافق على شروط البيع")}
        </label>
      </section>
      <aside className="noor-panel h-fit rounded-2xl p-6 lg:sticky lg:top-28">
        <h2 className="text-xl font-semibold">{label("Order summary", "ملخص الطلب")}</h2>
        <label className="mt-5 block text-sm font-medium">
          {label("Promotion code", "رمز الخصم")}
          <input aria-label={label("Promotion code", "رمز الخصم")} value={promotionCode} onChange={(event) => setPromotionCode(event.target.value)} className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 outline-none transition focus:border-accent" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="rounded-xl border border-accent/40 px-3 py-2 text-sm font-semibold text-accent-deep" type="button" onClick={getQuote}>{label("Apply", "تطبيق")}</button>
          <button className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white" type="button" onClick={getQuote}>{label("Confirm price", "تأكيد السعر")}</button>
        </div>
        {quote ? <>
          <dl className="mt-6 space-y-3 border-t border-black/10 pt-5 text-sm">
            {[
              [label("Subtotal", "المجموع الفرعي"), quote.subtotalMinor],
              [label("Shipping", "الشحن"), quote.shippingMinor],
              ...(quote.discountMinor ? [[`${label("Discount", "الخصم")}${quote.promotionCode ? ` (${quote.promotionAutomatic ? label("automatic offer", "عرض تلقائي") : quote.promotionCode})` : ""}`, -quote.discountMinor]] : []),
              [label("Tax", "الضريبة"), quote.taxMinor],
              [label("Total", "الإجمالي"), quote.totalMinor],
            ].map(([name, amount], index, rows) => <div key={String(name)} className={`flex items-center justify-between gap-4 ${index === rows.length - 1 ? "border-t border-black/10 pt-3 text-base font-semibold" : ""}`}>
              <dt>{name}</dt><dd><RetailReferenceMoney locale={locale} usdMinor={Number(amount)} settlementFirst /></dd>
            </div>)}
          </dl>
          <div ref={payment} className="mt-6 min-h-10" />
        </> : null}
      </aside>
    </div>}
    {message ? <p role="status" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{message}</p> : null}
  </main>;
}
