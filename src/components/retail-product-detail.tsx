"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { RetailLocale, RetailProduct, RetailProductStyle, RetailProductVariant } from "@/src/data/retail/types";

const cartStorageKey = "noor-retail-cart-v1";

type Props = { locale: RetailLocale; product: RetailProduct; images: string[] };

const money = (amount: number) => `USD ${(amount / 100).toFixed(2)}`;
const localized = (locale: RetailLocale, value: { en: string; ar: string; zh?: string }) => value[locale] ?? value.en;

function label(locale: RetailLocale) {
  return locale === "zh" ? {
    back: "返回商店", style: "款式（SKC）", options: "规格（SKU）", sku: "SKU", stock: "可售库存", unavailable: "暂时缺货", choose: "请选择完整规格", add: "加入购物车", added: "已加入购物车", gallery: "商品图库",
  } : locale === "ar" ? {
    back: "العودة إلى المتجر", style: "الطراز (SKC)", options: "المواصفات (SKU)", sku: "SKU", stock: "المخزون المتاح", unavailable: "غير متوفر حالياً", choose: "اختر كل المواصفات", add: "أضف إلى السلة", added: "تمت الإضافة إلى السلة", gallery: "معرض المنتج",
  } : {
    back: "Back to shop", style: "Style (SKC)", options: "Specifications (SKU)", sku: "SKU", stock: "Available stock", unavailable: "Out of stock", choose: "Choose all specifications", add: "Add to cart", added: "Added to cart", gallery: "Product gallery",
  };
}

function stylesFor(product: RetailProduct): RetailProductStyle[] {
  const unique = new Map<string, RetailProductStyle>();
  product.variants?.forEach((variant) => {
    if (variant.style && !unique.has(variant.style.publicId)) unique.set(variant.style.publicId, variant.style);
  });
  return [...unique.values()].sort((a, b) => a.position - b.position || a.code.localeCompare(b.code));
}

function selectedVariant(variants: RetailProductVariant[], values: Record<string, string>) {
  const keys = [...new Set(variants.flatMap((variant) => Object.keys(variant.options)))];
  if (variants.length === 1) return variants[0];
  if (!keys.length) return variants.find((variant) => values.__variantSku === variant.sku);
  return variants.find((variant) => keys.every((key) => values[key] === variant.options[key]));
}

