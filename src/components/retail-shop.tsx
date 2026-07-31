"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { RetailProduct, RetailProductVariant, RetailShippingZone } from "@/src/data/retail/types";
import { RetailReferenceMoney } from "@/src/components/retail-reference-currency";
import type { Locale } from "@/src/lib/i18n";
import { addRetailCart } from "@/src/components/retail-cart";
export { loadRetailPaypalSdk } from "@/src/components/retail-checkout";

type Copy = { unavailable:string; add:string; available:string; filters:string; clearFilters:string; material:string; beadCount:string; diameter:string; productsShown:string; noFilteredProducts:string };
export type RetailShopFacet = "material" | "beadCount" | "diameter";
export type RetailShopFilterValues = Partial<Record<RetailShopFacet, string>>;
export type RetailShopProduct = RetailProduct & { filterVariants?: RetailShopFilterValues[] };
export type RetailShopFilters = Partial<Record<RetailShopFacet, string[]>>;
const filterFacets: RetailShopFacet[] = ["material", "beadCount", "diameter"];
type Props = { locale: Locale; products: RetailShopProduct[]; zones: RetailShippingZone[]; paypalClientId?: string; currency?: "USD"; enabled: boolean; copy: Copy; initialFilters?: RetailShopFilters };

const localized = (locale: Locale, text: { en: string; ar: string; zh?: string }) => text[locale] ?? text.en;
function variantsFor(product: RetailProduct): RetailProductVariant[] { return product.variants?.length ? product.variants : [{ sku: product.sku, name: product.name, options: {}, priceMinor: product.priceMinor, available: product.available, stock: product.stock ?? 0 }]; }
function selectedVariant(product: RetailProduct, selections: Record<string, string>) {
  const variants = variantsFor(product); if (variants.length === 1) return variants[0];
  const keys = [...new Set(variants.flatMap((variant) => Object.keys(variant.options)))];
  return keys.length ? variants.find((variant) => keys.every((key) => selections[key] === variant.options[key])) : variants.find((variant) => selections.__variantSku === variant.sku);
}
function cleanFilters(filters: RetailShopFilters | undefined): RetailShopFilters { return Object.fromEntries(filterFacets.map((facet) => [facet, [...new Set((filters?.[facet] ?? []).filter(Boolean))]])) as RetailShopFilters; }
function productMatchesFilters(product: RetailShopProduct, filters: RetailShopFilters) {
  const active = filterFacets.flatMap((facet) => filters[facet]?.length ? [[facet, filters[facet]!] as const] : []); if (!active.length) return true;
  return (product.filterVariants ?? []).some((variant) => active.every(([facet, values]) => typeof variant[facet] === "string" && values.includes(variant[facet]!)));
}

