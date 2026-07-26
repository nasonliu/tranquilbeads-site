"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { RetailCheckout, RetailCheckoutError, RetailProduct, RetailQuote, RetailShippingZone } from "@/src/data/retail/types";
import type { Locale } from "@/src/lib/i18n";

declare global {
  interface Window {
    paypal?: { Buttons: (options: { createOrder: () => Promise<string>; onApprove: (data: { orderID: string }) => Promise<void>; onCancel: () => void; onError: () => void }) => { render: (target: HTMLElement) => void } };
  }
}

const sdkLoads = new Map<string, Promise<void>>();
const cartStorageKey = "noor-retail-cart-v1";
const checkoutStorageKey = "noor-retail-checkout-v1";
const emptyCheckout = { email: "", recipient: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "", phone: "" };

export function loadRetailPaypalSdk(clientId: string, currency: string) {
  const key = `${clientId}:${currency}`;
  const cached = sdkLoads.get(key);
  if (cached) return cached;
  const scriptId = `paypal-retail-sdk-${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const promise = new Promise<void>((resolve, reject) => {
    if (window.paypal) { resolve(); return; }
    let scriptElement = document.getElementById(scriptId) as HTMLScriptElement | null;
    const onError = () => { sdkLoads.delete(key); scriptElement?.remove(); reject(new Error("paypal_sdk_failed")); };
    const onLoad = () => resolve();
    if (scriptElement) { scriptElement.addEventListener("load", onLoad, { once: true }); scriptElement.addEventListener("error", onError, { once: true }); return; }
    scriptElement = document.createElement("script");
    scriptElement.id = scriptId;
    scriptElement.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture`;
    scriptElement.async = true;
    scriptElement.addEventListener("load", onLoad, { once: true });
    scriptElement.addEventListener("error", onError, { once: true });
    document.body.append(scriptElement);
  });
  sdkLoads.set(key, promise);
  return promise;
}

type Copy = { cart: string; checkout: string; add: string; emptyCart: string; unavailable: string; quote: string; subtotal: string; shipping: string; tax: string; total: string; address: string; terms: string; termsLink: string; remove: string; decrease: string; increase: string; orderReceived: string; checkoutExpired: string; paymentFailed: string; checkoutFailed: string; required: string; orderDetails: string };
type Props = { locale: Locale; products: RetailProduct[]; zones: RetailShippingZone[]; paypalClientId?: string; currency?: string; enabled: boolean; copy: Copy };
type CheckoutFields = typeof emptyCheckout;

const formatMoney = (minor: number, currency = "USD") => `${currency} ${(minor / 100).toFixed(2)}`;

