"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useMemo, useState } from "react";

import styles from "./retail-product-detail.module.css";
import type { RetailLocale, RetailLocaleText, RetailProduct, RetailProductStyle, RetailProductVariant } from "@/src/data/retail/types";
import { RetailReferenceMoney } from "@/src/components/retail-reference-currency";
import { addRetailCart } from "@/src/components/retail-cart";

type Props = { locale: RetailLocale; product: RetailProduct; images: string[] };

const localized = (locale: RetailLocale, value: RetailLocaleText) => value[locale] ?? value.en;

function label(locale: RetailLocale) {
  return locale === "zh" ? {
    back: "返回商店", style: "款式（SKC）", options: "规格（SKU）", sku: "SKU", stock: "可售库存", unavailable: "暂时缺货", choose: "请选择完整规格", add: "加入购物车", added: "已加入购物车", gallery: "商品图库", quantity: "数量", decrease: "减少数量", increase: "增加数量", highlights: "商品亮点", details: "商品详情与规格", trustPayment: "PayPal 安全支付", trustShipping: "透明配送政策", trustReturns: "退换货支持", assurances: "购物保障", aPlus: "更多产品故事", imageOf: "查看商品图片",
  } : locale === "ar" ? {
    back: "العودة إلى المتجر", style: "الطراز (SKC)", options: "المواصفات (SKU)", sku: "SKU", stock: "المخزون المتاح", unavailable: "غير متوفر حالياً", choose: "اختر كل المواصفات", add: "أضف إلى السلة", added: "تمت الإضافة إلى السلة", gallery: "معرض المنتج", quantity: "الكمية", decrease: "تقليل الكمية", increase: "زيادة الكمية", highlights: "أبرز المزايا", details: "التفاصيل والمواصفات", trustPayment: "دفع آمن عبر PayPal", trustShipping: "سياسة شحن واضحة", trustReturns: "دعم الاستبدال والاسترجاع", assurances: "ضمانات التسوق", aPlus: "اكتشف المزيد", imageOf: "عرض صورة المنتج",
  } : {
    back: "Back to shop", style: "Style (SKC)", options: "Specifications (SKU)", sku: "SKU", stock: "Available stock", unavailable: "Out of stock", choose: "Choose all specifications", add: "Add to cart", added: "Added to cart", gallery: "Product gallery", quantity: "Quantity", decrease: "Decrease quantity", increase: "Increase quantity", highlights: "Product highlights", details: "Details & specifications", trustPayment: "Secure payment via PayPal", trustShipping: "Clear shipping policy", trustReturns: "Returns support", assurances: "Shopping assurances", aPlus: "Discover more", imageOf: "View product image",
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
  const gallery = useMemo(() => [...new Set([...images, product.image].filter(Boolean))], [images, product.image]);
  const styleOptions = useMemo(() => stylesFor(product), [product]);
  const [styleId, setStyleId] = useState(styleOptions[0]?.publicId ?? "");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const variants = useMemo(() => (product.variants ?? []).filter((variant) => !styleId || variant.style?.publicId === styleId), [product.variants, styleId]);
  const optionKeys = useMemo(() => [...new Set(variants.flatMap((variant) => Object.keys(variant.options)))], [variants]);
  const selected = selectedVariant(variants, choices);
  const display = selected ?? variants.find((variant) => variant.available) ?? variants[0];
  const selectedStyle = styleOptions.find((style) => style.publicId === styleId);
  const purchaseQuantity = Math.max(1, Math.min(quantity, selected?.stock ?? 1));

  function chooseStyle(nextStyleId: string) {
    setStyleId(nextStyleId);
    setChoices({});
    setQuantity(1);
    setAdded(false);
    const image = styleOptions.find((style) => style.publicId === nextStyleId)?.image;
    const index = image ? gallery.indexOf(image) : -1;
    if (index >= 0) setImageIndex(index);
  }

  function choose(key: string, value: string) {
    setAdded(false);
    setChoices((current) => ({ ...current, [key]: value }));
  }

  function addToCart() {
    if (!selected?.available) return;
    try { addRetailCart(selected.sku, purchaseQuantity, selected.stock); setAdded(true); } catch { /* storage failure must not prevent the rest of the PDP */ }
  }

  return <main className="noor-container py-8 md:py-12">
    <Link href={`/${locale}/shop`} className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"><ArrowLeft aria-hidden="true" size={16} />{copy.back}</Link>
    <div className={styles.productGrid}>
      <section aria-label={copy.gallery} className={styles.gallery}>
        {gallery[imageIndex] ? <Image src={gallery[imageIndex]} alt={localized(locale, product.name)} width={1000} height={1000} priority className={styles.mainImage} /> : null}
        {gallery.length > 1 ? <div className={styles.thumbnails}>{gallery.map((image, index) => <button key={image} type="button" onClick={() => setImageIndex(index)} aria-pressed={index === imageIndex} aria-label={`${copy.imageOf} ${index + 1}`} className={styles.thumbnail}><Image src={image} alt="" width={160} height={160} className="aspect-square w-full object-cover" /></button>)}</div> : null}
      </section>
      <section className={`noor-panel ${styles.purchasePanel}`}>
        {selectedStyle ? <p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">{copy.style}: {selectedStyle.code}</p> : null}
        <h1 className="noor-title mt-2 text-3xl font-semibold md:text-5xl">{localized(locale, product.name)}</h1>
        <p className="mt-4 whitespace-pre-line leading-7 text-muted">{localized(locale, product.description)}</p>
        <p className={styles.price}>{display ? <RetailReferenceMoney usdMinor={display.priceMinor} locale={locale} /> : "—"}</p>

        {product.highlights?.length ? <section className={styles.highlights} aria-labelledby="product-highlights"><h2 id="product-highlights">{copy.highlights}</h2><ul>{product.highlights.map((highlight, index) => <li key={`${localized(locale, highlight)}-${index}`}>{localized(locale, highlight)}</li>)}</ul></section> : null}
        {styleOptions.length > 1 ? <fieldset className="mt-7"><legend className="text-sm font-semibold">{copy.style}</legend><div className="mt-2 flex flex-wrap gap-2">{styleOptions.map((style) => <button key={style.publicId} type="button" onClick={() => chooseStyle(style.publicId)} aria-pressed={style.publicId === styleId} className={styles.optionButton}>{localized(locale, style.name)}</button>)}</div></fieldset> : null}
        {optionKeys.length > 0 ? <fieldset className="mt-7 space-y-4"><legend className="text-sm font-semibold">{copy.options}</legend>{optionKeys.map((key) => <div key={key}><p className="text-xs text-muted">{key}</p><div className="mt-2 flex flex-wrap gap-2">{[...new Set(variants.map((variant) => variant.options[key]).filter(Boolean))].map((value) => <button key={value} type="button" onClick={() => choose(key, value)} aria-pressed={choices[key] === value} className={styles.optionButton}>{value}</button>)}</div></div>)}</fieldset> : variants.length > 1 ? <fieldset className="mt-7"><legend className="text-sm font-semibold">{copy.options}</legend><div className="mt-2 flex flex-wrap gap-2">{variants.map((variant) => <button key={variant.sku} type="button" onClick={() => choose("__variantSku", variant.sku)} aria-pressed={choices.__variantSku === variant.sku} className={styles.optionButton}>{localized(locale, variant.name)}</button>)}</div></fieldset> : null}
        <div className={styles.stock}><p><span className="text-muted">{copy.sku}: </span>{selected?.sku ?? "—"}</p><p className="mt-1"><span className="text-muted">{copy.stock}: </span>{selected ? selected.stock : "—"}</p></div>
        <div className={styles.purchaseControls}><div className={styles.quantity}><span id="product-quantity-label">{copy.quantity}</span><div><button type="button" aria-label={copy.decrease} onClick={() => setQuantity((current) => Math.max(1, current - 1))} disabled={!selected?.available || purchaseQuantity <= 1}><Minus aria-hidden="true" size={16} /></button><input aria-labelledby="product-quantity-label" inputMode="numeric" type="number" min="1" max={selected?.stock ?? 1} value={purchaseQuantity} disabled={!selected?.available} onChange={(event) => setQuantity(Math.max(1, Math.min(selected?.stock ?? 1, Number(event.target.value) || 1)))} /><button type="button" aria-label={copy.increase} onClick={() => setQuantity((current) => Math.min(selected?.stock ?? 1, current + 1))} disabled={!selected?.available || purchaseQuantity >= (selected?.stock ?? 0)}><Plus aria-hidden="true" size={16} /></button></div></div><button type="button" disabled={!selected?.available} onClick={addToCart} className={styles.addButton}>{selected ? selected.available ? added ? copy.added : copy.add : copy.unavailable : copy.choose}</button></div>
        <p className="sr-only" aria-live="polite">{added ? copy.added : ""}</p>
      </section>
    </div>
    <section className={styles.trust} aria-label={copy.assurances}><span className={styles.trustItem}><ShieldCheck aria-hidden="true" size={18} />{copy.trustPayment}</span><Link className={styles.trustItem} href={`/${locale}/shipping-returns`}><Truck aria-hidden="true" size={18} />{copy.trustShipping}</Link><Link className={styles.trustItem} href={`/${locale}/shipping-returns`}><RotateCcw aria-hidden="true" size={18} />{copy.trustReturns}</Link></section>
    {product.details?.length ? <section className={styles.details} aria-labelledby="product-details"><h2 id="product-details">{copy.details}</h2><dl>{product.details.map((detail, index) => <div key={`${localized(locale, detail.label)}-${index}`}><dt>{localized(locale, detail.label)}</dt><dd>{localized(locale, detail.value)}</dd></div>)}</dl></section> : null}
    {product.aPlus?.length ? <section className={styles.aPlus} aria-labelledby="product-aplus"><h2 id="product-aplus" className="noor-title text-3xl font-semibold">{copy.aPlus}</h2><div>{product.aPlus.map((section, index) => <article key={`${localized(locale, section.title)}-${index}`} className="noor-panel"><div>{section.eyebrow ? <p className="noor-kicker text-xs text-muted">{localized(locale, section.eyebrow)}</p> : null}<h3>{localized(locale, section.title)}</h3><p>{localized(locale, section.body)}</p></div>{section.image ? <Image src={section.image} alt="" width={720} height={540} className={styles.aPlusImage} /> : null}</article>)}</div></section> : null}
  </main>;
}