export function RetailProductDetail({ locale, product, images }: Props) {
  const copy = label(locale);
  const styles = useMemo(() => stylesFor(product), [product]);
  const [styleId, setStyleId] = useState(styles[0]?.publicId ?? "");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const variants = useMemo(() => (product.variants ?? []).filter((variant) => !styleId || variant.style?.publicId === styleId), [product.variants, styleId]);
  const optionKeys = useMemo(() => [...new Set(variants.flatMap((variant) => Object.keys(variant.options)))], [variants]);
  const selected = selectedVariant(variants, choices);
  const display = selected ?? variants.find((variant) => variant.available) ?? variants[0];

  useEffect(() => { setChoices({}); }, [styleId]);
  useEffect(() => {
    const image = styles.find((style) => style.publicId === styleId)?.image;
    const index = image ? images.indexOf(image) : -1;
    if (index >= 0) setImageIndex(index);
  }, [images, styleId, styles]);

  function choose(key: string, value: string) {
    setAdded(false);
    setChoices((current) => ({ ...current, [key]: value }));
  }

  function addToCart() {
    if (!selected?.available) return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(cartStorageKey) ?? "{}") as Record<string, number>;
      const next = Math.min(selected.stock, Math.max(0, Number(stored[selected.sku] ?? 0)) + 1);
      window.localStorage.setItem(cartStorageKey, JSON.stringify({ ...stored, [selected.sku]: next }));
      setAdded(true);
    } catch { /* storage failure must not prevent the rest of the PDP */ }
  }

  const selectedStyle = styles.find((style) => style.publicId === styleId);
  return <main className="noor-container py-8 md:py-12">
    <Link href={`/${locale}/shop`} className="text-sm font-medium text-accent hover:underline">← {copy.back}</Link>
    <div className="mt-6 grid gap-9 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
      <section aria-label={copy.gallery}>
        {images[imageIndex] ? <Image src={images[imageIndex]} alt={localized(locale, product.name)} width={1000} height={1000} priority className="aspect-square w-full rounded-[1.75rem] object-cover" /> : null}
        {images.length > 1 ? <div className="mt-3 grid grid-cols-5 gap-2">{images.map((image, index) => <button key={image} type="button" onClick={() => setImageIndex(index)} aria-current={index === imageIndex} aria-label={`${copy.gallery} ${index + 1}`} className="overflow-hidden rounded-lg border border-black/10 aria-[current=true]:border-accent"><Image src={image} alt="" width={160} height={160} className="aspect-square w-full object-cover" /></button>)}</div> : null}
      </section>
      <section className="noor-panel h-fit rounded-[1.75rem] p-6 md:p-8">
        {selectedStyle ? <p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">{copy.style}: {selectedStyle.code}</p> : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{localized(locale, product.name)}</h1>
        <p className="mt-4 whitespace-pre-line leading-7 text-muted">{localized(locale, product.description)}</p>
        <p className="mt-6 text-2xl font-semibold">{display ? money(display.priceMinor) : "—"}</p>

        {styles.length > 1 ? <fieldset className="mt-7"><legend className="text-sm font-semibold">{copy.style}</legend><div className="mt-2 flex flex-wrap gap-2">{styles.map((style) => <button key={style.publicId} type="button" onClick={() => setStyleId(style.publicId)} aria-pressed={style.publicId === styleId} className="rounded-full border border-black/15 px-4 py-2 text-sm aria-[pressed=true]:border-accent aria-[pressed=true]:bg-accent aria-[pressed=true]:text-white">{localized(locale, style.name)}</button>)}</div></fieldset> : null}
        {optionKeys.length > 0 ? <fieldset className="mt-7 space-y-4"><legend className="text-sm font-semibold">{copy.options}</legend>{optionKeys.map((key) => <div key={key}><p className="text-xs text-muted">{key}</p><div className="mt-2 flex flex-wrap gap-2">{[...new Set(variants.map((variant) => variant.options[key]).filter(Boolean))].map((value) => <button key={value} type="button" onClick={() => choose(key, value)} aria-pressed={choices[key] === value} className="rounded-full border border-black/15 px-4 py-2 text-sm aria-[pressed=true]:border-accent aria-[pressed=true]:bg-accent aria-[pressed=true]:text-white">{value}</button>)}</div></div>)}</fieldset> : variants.length > 1 ? <fieldset className="mt-7"><legend className="text-sm font-semibold">{copy.options}</legend><div className="mt-2 flex flex-wrap gap-2">{variants.map((variant) => <button key={variant.sku} type="button" onClick={() => choose("__variantSku", variant.sku)} aria-pressed={choices.__variantSku === variant.sku} className="rounded-full border border-black/15 px-4 py-2 text-sm aria-[pressed=true]:border-accent aria-[pressed=true]:bg-accent aria-[pressed=true]:text-white">{localized(locale, variant.name)}</button>)}</div></fieldset> : null}
        <div className="mt-7 border-t border-black/10 pt-5 text-sm"><p><span className="text-muted">{copy.sku}: </span>{selected?.sku ?? "—"}</p><p className="mt-1"><span className="text-muted">{copy.stock}: </span>{selected ? selected.stock : "—"}</p></div>
        <button type="button" disabled={!selected?.available} onClick={addToCart} className="mt-6 w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{selected ? selected.available ? added ? copy.added : copy.add : copy.unavailable : copy.choose}</button>
      </section>
    </div>
  </main>;
}
