"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { addRetailCart } from "@/src/components/retail-cart";
import { RetailReferenceMoney } from "@/src/components/retail-reference-currency";
import type { RetailProduct, RetailProductVariant, RetailShippingZone } from "@/src/data/retail/types";
import type { Locale } from "@/src/lib/i18n";

export { loadRetailPaypalSdk } from "@/src/components/retail-checkout";

type Copy = {
  unavailable: string;
  add: string;
  available: string;
  filters: string;
  catalog: string;
  catalogDescription: string;
  showFilters: string;
  allProducts: string;
  clearFilters: string;
  material: string;
  beadCount: string;
  diameter: string;
  productsShown: string;
  noFilteredProducts: string;
  variants: string;
  chooseOptions: string;
  outOfStock: string;
};

export type RetailShopFacet = "material" | "beadCount" | "diameter";
export type RetailShopFilterValues = Partial<Record<RetailShopFacet, string>>;
export type RetailShopProduct = RetailProduct & { filterVariants?: RetailShopFilterValues[] };
export type RetailShopFilters = Partial<Record<RetailShopFacet, string[]>>;

const filterFacets: RetailShopFacet[] = ["material", "beadCount", "diameter"];

type Props = {
  locale: Locale;
  products: RetailShopProduct[];
  zones: RetailShippingZone[];
  paypalClientId?: string;
  currency?: "USD";
  enabled: boolean;
  copy: Copy;
  initialFilters?: RetailShopFilters;
};

const localized = (locale: Locale, text: { en: string; ar: string; zh?: string }) => text[locale] ?? text.en;

function variantsFor(product: RetailProduct): RetailProductVariant[] {
  return product.variants?.length
    ? product.variants
    : [{
        sku: product.sku,
        name: product.name,
        options: {},
        priceMinor: product.priceMinor,
        available: product.available,
        stock: product.stock ?? 0,
      }];
}

function selectedVariant(product: RetailProduct, selections: Record<string, string>) {
  const variants = variantsFor(product);
  if (variants.length === 1) return variants[0];
  const keys = [...new Set(variants.flatMap((variant) => Object.keys(variant.options)))];
  return keys.length
    ? variants.find((variant) => keys.every((key) => selections[key] === variant.options[key]))
    : variants.find((variant) => selections.__variantSku === variant.sku);
}

function cleanFilters(filters: RetailShopFilters | undefined): RetailShopFilters {
  return Object.fromEntries(
    filterFacets.map((facet) => [facet, [...new Set((filters?.[facet] ?? []).filter(Boolean))]]),
  ) as RetailShopFilters;
}

function productMatchesFilters(product: RetailShopProduct, filters: RetailShopFilters) {
  const active = filterFacets.flatMap((facet) =>
    filters[facet]?.length ? [[facet, filters[facet]!] as const] : [],
  );
  if (!active.length) return true;
  return (product.filterVariants ?? []).some((variant) =>
    active.every(([facet, values]) => typeof variant[facet] === "string" && values.includes(variant[facet]!)),
  );
}

