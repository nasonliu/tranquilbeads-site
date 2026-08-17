"use client";

import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { RetailLocaleText, RetailProduct } from "@/src/data/retail/types";
import type { Locale } from "@/src/lib/i18n";
import { RetailReferenceMoney } from "@/src/components/retail-reference-currency";

export const retailCartStorageKey = "noor-retail-cart-v1";
const cartEvent = "noor-retail-cart-change";
type Cart = Record<string, number>;
type CatalogProduct = Pick<RetailProduct, "sku" | "name" | "image" | "variants">;
type CartContextValue = { cart: Cart; count: number; open: boolean; setOpen: (open: boolean) => void; setOpener: (element: HTMLElement | null) => void; opener: HTMLElement | null; update: (sku: string, quantity: number, maximum?: number) => void };
const CartContext = createContext<CartContextValue | undefined>(undefined);

function readCart(): Cart {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(retailCartStorageKey) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).flatMap(([sku, quantity]) => Number.isInteger(quantity) && Number(quantity) > 0 ? [[sku, Number(quantity)]] : []));
  } catch { return {}; }
}

export function writeRetailCart(cart: Cart) {
  try { window.localStorage.setItem(retailCartStorageKey, JSON.stringify(cart)); window.dispatchEvent(new Event(cartEvent)); } catch { /* storage is an optional convenience */ }
}

export function updateRetailCart(sku: string, quantity: number, maximum = Number.MAX_SAFE_INTEGER) {
  const cart = readCart();
  if (quantity <= 0) delete cart[sku]; else cart[sku] = Math.min(maximum, quantity);
  writeRetailCart(cart);
}

export function addRetailCart(sku: string, quantity: number, maximum = Number.MAX_SAFE_INTEGER) {
  const current = readCart()[sku] ?? 0;
  updateRetailCart(sku, current + quantity, maximum);
}

export function RetailCartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>({});
  const [open, setOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const sync = () => setCart(readCart());
    sync(); try { window.localStorage.removeItem("noor-retail-checkout-v1"); } catch { /* storage is optional */ } window.addEventListener(cartEvent, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(cartEvent, sync); window.removeEventListener("storage", sync); };
  }, []);
  const value = useMemo(() => ({ cart, count: Object.values(cart).reduce((sum, quantity) => sum + quantity, 0), open, setOpen, opener, setOpener, update: updateRetailCart }), [cart, open, opener]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useRetailCart() { return useContext(CartContext); }

function local(locale: Locale, value: RetailLocaleText) { return value[locale] ?? value.en; }
function allVariants(product: CatalogProduct) { return product.variants?.length ? product.variants : []; }

export function RetailCartButton({ locale }: { locale: Locale }) {
  const cart = useRetailCart();
  if (!cart || locale === "zh") return null;
  const text = locale === "ar" ? "سلة التسوق" : "Shopping bag";
  const countLabel = locale === "ar" ? `${cart.count} عناصر` : `${cart.count} items`;
  return <button type="button" aria-label={`${text}, ${countLabel}`} onClick={(event) => { cart.setOpener(event.currentTarget); cart.setOpen(true); }} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-white/55 text-foreground transition hover:border-accent/50">
    <ShoppingBag aria-hidden="true" size={19} />
    {cart.count ? <span aria-label={countLabel} className="absolute -right-1 -top-1 min-w-5 rounded-full bg-accent px-1 text-center text-[11px] font-bold leading-5 text-white">{cart.count}</span> : null}
  </button>;
}

export function RetailCartDrawer({ locale }: { locale: Locale }) {
  const cart = useRetailCart();
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!cart?.open || loaded) return;
    fetch("/api/retail/catalog").then((response) => response.ok ? response.json() : Promise.reject()).then((body: { products?: CatalogProduct[] }) => { setCatalog(body.products ?? []); setLoaded(true); }).catch(() => setLoaded(true));
  }, [cart?.open, loaded]);
  useEffect(() => {
    if (!cart?.open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { cart.setOpen(false); return; }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      cart.opener?.focus();
    };
  }, [cart]);
  if (!cart || locale === "zh" || !cart.open) return null;
  const entries = Object.entries(cart.cart).flatMap(([sku, quantity]) => {
    const product = catalog.find((candidate) => allVariants(candidate).some((variant) => variant.sku === sku));
    const variant = product && allVariants(product).find((candidate) => candidate.sku === sku);
    return product && variant ? [{ product, variant, quantity }] : [];
  });
  const title = locale === "ar" ? "سلة التسوق" : "Your bag";
  const empty = locale === "ar" ? "سلتك فارغة." : "Your bag is empty.";
  const checkout = locale === "ar" ? "إتمام الشراء" : "Checkout";
  return <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
    <button aria-label={locale === "ar" ? "إغلاق السلة" : "Close bag"} type="button" className="absolute inset-0 bg-black/35" onClick={() => cart.setOpen(false)} />
    <aside ref={panel} className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-panel p-6 shadow-2xl" dir={locale === "ar" ? "rtl" : undefined}>
      <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">{title}</h2><button type="button" autoFocus aria-label={locale === "ar" ? "إغلاق" : "Close"} onClick={() => cart.setOpen(false)} className="rounded-full p-2 hover:bg-black/5"><X aria-hidden="true" /></button></div>
      <ul className="mt-6 flex-1 space-y-4 overflow-y-auto" aria-live="polite">{!loaded ? <li className="text-sm text-muted">…</li> : entries.length ? entries.map(({ product, variant, quantity }) => <li key={variant.sku} className="border-b border-black/10 pb-4"><div className="flex justify-between gap-3 text-sm"><span>{local(locale, product.name)}{variant.sku !== product.sku ? ` · ${local(locale, variant.name)}` : ""}</span><RetailReferenceMoney locale={locale} usdMinor={variant.priceMinor * quantity} /></div><div className="mt-3 flex items-center gap-2"><button type="button" aria-label={locale === "ar" ? "تقليل الكمية" : "Decrease quantity"} onClick={() => cart.update(variant.sku, quantity - 1, variant.stock)} className="rounded border px-2">−</button><span>{quantity}</span><button type="button" aria-label={locale === "ar" ? "زيادة الكمية" : "Increase quantity"} onClick={() => cart.update(variant.sku, quantity + 1, variant.stock)} className="rounded border px-2">+</button><button type="button" onClick={() => cart.update(variant.sku, 0)} className="ms-auto text-xs underline">{locale === "ar" ? "إزالة" : "Remove"}</button></div></li>) : <li className="text-sm text-muted">{empty}</li>}</ul>
      <Link href={`/${locale}/shop/checkout`} onClick={() => cart.setOpen(false)} aria-disabled={!entries.length} className="mt-6 block rounded-full bg-accent px-5 py-3 text-center text-sm font-semibold text-white aria-disabled:pointer-events-none aria-disabled:opacity-50">{checkout}</Link>
    </aside>
  </div>;
}
