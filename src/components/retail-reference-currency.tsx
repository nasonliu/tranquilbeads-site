"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  DEFAULT_REFERENCE_CURRENCY_SNAPSHOT,
  REFERENCE_CURRENCIES,
  formatCurrencyMinor,
  formatUsdReference,
  isReferenceCurrency,
  isReferenceCurrencySnapshot,
  type ReferenceCurrency,
  type ReferenceCurrencyLocale,
  type ReferenceCurrencySnapshot,
} from "@/src/lib/retail/reference-currency";

export const retailReferenceCurrencyStorageKey = "noor-retail-reference-currency-v1";
const preferenceEvent = "noor-retail-reference-currency-change";

type ContextValue = Readonly<{
  currency: ReferenceCurrency;
  hydrated: boolean;
  snapshot: ReferenceCurrencySnapshot;
  setCurrency: (currency: ReferenceCurrency) => void;
  formatUsdReference: (usdMinor: number, locale?: ReferenceCurrencyLocale) => ReturnType<typeof formatUsdReference>;
}>;

const fallbackContextValue: ContextValue = {
  currency: "USD",
  hydrated: false,
  snapshot: DEFAULT_REFERENCE_CURRENCY_SNAPSHOT,
  setCurrency: () => undefined,
  formatUsdReference: (usdMinor, locale = "en") => formatUsdReference(usdMinor, "USD", DEFAULT_REFERENCE_CURRENCY_SNAPSHOT, locale),
};

const ReferenceCurrencyContext = createContext<ContextValue>(fallbackContextValue);

function readStoredCurrency(): ReferenceCurrency {
  try {
    const value = window.localStorage.getItem(retailReferenceCurrencyStorageKey);
    return isReferenceCurrency(value) ? value : "USD";
  } catch {
    return "USD";
  }
}

function writeStoredCurrency(currency: ReferenceCurrency) {
  try { window.localStorage.setItem(retailReferenceCurrencyStorageKey, currency); } catch { /* preference storage is optional */ }
}

export function RetailReferenceCurrencyProvider({ children, snapshot = DEFAULT_REFERENCE_CURRENCY_SNAPSHOT, refreshUrl }: { children: ReactNode; snapshot?: ReferenceCurrencySnapshot; refreshUrl?: string }) {
  const [currency, setCurrencyState] = useState<ReferenceCurrency>("USD");
  const [hydrated, setHydrated] = useState(false);
  const [activeSnapshot, setActiveSnapshot] = useState(snapshot);

  useEffect(() => {
    const sync = () => setCurrencyState(readStoredCurrency());
    sync();
    setHydrated(true);
    window.addEventListener("storage", sync);
    window.addEventListener(preferenceEvent, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(preferenceEvent, sync); };
  }, []);

  useEffect(() => {
    if (!refreshUrl) return;
    const controller = new AbortController();
    void fetch(refreshUrl, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json() as { snapshot?: unknown };
      if (isReferenceCurrencySnapshot(body.snapshot)) setActiveSnapshot(body.snapshot);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [refreshUrl]);

  const value = useMemo<ContextValue>(() => ({
    currency,
    hydrated,
    snapshot: activeSnapshot,
    setCurrency(next) {
      if (!isReferenceCurrency(next)) return;
      setCurrencyState(next);
      writeStoredCurrency(next);
      window.dispatchEvent(new Event(preferenceEvent));
    },
    formatUsdReference(usdMinor, locale = "en") {
      return formatUsdReference(usdMinor, currency, activeSnapshot, locale);
    },
  }), [currency, hydrated, activeSnapshot]);

  return <ReferenceCurrencyContext.Provider value={value}>{children}</ReferenceCurrencyContext.Provider>;
}

export function useRetailReferenceCurrency(): ContextValue {
  return useContext(ReferenceCurrencyContext);
}

function toolbarCopy(locale: ReferenceCurrencyLocale) {
  return locale === "zh" ? {
    label: "币种",
    notice: "结账时将通过 PayPal 以 USD 完成支付。",
  } : locale === "ar" ? {
    label: "العملة",
    notice: "يتم إتمام الدفع عبر PayPal بالدولار الأمريكي عند إنهاء الطلب.",
  } : {
    label: "Currency",
    notice: "Checkout is completed in USD through PayPal.",
  };
}

export function RetailReferenceCurrencyToolbar({ locale }: { locale: ReferenceCurrencyLocale }) {
  const { currency, snapshot, setCurrency } = useRetailReferenceCurrency();
  const copy = toolbarCopy(locale);
  return <div className="noor-container pt-4">
    <section className="flex flex-col gap-2 border-b border-border/70 pb-4 text-sm md:flex-row md:items-center md:justify-end md:gap-5">
      <label className="flex items-center gap-3 font-medium">
        <span>{copy.label}</span>
        <select aria-label={copy.label} value={currency} onChange={(event) => setCurrency(event.target.value as ReferenceCurrency)} className="rounded-lg border border-black/15 bg-transparent px-3 py-2">
          {REFERENCE_CURRENCIES.map((item) => <option key={item} value={item} disabled={!snapshot.rateMicros[item]}>{item}</option>)}
        </select>
      </label>
      <p className="text-xs leading-5 text-muted">{copy.notice}</p>
    </section>
  </div>;
}

export function RetailReferenceMoney({ usdMinor, locale, settlementFirst = false, className }: { usdMinor: number; locale: ReferenceCurrencyLocale; settlementFirst?: boolean; className?: string }) {
  const { currency, formatUsdReference: formatReference } = useRetailReferenceCurrency();
  const usd = formatCurrencyMinor(usdMinor, "USD", locale);
  const reference = currency === "USD" ? null : formatReference(usdMinor, locale);
  const primary = settlementFirst || !reference ? usd : `≈ ${reference.formatted}`;
  const secondary = reference ? settlementFirst ? `≈ ${reference.formatted}` : usd : null;
  return <span className={className}>
    <bdi dir="ltr">{primary}</bdi>
    {secondary ? <small className="ml-2 font-normal text-muted"><bdi dir="ltr">{secondary}</bdi></small> : null}
  </span>;
}