/** Product selection only. The shared header bag owns cart review and checkout is a dedicated page. */
export function RetailShop({ locale, products, enabled, copy, initialFilters }: Props) {
  const [choices, setChoices] = useState<Record<string, Record<string, string>>>({});
  const [filters, setFilters] = useState<RetailShopFilters>(() => cleanFilters(initialFilters));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const facetValues = useMemo(
    () => Object.fromEntries(filterFacets.map((facet) => [
      facet,
      [...new Set(products.flatMap((product) =>
        product.filterVariants?.map((variant) => variant[facet]).filter((value): value is string => Boolean(value)) ?? [],
      ))].sort((a, b) => a.localeCompare(b, locale, { numeric: true })),
    ])) as Record<RetailShopFacet, string[]>,
    [locale, products],
  );

  const facetCounts = useMemo(
    () => Object.fromEntries(filterFacets.map((facet) => [
      facet,
      Object.fromEntries(facetValues[facet].map((value) => [
        value,
        products.filter((product) => product.filterVariants?.some((variant) => variant[facet] === value)).length,
      ])),
    ])) as Record<RetailShopFacet, Record<string, number>>,
    [facetValues, products],
  );

  const filteredProducts = useMemo(
    () => products.filter((product) =>
      variantsFor(product).some((variant) => variant.available) && productMatchesFilters(product, filters),
    ),
    [filters, products],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    filterFacets.forEach((facet) => {
      url.searchParams.delete(facet);
      (filters[facet] ?? []).forEach((value) => url.searchParams.append(facet, value));
    });
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [filters]);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem("noor-retail-cart-v1")) {
        window.localStorage.setItem("noor-retail-cart-v1", "{}");
      }
      window.localStorage.removeItem("noor-retail-checkout-v1");
    } catch {
      // Browser storage is optional.
    }
  }, []);

  if (!enabled) {
    return <section className="noor-container">
      <div className="noor-panel rounded-[1.75rem] p-7 text-sm leading-7 text-muted">{copy.unavailable}</div>
    </section>;
  }

  const toggle = (facet: RetailShopFacet, value: string) => setFilters((current) => ({
    ...current,
    [facet]: (current[facet] ?? []).includes(value)
      ? (current[facet] ?? []).filter((entry) => entry !== value)
      : [...(current[facet] ?? []), value],
  }));
  const hasFilters = filterFacets.some((facet) => filters[facet]?.length);
  const clearFilters = () => setFilters({});

  return <section className="noor-container">
    <div data-testid="retail-catalog-layout" className="grid items-start gap-6 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)]">
      <aside aria-label={copy.catalog}>
        <button
          type="button"
          aria-expanded={mobileFiltersOpen}
          aria-controls="retail-catalog-filters"
          onClick={() => setMobileFiltersOpen((open) => !open)}
          className="noor-panel flex w-full items-center justify-between rounded-2xl px-5 py-4 text-start font-semibold lg:hidden"
        >
          <span className="flex items-center gap-2"><SlidersHorizontal aria-hidden="true" size={18} />{copy.showFilters}</span>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent-deep">{filteredProducts.length}</span>
        </button>

        <div
          id="retail-catalog-filters"
          className={`${mobileFiltersOpen ? "mt-3 block" : "hidden"} noor-panel rounded-[1.5rem] p-5 lg:mt-0 lg:block`}
        >
          <div className="border-b border-border/80 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{copy.catalog}</h2>
                <p className="mt-1 text-xs leading-5 text-muted">{copy.catalogDescription}</p>
              </div>
              <SlidersHorizontal aria-hidden="true" className="mt-1 shrink-0 text-accent-deep" size={19} />
            </div>
            <button
              type="button"
              aria-pressed={!hasFilters}
              onClick={clearFilters}
              className="mt-4 flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-sm font-medium transition hover:bg-accent/10 aria-[pressed=true]:bg-accent/10 aria-[pressed=true]:text-accent-deep"
            >
              <span>{copy.allProducts}</span>
              <span className="text-xs text-muted">{products.length}</span>
            </button>
          </div>

          <div className="divide-y divide-border/80">
            {filterFacets.map((facet) => facetValues[facet].length ? <fieldset key={facet} className="py-5">
              <legend className="mb-2 text-sm font-semibold text-foreground">{copy[facet]}</legend>
              <div className="space-y-1">
                {facetValues[facet].map((value) => {
                  const selected = filters[facet]?.includes(value) ?? false;
                  return <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(facet, value)}
                    className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-start text-sm text-muted transition hover:bg-accent/10 hover:text-foreground aria-[pressed=true]:bg-accent/10 aria-[pressed=true]:font-semibold aria-[pressed=true]:text-accent-deep"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border bg-white group-aria-[pressed=true]:border-accent group-aria-[pressed=true]:bg-accent group-aria-[pressed=true]:text-white">
                      {selected ? <Check aria-hidden="true" size={12} strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">{value}</span>
                    <span className="text-xs font-normal text-muted">{facetCounts[facet][value]}</span>
                  </button>;
                })}
              </div>
            </fieldset> : null)}
          </div>

          {hasFilters ? <button
            type="button"
            onClick={clearFilters}
            className="w-full rounded-full border border-accent/35 px-4 py-2 text-sm font-semibold text-accent-deep transition hover:bg-accent/10"
          >
            {copy.clearFilters}
          </button> : null}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="noor-panel mb-5 rounded-2xl px-5 py-4">
          <p className="text-sm font-medium text-foreground">{copy.productsShown.replace("{count}", String(filteredProducts.length))}</p>
        </div>

        {filteredProducts.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const variants = variantsFor(product);
            const keys = [...new Set(variants.flatMap((variant) => Object.keys(variant.options)))];
            const selected = selectedVariant(product, choices[product.sku] ?? {});
            const display = selected ?? variants.find((variant) => variant.available) ?? variants[0];

            return <article key={product.sku} className="noor-panel flex h-full flex-col rounded-[1.5rem] p-4 sm:p-5">
              <Link
                href={`/${locale}/shop/${encodeURIComponent(product.slug ?? product.sku)}`}
                aria-label={`${localized(locale, product.name)} details`}
                className="block"
              >
                <div className="overflow-hidden rounded-xl bg-white">
                  <Image src={product.image} alt={localized(locale, product.name)} width={640} height={640} className="aspect-square w-full object-cover transition duration-300 hover:scale-[1.02]" />
                </div>
                <h2 className="mt-4 text-lg font-semibold leading-6 text-foreground">{localized(locale, product.name)}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{localized(locale, product.description)}</p>
              </Link>

              <div className="mt-auto pt-3">
                <p className="text-base font-semibold"><RetailReferenceMoney usdMinor={display.priceMinor} locale={locale} /></p>
                <p className="mt-1 text-xs text-muted">{display.available ? copy.available : copy.outOfStock}</p>

                {keys.length ? <fieldset className="mt-4 space-y-3">
                  <legend className="text-sm font-semibold">{copy.variants}</legend>
                  {keys.map((key) => <div key={key}>
                    <span className="text-xs text-muted">{key}</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {[...new Set(variants.map((variant) => variant.options[key]).filter(Boolean))].map((value) => <button
                        key={value}
                        type="button"
                        aria-pressed={(choices[product.sku] ?? {})[key] === value}
                        onClick={() => setChoices((current) => ({
                          ...current,
                          [product.sku]: { ...(current[product.sku] ?? {}), [key]: value },
                        }))}
                        className="rounded border border-black/15 px-3 py-1 text-xs aria-[pressed=true]:border-accent aria-[pressed=true]:text-accent"
                      >
                        {value}
                      </button>)}
                    </div>
                  </div>)}
                </fieldset> : null}

                <button
                  type="button"
                  aria-label={`${selected ? copy.add : copy.chooseOptions} ${localized(locale, product.name)}`}
                  disabled={!selected?.available}
                  onClick={() => selected && addRetailCart(selected.sku, 1, selected.stock)}
                  className="mt-4 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {selected ? copy.add : copy.chooseOptions}
                </button>
              </div>
            </article>;
          })}
        </div> : <div className="noor-panel rounded-[1.5rem] p-8 text-center text-sm text-muted">{copy.noFilteredProducts}</div>}
      </div>
    </div>
  </section>;
}
