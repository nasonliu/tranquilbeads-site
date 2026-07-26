"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { RetailCheckoutError, RetailProduct } from "@/src/data/retail/types";
import type { Locale } from "@/src/lib/i18n";

declare global { interface Window { paypal?: { Buttons: (options: { createOrder: () => Promise<string>; onApprove: (data: { orderID: string }) => Promise<void>; onError: () => void }) => { render: (target: HTMLElement) => void } } } }

const sdkLoads = new Map<string, Promise<void>>();

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
    const script = scriptElement;
    if (script) { script.addEventListener("load", onLoad, { once: true }); script.addEventListener("error", onError, { once: true }); return; }
    const created = document.createElement("script");
    scriptElement = created;
    created.id = scriptId;
    created.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture`;
    created.async = true;
    created.addEventListener("load", onLoad, { once: true });
    created.addEventListener("error", onError, { once: true });
    document.body.append(created);
  });
  sdkLoads.set(key, promise);
  return promise;
}

type Props = { locale: Locale; products: RetailProduct[]; paypalClientId?: string; currency?: string; enabled: boolean; copy: { cart: string; checkout: string; add: string; emptyCart: string; unavailable: string } };

export function RetailShop({ locale, products, paypalClientId, currency, enabled, copy }: Props) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string>();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<{ sku: string; quantity: number }>>([]);
  const requestIdRef = useRef<string | undefined>(undefined);
  const ready = enabled && products.some((product) => product.available) && Boolean(paypalClientId) && Boolean(currency);
  const items = Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([sku, quantity]) => ({ sku, quantity }));
  const totalMinor = items.reduce((total, item) => total + (products.find((product) => product.sku === item.sku)?.priceMinor ?? 0) * item.quantity, 0);
  itemsRef.current = items;

  useEffect(() => {
    if (!ready || items.length === 0 || !paypalClientId || !currency) return;
    let cancelled = false;
    const container = containerRef.current;
    loadRetailPaypalSdk(paypalClientId, currency).then(() => {
      if (cancelled || !container || !window.paypal) return;
      container.replaceChildren();
      window.paypal.Buttons({
        createOrder: async () => {
          requestIdRef.current ??= crypto.randomUUID();
          const response = await fetch("/api/retail/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: requestIdRef.current, items: itemsRef.current }) });
          const body = await response.json().catch(() => ({})) as { orderId?: string; error?: RetailCheckoutError };
          if (body.error === "checkout_expired") {
            // The hold is gone. Keep the cart so the customer can retry, but
            // never reuse the PayPal idempotency key tied to that old hold.
            requestIdRef.current = undefined;
            setMessage(locale === "ar" ? "انتهت صلاحية سلة الدفع. يرجى المحاولة مرة أخرى." : "Checkout expired. Please try again.");
            throw new Error("checkout_expired");
          }
          if (!response.ok || !body.orderId) throw new Error("order_failed");
          return body.orderId;
        },
        onApprove: async ({ orderID }) => {
          const response = await fetch("/api/retail/capture", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: orderID }) });
          if (response.ok) {
            requestIdRef.current = undefined;
            setCart({});
            setMessage(locale === "ar" ? "تم استلام الطلب." : "Order received.");
          } else {
            const body = await response.json().catch(() => ({})) as { error?: RetailCheckoutError };
            if (body.error === "checkout_expired") {
              requestIdRef.current = undefined;
              setMessage(locale === "ar" ? "انتهت صلاحية سلة الدفع. يرجى المحاولة مرة أخرى." : "Checkout expired. Please try again.");
            } else setMessage(locale === "ar" ? "تعذر إتمام الدفع." : "Payment could not be completed.");
          }
        },
        onError: () => setMessage(locale === "ar" ? "تعذر بدء الدفع." : "Checkout could not start."),
      }).render(container);
    }).catch(() => { if (!cancelled) setMessage(locale === "ar" ? "تعذر بدء الدفع." : "Checkout could not start."); });
    return () => { cancelled = true; container?.replaceChildren(); };
  }, [ready, items.length, paypalClientId, currency, locale]);

  if (!ready) return <section className="noor-container"><div className="noor-panel rounded-[1.75rem] p-7 text-sm leading-7 text-muted">{copy.unavailable}</div></section>;
  return <section className="noor-container grid gap-8 lg:grid-cols-[1fr_22rem]"><div className="grid gap-5 sm:grid-cols-2">{products.filter((product) => product.available).map((product) => <article key={product.sku} className="noor-panel rounded-[1.5rem] p-5"><Image src={product.image} alt={product.name[locale]} width={640} height={640} className="aspect-square w-full rounded-xl object-cover" /><h2 className="mt-4 text-xl font-semibold">{product.name[locale]}</h2><p className="mt-2 text-sm text-muted">{product.description[locale]}</p><p className="mt-3 text-sm font-semibold">USD {(product.priceMinor / 100).toFixed(2)}</p><p className="mt-1 text-xs text-muted">{product.stock ?? 0} {locale === "ar" ? "متاح" : "available"}</p><button type="button" onClick={() => { requestIdRef.current = undefined; setCart((current) => ({ ...current, [product.sku]: Math.min(product.stock ?? 10, (current[product.sku] ?? 0) + 1) })); }} className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">{copy.add}</button></article>)}</div><aside className="noor-panel h-fit rounded-[1.5rem] p-6"><h2 className="text-xl font-semibold">{copy.cart}</h2>{items.length === 0 ? <p className="mt-3 text-sm text-muted">{copy.emptyCart}</p> : <><ul className="mt-4 space-y-2 text-sm">{items.map((item) => <li key={item.sku}>{item.sku} × {item.quantity}</li>)}</ul><p className="mt-4 text-sm font-semibold">Total: USD {(totalMinor / 100).toFixed(2)}</p><div ref={containerRef} className="mt-5" /></>}{message && <p role="status" className="mt-4 text-sm text-muted">{message}</p>}</aside></section>;
}