/** Product selection only. The shared header bag owns cart review and checkout is a dedicated page. */
export function RetailShop({ locale, products, enabled, copy, initialFilters }: Props) {
  const [choices, setChoices] = useState<Record<string, Record<string, string>>>({});
  const [filters, setFilters] = useState<RetailShopFilters>(() => cleanFilters(initialFilters));
  const facetValues = useMemo(() => Object.fromEntries(filterFacets.map((facet) => [facet, [...new Set(products.flatMap((product) => product.filterVariants?.map((variant) => variant[facet]).filter((value): value is string => Boolean(value)) ?? []))].sort((a, b) => a.localeCompare(b, locale))])) as Record<RetailShopFacet, string[]>, [locale, products]);
  const filteredProducts = useMemo(() => products.filter((product) => variantsFor(product).some((variant) => variant.available) && productMatchesFilters(product, filters)), [filters, products]);
  useEffect(() => { const url = new URL(window.location.href); filterFacets.forEach((facet) => { url.searchParams.delete(facet); (filters[facet] ?? []).forEach((value) => url.searchParams.append(facet, value)); }); window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`); }, [filters]);
  useEffect(() => { try { if (!window.localStorage.getItem("noor-retail-cart-v1")) window.localStorage.setItem("noor-retail-cart-v1", "{}"); window.localStorage.removeItem("noor-retail-checkout-v1"); } catch { /* browser storage is optional */ } }, []);
  if (!enabled) return <section className="noor-container"><div className="noor-panel rounded-[1.75rem] p-7 text-sm leading-7 text-muted">{copy.unavailable}</div></section>;
  const toggle = (facet: RetailShopFacet, value: string) => setFilters((current) => ({ ...current, [facet]: (current[facet] ?? []).includes(value) ? (current[facet] ?? []).filter((entry) => entry !== value) : [...(current[facet] ?? []), value] }));
  const hasFilters = filterFacets.some((facet) => filters[facet]?.length);
  return <section className="noor-container">
    <section aria-label={copy.filters} className="noor-panel mb-5 rounded-[1.5rem] p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{copy.filters}</h2>{hasFilters ? <button type="button" onClick={() => setFilters({})} className="text-sm font-medium text-accent underline">{copy.clearFilters}</button> : null}</div><div className="mt-4 grid gap-4 md:grid-cols-3">{filterFacets.map((facet) => facetValues[facet].length ? <fieldset key={facet}><legend className="text-sm font-semibold">{copy[facet]}</legend><div className="mt-2 flex flex-wrap gap-2">{facetValues[facet].map((value) => <button key={value} type="button" aria-pressed={filters[facet]?.includes(value) ?? false} onClick={() => toggle(facet, value)} className="rounded-full border border-black/15 px-3 py-1 text-sm aria-[pressed=true]:border-accent aria-[pressed=true]:bg-accent aria-[pressed=true]:text-white">{value}</button>)}</div></fieldset> : null)}</div></section>
    <p className="mb-4 text-sm text-muted">{copy.productsShown.replace("{count}", String(filteredProducts.length))}</p>
    {filteredProducts.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filteredProducts.map((product) => {
      const variants = variantsFor(product); const keys = [...new Set(variants.flatMap((variant) => Object.keys(variant.options)))]; const selected = selectedVariant(product, choices[product.sku] ?? {}); const display = selected ?? variants.find((variant) => variant.available) ?? variants[0];
      return <article key={product.sku} className="noor-panel rounded-[1.5rem] p-5"><Link href={`/${locale}/shop/${encodeURIComponent(product.slug ?? product.sku)}`} aria-label={`${localized(locale, product.name)} details`} className="block"><Image src={product.image} alt={localized(locale, product.name)} width={640} height={640} className="aspect-square w-full rounded-xl object-cover" /><h2 className="mt-4 text-xl font-semibold">{localized(locale, product.name)}</h2><p className="mt-2 text-sm text-muted">{localized(locale, product.description)}</p></Link><p className="mt-3 text-sm font-semibold"><RetailReferenceMoney usdMinor={display.priceMinor} locale={locale} /></p><p className="mt-1 text-xs text-muted">{display.stock} {display.available ? copy.available : "Out of stock"}</p>
      {keys.length ? <fieldset className="mt-4 space-y-3"><legend className="text-sm font-semibold">Variants</legend>{keys.map((key) => <div key={key}><span className="text-xs text-muted">{key}</span><div className="mt-1 flex flex-wrap gap-2">{[...new Set(variants.map((variant) => variant.options[key]).filter(Boolean))].map((value) => <button key={value} type="button" aria-pressed={(choices[product.sku] ?? {})[key] === value} onClick={() => setChoices((current) => ({ ...current, [product.sku]: { ...(current[product.sku] ?? {}), [key]: value } }))} className="rounded border border-black/15 px-3 py-1 text-xs aria-[pressed=true]:border-accent aria-[pressed=true]:text-accent">{value}</button>)}</div></div>)}</fieldset> : null}
      <button type="button" aria-label={`${selected ? copy.add : "Choose options"} ${localized(locale, product.name)}`} disabled={!selected?.available} onClick={() => selected && addRetailCart(selected.sku, 1, selected.stock)} className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{selected ? copy.add : "Choose options"}</button></article>;
    })}</div> : <div className="noor-panel rounded-[1.5rem] p-6 text-sm text-muted">{copy.noFilteredProducts}</div>}
  </section>;
}