export function RetailShop({ locale, products, zones, paypalClientId, currency, enabled, copy }: Props) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState<CheckoutFields>(emptyCheckout);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [quote, setQuote] = useState<RetailQuote>();
  const [message, setMessage] = useState<string>();
  const [completedRequestId, setCompletedRequestId] = useState<string>();
  const [hydrated, setHydrated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<{ sku: string; quantity: number }>>([]);
  const checkoutRef = useRef<RetailCheckout | undefined>(undefined);
  const quoteRef = useRef<RetailQuote | undefined>(undefined);
  const requestIdRef = useRef<string | undefined>(undefined);
  const ready = enabled && products.some((product) => product.available) && Boolean(paypalClientId) && Boolean(currency);
  const items = useMemo(() => Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([sku, quantity]) => ({ sku, quantity })), [cart]);
  const selectedZone = zones.find((zone) => zone.country === checkout.country);
  const validCheckout = Boolean(checkout.email && checkout.recipient && checkout.line1 && checkout.city && checkout.postalCode && checkout.country && checkout.phone && termsAccepted && selectedZone);
  itemsRef.current = items;
  quoteRef.current = quote;

  useEffect(() => {
    try {
      const savedCart = JSON.parse(window.localStorage.getItem(cartStorageKey) ?? "{}") as Record<string, number>;
      const savedCheckout = JSON.parse(window.localStorage.getItem(checkoutStorageKey) ?? "{}") as Partial<CheckoutFields> & { termsAccepted?: boolean };
      setCart(Object.fromEntries(Object.entries(savedCart).filter(([sku, quantity]) => products.some((product) => product.sku === sku && product.available) && Number.isInteger(quantity) && quantity > 0)));
      setCheckout({ ...emptyCheckout, ...savedCheckout });
      setTermsAccepted(Boolean(savedCheckout.termsAccepted));
    } catch { /* a bad local value must never prevent shopping */ }
    setHydrated(true);
  }, [products]);

  useEffect(() => { if (hydrated) window.localStorage.setItem(cartStorageKey, JSON.stringify(cart)); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) window.localStorage.setItem(checkoutStorageKey, JSON.stringify({ ...checkout, termsAccepted })); }, [checkout, termsAccepted, hydrated]);
  useEffect(() => { setQuote(undefined); requestIdRef.current = undefined; }, [items, checkout, termsAccepted]);

  useEffect(() => {
    if (!ready || !quote || !validCheckout || !paypalClientId || !currency || items.length === 0) return;
    let cancelled = false;
    const container = containerRef.current;
    loadRetailPaypalSdk(paypalClientId, currency).then(() => {
      if (cancelled || !container || !window.paypal) return;
      container.replaceChildren();
      window.paypal.Buttons({
        createOrder: async () => {
          const currentQuote = quoteRef.current;
          const currentCheckout = checkoutRef.current;
          if (!currentQuote || !currentCheckout) throw new Error("quote_required");
          requestIdRef.current ??= crypto.randomUUID();
          const response = await fetch("/api/retail/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: requestIdRef.current, expectedTotalMinor: currentQuote.totalMinor, items: itemsRef.current, checkout: currentCheckout }) });
          const body = await response.json().catch(() => ({})) as { orderId?: string; error?: RetailCheckoutError };
          if (body.error === "checkout_expired") { requestIdRef.current = undefined; setMessage(copy.checkoutExpired); throw new Error("checkout_expired"); }
          if (!response.ok || !body.orderId) throw new Error("order_failed");
          return body.orderId;
        },
        onApprove: async ({ orderID }) => {
          const response = await fetch("/api/retail/capture", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: orderID, requestId: requestIdRef.current }) });
          const body = await response.json().catch(() => ({})) as { ok?: boolean; requestId?: string; error?: RetailCheckoutError };
          if (response.ok && body.ok) {
            const requestId = body.requestId ?? requestIdRef.current;
            setCompletedRequestId(requestId);
            requestIdRef.current = undefined;
            setCart({});
            setQuote(undefined);
            setMessage(copy.orderReceived);
          } else if (body.error === "checkout_expired") { requestIdRef.current = undefined; setMessage(copy.checkoutExpired); }
          else setMessage(copy.paymentFailed);
        },
        onCancel: () => setMessage(locale === "ar" ? "تم إلغاء الدفع. سلتك محفوظة." : "Payment cancelled. Your cart is saved."),
        onError: () => setMessage(copy.checkoutFailed),
      }).render(container);
    }).catch(() => { if (!cancelled) setMessage(copy.checkoutFailed); });
    return () => { cancelled = true; container?.replaceChildren(); };
  }, [ready, quote, validCheckout, paypalClientId, currency, items.length, locale, copy]);

  const updateQuantity = (sku: string, quantity: number) => {
    requestIdRef.current = undefined;
    setCart((current) => quantity <= 0 ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== sku)) : { ...current, [sku]: Math.min(products.find((product) => product.sku === sku)?.stock ?? 10, quantity) });
  };
  const requestQuote = async () => {
    if (!validCheckout || !items.length) { setMessage(copy.required); return; }
    const completeCheckout: RetailCheckout = { ...checkout, termsVersion: "2026-07-28", termsAccepted: true };
    checkoutRef.current = completeCheckout;
    setMessage(undefined);
    const response = await fetch("/api/retail/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items, checkout: completeCheckout }) });
    const body = await response.json().catch(() => ({})) as { ok?: boolean; quote?: RetailQuote; error?: RetailCheckoutError };
    if (response.ok && body.ok && body.quote) setQuote(body.quote);
    else { setQuote(undefined); setMessage(body.error === "checkout_expired" ? copy.checkoutExpired : copy.checkoutFailed); }
  };

  if (!ready) return <section className="noor-container"><div className="noor-panel rounded-[1.75rem] p-7 text-sm leading-7 text-muted">{copy.unavailable}</div></section>;
  return <section className="noor-container grid gap-8 lg:grid-cols-[1fr_25rem]"><div className="grid gap-5 sm:grid-cols-2">{products.filter((product) => product.available).map((product) => <article key={product.sku} className="noor-panel rounded-[1.5rem] p-5"><Image src={product.image} alt={product.name[locale]} width={640} height={640} className="aspect-square w-full rounded-xl object-cover" /><h2 className="mt-4 text-xl font-semibold">{product.name[locale]}</h2><p className="mt-2 text-sm text-muted">{product.description[locale]}</p><p className="mt-3 text-sm font-semibold">{formatMoney(product.priceMinor)}</p><p className="mt-1 text-xs text-muted">{product.stock ?? 0} {locale === "ar" ? "متاح" : "available"}</p><button type="button" aria-label={`${copy.add} ${product.name[locale]}`} onClick={() => updateQuantity(product.sku, (cart[product.sku] ?? 0) + 1)} className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">{copy.add}</button></article>)}</div><aside className="noor-panel h-fit rounded-[1.5rem] p-6"><h2 className="text-xl font-semibold">{copy.cart}</h2>{items.length === 0 ? <p className="mt-3 text-sm text-muted">{copy.emptyCart}</p> : <><ul className="mt-4 space-y-3 text-sm" aria-label={copy.cart}>{items.map((item) => { const product = products.find((entry) => entry.sku === item.sku)!; return <li key={item.sku} className="border-b border-black/10 pb-3"><div className="flex justify-between gap-3"><span>{product.name[locale]}</span><span>{formatMoney(product.priceMinor * item.quantity)}</span></div><div className="mt-2 flex items-center gap-2"><button type="button" aria-label={`${copy.decrease} ${product.name[locale]}`} onClick={() => updateQuantity(item.sku, item.quantity - 1)} className="rounded border px-2">−</button><span aria-label={`${product.name[locale]} quantity`}>{item.quantity}</span><button type="button" aria-label={`${copy.increase} ${product.name[locale]}`} onClick={() => updateQuantity(item.sku, item.quantity + 1)} className="rounded border px-2">+</button><button type="button" aria-label={`${copy.remove} ${product.name[locale]}`} onClick={() => updateQuantity(item.sku, 0)} className="ml-auto text-muted underline">{copy.remove}</button></div></li>; })}</ul><CheckoutForm checkout={checkout} zones={zones} locale={locale} copy={copy} termsAccepted={termsAccepted} onField={(field, value) => setCheckout((current) => ({ ...current, [field]: value }))} onTerms={setTermsAccepted} /><button type="button" onClick={requestQuote} className="mt-5 w-full rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent">{copy.quote}</button>{quote && <QuoteBreakdown quote={quote} copy={copy} />}{quote && <div ref={containerRef} className="mt-5" aria-label={copy.checkout} />}</>}{message && <p role="status" className="mt-4 text-sm text-muted">{message}</p>}{completedRequestId && <Link href={`/${locale}/shop/order/${encodeURIComponent(completedRequestId)}`} className="mt-4 inline-block text-sm font-semibold underline">{copy.orderDetails}</Link>}</aside></section>;
}

function CheckoutForm({ checkout, zones, locale, copy, termsAccepted, onField, onTerms }: { checkout: CheckoutFields; zones: RetailShippingZone[]; locale: Locale; copy: Copy; termsAccepted: boolean; onField: (field: keyof CheckoutFields, value: string) => void; onTerms: (accepted: boolean) => void }) {
  const labels: Array<[keyof CheckoutFields, string, boolean]> = [["email", "Email", true], ["recipient", locale === "ar" ? "المستلم" : "Recipient", true], ["line1", locale === "ar" ? "العنوان" : "Address line 1", true], ["line2", locale === "ar" ? "العنوان 2" : "Address line 2", false], ["city", locale === "ar" ? "المدينة" : "City", true], ["region", locale === "ar" ? "المنطقة" : "Region", false], ["postalCode", locale === "ar" ? "الرمز البريدي" : "Postal code", true], ["phone", locale === "ar" ? "الهاتف" : "Phone", true]];
  return <fieldset className="mt-6 space-y-3"><legend className="font-semibold">{copy.address}</legend>{labels.slice(0, 6).map(([field, label, required]) => <label key={field} className="block text-xs"><span>{label}</span><input required={required} type={field === "email" ? "email" : "text"} value={checkout[field]} onChange={(event) => onField(field, event.target.value)} className="mt-1 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-sm" /></label>)}<label className="block text-xs"><span>{locale === "ar" ? "الدولة" : "Country"}</span><select required value={checkout.country} onChange={(event) => onField("country", event.target.value)} className="mt-1 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-sm"><option value="">{locale === "ar" ? "اختر الدولة" : "Select country"}</option>{zones.map((zone) => <option key={zone.country} value={zone.country}>{zone.name[locale]}</option>)}</select></label>{labels.slice(6).map(([field, label, required]) => <label key={field} className="block text-xs"><span>{label}</span><input required={required} type="text" value={checkout[field]} onChange={(event) => onField(field, event.target.value)} className="mt-1 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-sm" /></label>)}<label className="flex gap-2 text-xs"><input type="checkbox" checked={termsAccepted} onChange={(event) => onTerms(event.target.checked)} /><span>{copy.terms} <a href={`/${locale}/terms`} className="underline">{copy.termsLink}</a></span></label></fieldset>;
}

function QuoteBreakdown({ quote, copy }: { quote: RetailQuote; copy: Copy }) { return <dl className="mt-5 space-y-2 border-y border-black/10 py-4 text-sm"><div className="flex justify-between"><dt>{copy.subtotal}</dt><dd>{formatMoney(quote.subtotalMinor, quote.currency)}</dd></div><div className="flex justify-between"><dt>{copy.shipping}</dt><dd>{formatMoney(quote.shippingMinor, quote.currency)}</dd></div><div className="flex justify-between"><dt>{copy.tax}</dt><dd>{formatMoney(quote.taxMinor, quote.currency)}</dd></div><div className="flex justify-between font-semibold"><dt>{copy.total}</dt><dd>{formatMoney(quote.totalMinor, quote.currency)}</dd></div></dl>; }
