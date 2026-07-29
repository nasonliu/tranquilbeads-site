"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { RetailCheckout, RetailCheckoutError, RetailProduct, RetailProductVariant, RetailQuote, RetailShippingZone } from "@/src/data/retail/types";
import { getRetailCopy } from "@/src/data/retail/copy";
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

export function loadRetailPaypalSdk(clientId: string, currency: string, locale: Locale = "en") {
  const paypalLocale = locale === "zh" ? "zh_CN" : locale === "ar" ? "ar_EG" : "en_US";
  const key = `${clientId}:${currency}:${paypalLocale}`;
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
    scriptElement.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture&locale=${paypalLocale}`;
    scriptElement.async = true;
    scriptElement.addEventListener("load", onLoad, { once: true });
    scriptElement.addEventListener("error", onError, { once: true });
    document.body.append(scriptElement);
  });
  sdkLoads.set(key, promise);
  return promise;
}

type Copy = ReturnType<typeof getRetailCopy>;
type Props = { locale: Locale; products: RetailProduct[]; zones: RetailShippingZone[]; paypalClientId?: string; currency?: string; enabled: boolean; copy: Copy };
type CheckoutFields = typeof emptyCheckout;
type CartItem = { variantSku: string; quantity: number };

const formatMoney = (minor: number, currency = "USD") => `${currency} ${(minor / 100).toFixed(2)}`;
const localized = (locale: Locale, text: { en: string; ar: string; zh?: string }) => text[locale] ?? text.en;

function v3Copy(locale: Locale) {
  return locale === "zh" ? {
    variants: "款式与规格", choose: "请选择规格", outOfStock: "缺货", promotion: "优惠码", applyPromotion: "应用优惠", discount: "优惠", applied: "已应用", promotionInvalid: "该优惠码不可用，请检查后重试。",
  } : locale === "ar" ? {
    variants: "الخيارات", choose: "اختر الخيارات", outOfStock: "غير متوفر", promotion: "رمز الخصم", applyPromotion: "تطبيق الرمز", discount: "الخصم", applied: "تم التطبيق", promotionInvalid: "رمز الخصم غير متاح. تحقق منه وحاول مجددًا.",
  } : {
    variants: "Variants", choose: "Choose options", outOfStock: "Out of stock", promotion: "Promotion code", applyPromotion: "Apply code", discount: "Discount", applied: "Applied", promotionInvalid: "This promotion code is not available. Check it and try again.",
  };
}

function variantsFor(product: RetailProduct): RetailProductVariant[] {
  // Catalogs not yet migrated keep a default variant equal to the legacy SKU.
  // This also makes a persisted legacy cart key safe to migrate in the browser.
  return product.variants?.length ? product.variants : [{ sku: product.sku, name: product.name, options: {}, priceMinor: product.priceMinor, available: product.available, stock: product.stock ?? 0 }];
}

function selectedVariant(product: RetailProduct, selections: Record<string, string>) {
  const variants = variantsFor(product);
  if (variants.length === 1) return variants[0];
  const keys = [...new Set(variants.flatMap((variant) => Object.keys(variant.options)))];
  if (!keys.length) return variants.find((variant) => selections.__variantSku === variant.sku);
  return variants.find((variant) => keys.every((key) => selections[key] === variant.options[key]));
}

export function RetailShop({ locale, products, zones, paypalClientId, currency, enabled, copy }: Props) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [choices, setChoices] = useState<Record<string, Record<string, string>>>({});
  const [checkout, setCheckout] = useState<CheckoutFields>(emptyCheckout);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [promotionCode, setPromotionCode] = useState("");
  const [quote, setQuote] = useState<RetailQuote>();
  const [message, setMessage] = useState<string>();
  const [completedRequestId, setCompletedRequestId] = useState<string>();
  const [hydrated, setHydrated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<CartItem[]>([]);
  const checkoutRef = useRef<RetailCheckout | undefined>(undefined);
  const quoteRef = useRef<RetailQuote | undefined>(undefined);
  const promotionCodeRef = useRef("");
  const requestIdRef = useRef<string | undefined>(undefined);
  const labels = useMemo(() => v3Copy(locale), [locale]);
  const allVariants = useMemo(() => products.flatMap((product) => variantsFor(product).map((variant) => ({ product, variant }))), [products]);
  const ready = enabled && allVariants.some(({ variant }) => variant.available) && Boolean(paypalClientId) && Boolean(currency);
  const items = useMemo(() => Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([variantSku, quantity]) => ({ variantSku, quantity })), [cart]);
  const selectedZone = zones.find((zone) => zone.country === checkout.country);
  const validCheckout = Boolean(checkout.email && checkout.recipient && checkout.line1 && checkout.city && checkout.postalCode && checkout.country && checkout.phone && termsAccepted && selectedZone);
  itemsRef.current = items;
  quoteRef.current = quote;
  promotionCodeRef.current = promotionCode.trim();

  useEffect(() => {
    try {
      const savedCart = JSON.parse(window.localStorage.getItem(cartStorageKey) ?? "{}") as Record<string, number>;
      const available = new Map(allVariants.filter(({ variant }) => variant.available).map(({ variant }) => [variant.sku, variant.stock]));
      // V3's backfill gives the default variant the old product SKU, so this
      // accepts old carts without ever translating a browser price.
      setCart(Object.fromEntries(Object.entries(savedCart).flatMap(([variantSku, quantity]) => {
        const stock = available.get(variantSku);
        return Number.isInteger(quantity) && quantity > 0 && stock !== undefined ? [[variantSku, Math.min(stock, quantity)]] : [];
      })));
    } catch { /* a bad local value must never prevent shopping */ }
    try { window.localStorage.removeItem(checkoutStorageKey); } catch { /* storage can be unavailable */ }
    setHydrated(true);
  }, [allVariants]);

  useEffect(() => { if (hydrated) window.localStorage.setItem(cartStorageKey, JSON.stringify(cart)); }, [cart, hydrated]);
  useEffect(() => { setQuote(undefined); requestIdRef.current = undefined; }, [items, checkout, termsAccepted, promotionCode]);

  useEffect(() => {
    if (!ready || !quote || !validCheckout || !paypalClientId || !currency || items.length === 0) return;
    let cancelled = false;
    const container = containerRef.current;
    loadRetailPaypalSdk(paypalClientId, currency, locale).then(() => {
      if (cancelled || !container || !window.paypal) return;
      container.replaceChildren();
      window.paypal.Buttons({
        createOrder: async () => {
          const currentQuote = quoteRef.current;
          const currentCheckout = checkoutRef.current;
          if (!currentQuote || !currentCheckout) throw new Error("quote_required");
          requestIdRef.current ??= crypto.randomUUID();
          const response = await fetch("/api/retail/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: requestIdRef.current, expectedTotalMinor: currentQuote.totalMinor, items: itemsRef.current, checkout: currentCheckout, ...(promotionCodeRef.current ? { promotionCode: promotionCodeRef.current } : {}) }) });
          const body = await response.json().catch(() => ({})) as { orderId?: string; error?: string };
          if (body.error === "checkout_expired") { requestIdRef.current = undefined; setMessage(copy.checkoutExpired); throw new Error("checkout_expired"); }
          if (body.error === "quote_changed" || body.error === "promotion_exhausted" || body.error === "promotion_unavailable") { requestIdRef.current = undefined; setMessage(body.error === "quote_changed" ? copy.checkoutExpired : labels.promotionInvalid); throw new Error("quote_changed"); }
          if (!response.ok || !body.orderId) throw new Error("order_failed");
          return body.orderId;
        },
        onApprove: async ({ orderID }) => {
          const response = await fetch("/api/retail/capture", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: orderID, requestId: requestIdRef.current }) });
          const body = await response.json().catch(() => ({})) as { ok?: boolean; requestId?: string; error?: RetailCheckoutError };
          if (response.ok && body.ok) {
            const requestId = body.requestId ?? requestIdRef.current;
            setCompletedRequestId(requestId); requestIdRef.current = undefined; setCart({}); setCheckout({ ...emptyCheckout }); setTermsAccepted(false); checkoutRef.current = undefined; setQuote(undefined); setPromotionCode(""); setMessage(copy.orderReceived);
          } else if (body.error === "checkout_expired") { requestIdRef.current = undefined; setMessage(copy.checkoutExpired); }
          else setMessage(copy.paymentFailed);
        },
        onCancel: () => { requestIdRef.current = undefined; checkoutRef.current = undefined; setCheckout({ ...emptyCheckout }); setTermsAccepted(false); setQuote(undefined); setMessage(copy.paymentCancelled); },
        onError: () => setMessage(copy.checkoutFailed),
      }).render(container);
    }).catch(() => { if (!cancelled) setMessage(copy.checkoutFailed); });
    return () => { cancelled = true; container?.replaceChildren(); };
  }, [ready, quote, validCheckout, paypalClientId, currency, items.length, locale, copy, labels]);

  const updateQuantity = (variantSku: string, quantity: number) => {
    requestIdRef.current = undefined;
    const max = allVariants.find(({ variant }) => variant.sku === variantSku)?.variant.stock ?? 0;
    setCart((current) => quantity <= 0 ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== variantSku)) : { ...current, [variantSku]: Math.min(max, quantity) });
  };
  const requestQuote = async () => {
    if (!validCheckout || !items.length) { setMessage(copy.required); return; }
    const completeCheckout: RetailCheckout = { ...checkout, termsVersion: "2026-07-28", termsAccepted: true, locale };
    checkoutRef.current = completeCheckout; setMessage(undefined);
    const response = await fetch("/api/retail/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items, checkout: completeCheckout, ...(promotionCode.trim() ? { promotionCode: promotionCode.trim() } : {}) }) });
    const body = await response.json().catch(() => ({})) as { ok?: boolean; quote?: RetailQuote; error?: string };
    if (response.ok && body.ok && body.quote) setQuote(body.quote);
    else { setQuote(undefined); setMessage(["invalid_promotion", "promotion_unavailable", "promotion_exhausted"].includes(body.error ?? "") ? labels.promotionInvalid : body.error === "checkout_expired" ? copy.checkoutExpired : copy.checkoutFailed); }
  };

  if (!ready) return <section className="noor-container"><div className="noor-panel rounded-[1.75rem] p-7 text-sm leading-7 text-muted">{copy.unavailable}</div></section>;
  return <section className="noor-container grid gap-8 lg:grid-cols-[1fr_25rem]">
    <div className="grid gap-5 sm:grid-cols-2">{products.filter((product) => variantsFor(product).some((variant) => variant.available)).map((product) => {
      const variants = variantsFor(product); const optionKeys = [...new Set(variants.flatMap((variant) => Object.keys(variant.options)))]; const titleOnlyVariants = optionKeys.length === 0 && variants.length > 1;
      const selected = selectedVariant(product, choices[product.sku] ?? {}); const display = selected ?? variants.find((variant) => variant.available) ?? variants[0];
      return <article key={product.sku} className="noor-panel rounded-[1.5rem] p-5"><Link href={`/${locale}/shop/${encodeURIComponent(product.slug ?? product.sku)}`} aria-label={`${localized(locale, product.name)} details`} className="block"><Image src={product.image} alt={localized(locale, product.name)} width={640} height={640} className="aspect-square w-full rounded-xl object-cover" /><h2 className="mt-4 text-xl font-semibold">{localized(locale, product.name)}</h2><p className="mt-2 text-sm text-muted">{localized(locale, product.description)}</p></Link>
        <p className="mt-3 text-sm font-semibold">{formatMoney(display.priceMinor)}</p><p className="mt-1 text-xs text-muted">{display.stock} {display.available ? copy.available : labels.outOfStock}</p>
        {(optionKeys.length > 0 || titleOnlyVariants) && <fieldset className="mt-4 space-y-3"><legend className="text-sm font-semibold">{labels.variants}</legend>{titleOnlyVariants ? <div className="flex flex-wrap gap-2">{variants.map((variant) => <button key={variant.sku} type="button" aria-pressed={(choices[product.sku] ?? {}).__variantSku === variant.sku} onClick={() => setChoices((current) => ({ ...current, [product.sku]: { ...(current[product.sku] ?? {}), __variantSku: variant.sku } }))} className="rounded border border-black/15 px-3 py-1 text-xs aria-[pressed=true]:border-accent aria-[pressed=true]:text-accent">{localized(locale, variant.name)}</button>)}</div> : optionKeys.map((key) => <div key={key}><span className="text-xs text-muted">{key}</span><div className="mt-1 flex flex-wrap gap-2">{[...new Set(variants.map((variant) => variant.options[key]).filter(Boolean))].map((value) => <button key={value} type="button" aria-pressed={(choices[product.sku] ?? {})[key] === value} onClick={() => setChoices((current) => ({ ...current, [product.sku]: { ...(current[product.sku] ?? {}), [key]: value } }))} className="rounded border border-black/15 px-3 py-1 text-xs aria-[pressed=true]:border-accent aria-[pressed=true]:text-accent">{value}</button>)}</div></div>)}</fieldset>}
        {selected && <p className="mt-3 text-sm">{localized(locale, selected.name)}</p>}
        <button type="button" aria-label={`${copy.add} ${localized(locale, product.name)}${selected && (variants.length > 1 || selected.sku !== product.sku) ? ` ${localized(locale, selected.name)}` : ""}`} disabled={!selected?.available} onClick={() => selected && updateQuantity(selected.sku, (cart[selected.sku] ?? 0) + 1)} className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{selected ? copy.add : labels.choose}</button>
      </article>;
    })}</div>
    <aside className="noor-panel h-fit rounded-[1.5rem] p-6"><h2 className="text-xl font-semibold">{copy.cart}</h2>{items.length === 0 ? <p className="mt-3 text-sm text-muted">{copy.emptyCart}</p> : <>
      <ul className="mt-4 space-y-3 text-sm" aria-label={copy.cart}>{items.map((item) => { const found = allVariants.find(({ variant }) => variant.sku === item.variantSku); if (!found) return null; const name = found.variant.sku === found.product.sku ? localized(locale, found.product.name) : `${localized(locale, found.product.name)} · ${localized(locale, found.variant.name)}`; return <li key={item.variantSku} className="border-b border-black/10 pb-3"><div className="flex justify-between gap-3"><span>{name}</span><span>{formatMoney(found.variant.priceMinor * item.quantity)}</span></div><div className="mt-2 flex items-center gap-2"><button type="button" aria-label={`${copy.decrease} ${name}`} onClick={() => updateQuantity(item.variantSku, item.quantity - 1)} className="rounded border px-2">−</button><span aria-label={`${name} ${copy.quantity}`}>{item.quantity}</span><button type="button" aria-label={`${copy.increase} ${name}`} onClick={() => updateQuantity(item.variantSku, item.quantity + 1)} className="rounded border px-2">+</button><button type="button" aria-label={`${copy.remove} ${name}`} onClick={() => updateQuantity(item.variantSku, 0)} className="ml-auto text-muted underline">{copy.remove}</button></div></li>; })}</ul>
      <CheckoutForm checkout={checkout} zones={zones} locale={locale} copy={copy} termsAccepted={termsAccepted} onField={(field, value) => setCheckout((current) => ({ ...current, [field]: value }))} onTerms={setTermsAccepted} />
      <label className="mt-5 block text-xs"><span>{labels.promotion}</span><div className="mt-1 flex gap-2"><input value={promotionCode} maxLength={64} onChange={(event) => setPromotionCode(event.target.value)} className="min-w-0 flex-1 rounded border border-black/15 bg-transparent px-3 py-2 text-sm" /><button type="button" onClick={requestQuote} className="rounded border px-3 py-2 text-xs">{labels.applyPromotion}</button></div></label>
      <button type="button" onClick={requestQuote} className="mt-5 w-full rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent">{copy.quote}</button>{quote && <QuoteBreakdown quote={quote} copy={copy} discountLabel={labels.discount} appliedLabel={labels.applied} />}{quote && <div ref={containerRef} className="mt-5" aria-label={copy.checkout} />}
    </>}{message && <p role="status" className="mt-4 text-sm text-muted">{message}</p>}{completedRequestId && <Link href={`/${locale}/shop/order/${encodeURIComponent(completedRequestId)}`} className="mt-4 inline-block text-sm font-semibold underline">{copy.orderDetails}</Link>}</aside>
  </section>;
}

function CheckoutForm({ checkout, zones, locale, copy, termsAccepted, onField, onTerms }: { checkout: CheckoutFields; zones: RetailShippingZone[]; locale: Locale; copy: Copy; termsAccepted: boolean; onField: (field: keyof CheckoutFields, value: string) => void; onTerms: (accepted: boolean) => void }) {
  const labels: Array<[keyof CheckoutFields, string, boolean]> = [["email", copy.email, true], ["recipient", copy.recipient, true], ["line1", copy.line1, true], ["line2", copy.line2, false], ["city", copy.city, true], ["region", copy.region, false], ["postalCode", copy.postalCode, true], ["phone", copy.phone, true]];
  return <fieldset className="mt-6 space-y-3"><legend className="font-semibold">{copy.address}</legend>{labels.slice(0, 6).map(([field, label, required]) => <label key={field} className="block text-xs"><span>{label}</span><input required={required} type={field === "email" ? "email" : "text"} value={checkout[field]} onChange={(event) => onField(field, event.target.value)} className="mt-1 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-sm" /></label>)}<label className="block text-xs"><span>{copy.country}</span><select required value={checkout.country} onChange={(event) => onField("country", event.target.value)} className="mt-1 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-sm"><option value="">{copy.selectCountry}</option>{zones.map((zone) => <option key={zone.country} value={zone.country}>{zone.name[locale] ?? zone.name.en}</option>)}</select></label>{labels.slice(6).map(([field, label, required]) => <label key={field} className="block text-xs"><span>{label}</span><input required={required} type="text" value={checkout[field]} onChange={(event) => onField(field, event.target.value)} className="mt-1 w-full rounded border border-black/15 bg-transparent px-3 py-2 text-sm" /></label>)}<label className="flex gap-2 text-xs"><input type="checkbox" checked={termsAccepted} onChange={(event) => onTerms(event.target.checked)} /><span>{copy.terms} <a href={`/${locale}/terms`} className="underline">{copy.termsLink}</a></span></label></fieldset>;
}

function QuoteBreakdown({ quote, copy, discountLabel, appliedLabel }: { quote: RetailQuote; copy: Copy; discountLabel: string; appliedLabel: string }) {
  return <dl className="mt-5 space-y-2 border-y border-black/10 py-4 text-sm"><div className="flex justify-between"><dt>{copy.subtotal}</dt><dd>{formatMoney(quote.subtotalMinor, quote.currency)}</dd></div><div className="flex justify-between"><dt>{copy.shipping}</dt><dd>{formatMoney(quote.shippingMinor, quote.currency)}</dd></div>{Boolean(quote.discountMinor) && <div className="flex justify-between"><dt>{discountLabel}{quote.promotionCode ? ` (${appliedLabel}: ${quote.promotionCode})` : ""}</dt><dd>−{formatMoney(quote.discountMinor!, quote.currency)}</dd></div>}<div className="flex justify-between"><dt>{copy.tax}</dt><dd>{formatMoney(quote.taxMinor, quote.currency)}</dd></div><div className="flex justify-between font-semibold"><dt>{copy.total}</dt><dd>{formatMoney(quote.totalMinor, quote.currency)}</dd></div></dl>;
}
