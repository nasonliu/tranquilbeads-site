"use client";

import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Save, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";

import type { HomepageConfig } from "@/src/lib/retail/homepage-config";
import type { AdminLocale } from "../admin-locale";
import { AdminShell } from "../ui";

type Row = Record<string, unknown>;
type PageRecord = { draft: HomepageConfig; published: HomepageConfig; version: number; publishedVersion: number | null; updatedAt: string | null; publishedAt: string | null };

const copy = {
  en: {
    title: "Page management", subtitle: "Replace the homepage images and featured products without editing code. Save a draft first, review it here, then publish when ready.",
    home: "Homepage", draft: "Draft", published: "Published", unsaved: "Unsaved edits", unpublished: "Draft is ready to publish", live: "Live version is current", save: "Save draft", publish: "Publish homepage", open: "Open live homepage",
    hero: "Hero", heroHelp: "The first image and message customers see.", cards: "Shopping cards", cardsHelp: "Three visual entry points below the hero.", products: "Featured products", productsHelp: "Choose up to five published products. Drag-free arrows control the order.",
    english: "English", arabic: "Arabic", titleLabel: "Title", body: "Description", image: "Image", alt: "Image description", primary: "Primary button", secondary: "Secondary button", label: "Button label", link: "Destination", action: "Card action", upload: "Upload replacement", uploading: "Uploading…", remove: "Remove", selected: "Selected", available: "Available products", saved: "Draft saved.", publishedOk: "Homepage published.", failed: "Could not complete the request.", loading: "Loading page settings…", choose: "Select", maximum: "You can select no more than five products.", noProducts: "No published products with images are available yet.", preview: "Draft preview", card: "Card", publishConfirm: "Publish this draft to the customer-facing homepage?",
  },
  zh: {
    title: "页面管理", subtitle: "无需改代码即可替换首页图片和推荐商品。先保存草稿，在这里检查，再发布到顾客首页。",
    home: "首页", draft: "草稿", published: "已发布", unsaved: "有尚未保存的修改", unpublished: "草稿已保存，等待发布", live: "当前草稿已发布", save: "保存草稿", publish: "发布首页", open: "打开正式首页",
    hero: "首页主视觉", heroHelp: "顾客进入首页首先看到的图片和文案。", cards: "首页导购卡片", cardsHelp: "主视觉下方的三个图片入口。", products: "首页推荐商品", productsHelp: "最多选择五款已发布商品，使用箭头调整显示顺序。",
    english: "英文", arabic: "阿拉伯语", titleLabel: "标题", body: "说明", image: "图片", alt: "图片说明", primary: "主按钮", secondary: "次按钮", label: "按钮文字", link: "跳转地址", action: "卡片按钮", upload: "上传替换图片", uploading: "正在上传…", remove: "移除", selected: "已选择", available: "可选商品", saved: "草稿已保存。", publishedOk: "首页已发布。", failed: "操作失败，请重试。", loading: "正在加载页面设置…", choose: "选择", maximum: "最多只能选择五款商品。", noProducts: "目前没有带图片的已发布商品。", preview: "草稿预览", card: "卡片", publishConfirm: "确认把当前草稿发布到顾客首页吗？",
  },
} as const;

async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(String(result.error ?? "request_failed"));
  return result as Row;
}

function storedLocale(): AdminLocale {
  return typeof window !== "undefined" && localStorage.getItem("retail_admin_locale") === "zh" ? "zh" : "en";
}

function productImage(product: Row) {
  const images = Array.isArray(product.images) ? product.images as Row[] : [];
  return String(images[0]?.url ?? "");
}

export function HomepageAdmin() {
  const [locale, setLocale] = useState<AdminLocale>(storedLocale);
  const t = copy[locale];
  const [page, setPage] = useState<PageRecord>();
  const [draft, setDraft] = useState<HomepageConfig>();
  const [products, setProducts] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"save" | "publish" | "upload" | "">("");

  const load = useCallback(async () => {
    setMessage("");
    const [pageResult, productResult] = await Promise.all([api("/api/admin/retail/pages/home"), api("/api/admin/retail/products")]);
    const nextPage = pageResult.page as PageRecord;
    setPage(nextPage);
    setDraft(nextPage.draft);
    setProducts(((productResult.products as Row[] | undefined) ?? []).filter((product) => product.status === "published" && productImage(product)));
  }, []);

  useEffect(() => { void load().catch(() => setMessage(t.failed)); }, [load, t.failed]);
  const changeLocale = (next: AdminLocale) => { localStorage.setItem("retail_admin_locale", next); setLocale(next); };
  const unsaved = Boolean(page && draft && JSON.stringify(draft) !== JSON.stringify(page.draft));
  const unpublished = Boolean(page && JSON.stringify(page.draft) !== JSON.stringify(page.published));

  const setHero = (field: keyof HomepageConfig["hero"], value: unknown) => setDraft((current) => current ? ({ ...current, hero: { ...current.hero, [field]: value } }) : current);
  const setHeroLocale = (field: "imageAlt" | "title" | "body" | "primaryLabel" | "secondaryLabel", language: "en" | "ar", value: string) => setDraft((current) => current ? ({ ...current, hero: { ...current.hero, [field]: { ...current.hero[field], [language]: value } } }) : current);
  const setCard = (index: number, field: keyof HomepageConfig["edits"][number], value: unknown) => setDraft((current) => current ? ({ ...current, edits: current.edits.map((card, cardIndex) => cardIndex === index ? { ...card, [field]: value } : card) }) : current);
  const setCardLocale = (index: number, field: "title" | "body" | "action", language: "en" | "ar", value: string) => setDraft((current) => current ? ({ ...current, edits: current.edits.map((card, cardIndex) => cardIndex === index ? { ...card, [field]: { ...card[field], [language]: value } } : card) }) : current);

  const upload = async (event: ChangeEvent<HTMLInputElement>, target: "hero" | number) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy("upload"); setMessage("");
    try {
      const form = new FormData(); form.set("file", file); form.set("idempotencyKey", crypto.randomUUID());
      const response = await fetch("/api/admin/retail/pages/home/media", { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(String(result.error ?? "upload_failed"));
      const url = String(result.asset.url);
      if (target === "hero") setHero("image", url); else setCard(target, "image", url);
    } catch { setMessage(t.failed); } finally { setBusy(""); }
  };

  const save = async () => {
    if (!page || !draft) return;
    setBusy("save"); setMessage("");
    try {
      const result = await api("/api/admin/retail/pages/home", "PUT", { config: draft, expectedVersion: page.version, idempotencyKey: crypto.randomUUID() });
      const next = result.page as PageRecord; setPage(next); setDraft(next.draft); setMessage(t.saved);
    } catch (error) { setMessage(error instanceof Error && error.message === "page_version_conflict" ? `${t.failed} ${locale === "zh" ? "页面已被其他人修改，请刷新。" : "The page changed elsewhere; refresh first."}` : t.failed); }
    finally { setBusy(""); }
  };

  const publish = async () => {
    if (!page || !confirm(t.publishConfirm)) return;
    setBusy("publish"); setMessage("");
    try {
      const result = await api("/api/admin/retail/pages/home", "POST", { expectedVersion: page.version, idempotencyKey: crypto.randomUUID() });
      const next = result.page as PageRecord; setPage(next); setDraft(next.draft); setMessage(t.publishedOk);
    } catch { setMessage(t.failed); } finally { setBusy(""); }
  };

  const selectedProducts = useMemo(() => draft ? draft.featuredProductSkus.map((sku) => products.find((product) => product.sku === sku)).filter(Boolean) as Row[] : [], [draft, products]);
  const toggleProduct = (sku: string) => setDraft((current) => {
    if (!current) return current;
    const selected = current.featuredProductSkus;
    if (selected.includes(sku)) return { ...current, featuredProductSkus: selected.filter((item) => item !== sku) };
    if (selected.length >= 5) { setMessage(t.maximum); return current; }
    return { ...current, featuredProductSkus: [...selected, sku] };
  });
  const moveProduct = (index: number, direction: -1 | 1) => setDraft((current) => {
    if (!current) return current;
    const next = [...current.featuredProductSkus]; const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return { ...current, featuredProductSkus: next };
  });

  const inputClass = "mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5 text-sm";
  if (!draft || !page) return <AdminShell section="pages" locale={locale} onLocale={changeLocale} refresh={() => void load()}><main className="mx-auto max-w-7xl px-5 py-10 sm:px-8"><p role="status">{message || t.loading}</p></main></AdminShell>;

  return <AdminShell section="pages" locale={locale} onLocale={changeLocale} refresh={() => void load()}>
    <main className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
      <header className="flex flex-col gap-4 border-b border-[#dfd2c0] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs uppercase tracking-[.18em] text-[#6b7a51]">{t.home}</p><h1 className="noor-title mt-1 text-3xl">{t.title}</h1><p className="mt-2 max-w-3xl text-sm text-muted">{t.subtitle}</p></div>
        <div className="flex flex-wrap gap-2"><a className="inline-flex items-center gap-2 rounded-md border border-[#cdbda9] px-4 py-2 text-sm" href="/en" target="_blank" rel="noreferrer">{t.open}<ExternalLink size={15} /></a><button disabled={Boolean(busy) || !unsaved} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-md border border-[#8b6a45] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"><Save size={15} />{busy === "save" ? "…" : t.save}</button><button disabled={Boolean(busy) || page.version === 0 || unsaved || !unpublished} onClick={() => void publish()} className="inline-flex items-center gap-2 rounded-md bg-[#694153] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send size={15} />{busy === "publish" ? "…" : t.publish}</button></div>
      </header>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs"><span className="rounded-full bg-[#eadcc8] px-3 py-1.5">{t.draft} v{page.version}</span><span className="rounded-full bg-[#e6ecdf] px-3 py-1.5">{t.published} {page.publishedVersion ? `v${page.publishedVersion}` : "—"}</span><strong className={unsaved || unpublished ? "text-[#9b4d38]" : "text-[#4f633c]"}>{unsaved ? t.unsaved : unpublished ? t.unpublished : t.live}</strong></div>
      {message && <p className="mt-4 rounded-lg bg-[#fff8e8] px-4 py-3 text-sm" role="status">{message}</p>}

      <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-7">
          <section className="rounded-2xl border border-[#dfd2c0] bg-[#fbf7f1] p-5"><h2 className="text-xl font-semibold">{t.hero}</h2><p className="mt-1 text-sm text-muted">{t.heroHelp}</p><ImageEditor src={draft.hero.image} label={t.image} uploadLabel={busy === "upload" ? t.uploading : t.upload} onUpload={(event) => void upload(event, "hero")} />
            <div className="mt-5 grid gap-5 md:grid-cols-2"><LocalizedFields language="en" languageLabel={t.english} title={draft.hero.title.en} body={draft.hero.body.en} alt={draft.hero.imageAlt.en} t={t} inputClass={inputClass} onTitle={(value)=>setHeroLocale("title","en",value)} onBody={(value)=>setHeroLocale("body","en",value)} onAlt={(value)=>setHeroLocale("imageAlt","en",value)} /><LocalizedFields language="ar" languageLabel={t.arabic} title={draft.hero.title.ar} body={draft.hero.body.ar} alt={draft.hero.imageAlt.ar} t={t} inputClass={inputClass} onTitle={(value)=>setHeroLocale("title","ar",value)} onBody={(value)=>setHeroLocale("body","ar",value)} onAlt={(value)=>setHeroLocale("imageAlt","ar",value)} /></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2"><ButtonFields title={t.primary} label={draft.hero.primaryLabel} href={draft.hero.primaryHref} t={t} inputClass={inputClass} onLabel={(language,value)=>setHeroLocale("primaryLabel",language,value)} onHref={(value)=>setHero("primaryHref",value)} /><ButtonFields title={t.secondary} label={draft.hero.secondaryLabel} href={draft.hero.secondaryHref} t={t} inputClass={inputClass} onLabel={(language,value)=>setHeroLocale("secondaryLabel",language,value)} onHref={(value)=>setHero("secondaryHref",value)} /></div>
          </section>

          <section className="rounded-2xl border border-[#dfd2c0] bg-[#fbf7f1] p-5"><h2 className="text-xl font-semibold">{t.cards}</h2><p className="mt-1 text-sm text-muted">{t.cardsHelp}</p><div className="mt-5 space-y-6">{draft.edits.map((card,index)=><article className="rounded-xl border border-[#dfd2c0] bg-white p-4" key={index}><h3 className="font-semibold">{t.card} {index+1}</h3><ImageEditor src={card.image} label={t.image} uploadLabel={busy === "upload" ? t.uploading : t.upload} onUpload={(event)=>void upload(event,index)} /><div className="mt-4 grid gap-4 md:grid-cols-2">{(["en","ar"] as const).map((language)=><fieldset dir={language === "ar" ? "rtl" : "ltr"} className="space-y-3" key={language}><legend className="text-sm font-semibold">{language === "en" ? t.english : t.arabic}</legend><label className="block text-sm">{t.titleLabel}<input className={inputClass} value={card.title[language]} onChange={(event)=>setCardLocale(index,"title",language,event.target.value)} /></label><label className="block text-sm">{t.body}<textarea rows={3} className={inputClass} value={card.body[language]} onChange={(event)=>setCardLocale(index,"body",language,event.target.value)} /></label><label className="block text-sm">{t.action}<input className={inputClass} value={card.action[language]} onChange={(event)=>setCardLocale(index,"action",language,event.target.value)} /></label></fieldset>)}</div><label className="mt-4 block text-sm">{t.link}<input className={inputClass} value={card.href} onChange={(event)=>setCard(index,"href",event.target.value)} /></label></article>)}</div></section>

          <section className="rounded-2xl border border-[#dfd2c0] bg-[#fbf7f1] p-5"><h2 className="text-xl font-semibold">{t.products}</h2><p className="mt-1 text-sm text-muted">{t.productsHelp}</p><div className="mt-5 space-y-2"><h3 className="text-sm font-semibold">{t.selected} ({selectedProducts.length}/5)</h3>{selectedProducts.map((product,index)=><ProductRow key={String(product.sku)} product={product} selected actions={<><button aria-label="Move up" disabled={index===0} onClick={()=>moveProduct(index,-1)}><ArrowUp size={16}/></button><button aria-label="Move down" disabled={index===selectedProducts.length-1} onClick={()=>moveProduct(index,1)}><ArrowDown size={16}/></button><button className="text-xs underline" onClick={()=>toggleProduct(String(product.sku))}>{t.remove}</button></>} />)}</div><div className="mt-6 space-y-2"><h3 className="text-sm font-semibold">{t.available}</h3>{products.length ? products.map((product)=><ProductRow key={String(product.sku)} product={product} selected={draft.featuredProductSkus.includes(String(product.sku))} actions={<button className="rounded border px-3 py-1 text-xs" onClick={()=>toggleProduct(String(product.sku))}>{draft.featuredProductSkus.includes(String(product.sku)) ? t.remove : t.choose}</button>} />) : <p className="text-sm text-muted">{t.noProducts}</p>}</div></section>
        </div>

        <aside className="self-start rounded-2xl border border-[#cdbda9] bg-white p-4 xl:sticky xl:top-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#6b7a51]">{t.preview}</p><div className="mt-3 overflow-hidden rounded-xl bg-[#efe7db]"><div className="relative aspect-[4/3]"><img className="h-full w-full object-cover" src={draft.hero.image} alt="" /></div><div className="p-4"><h2 className="font-serif text-2xl">{draft.hero.title.en}</h2><p className="mt-2 text-xs text-muted">{draft.hero.body.en}</p><span className="mt-3 inline-block rounded-full bg-[#694153] px-3 py-1.5 text-xs text-white">{draft.hero.primaryLabel.en}</span></div></div><div className="mt-3 grid grid-cols-3 gap-2">{draft.edits.map((card,index)=><div className="overflow-hidden rounded-lg border" key={index}><img className="aspect-square w-full object-cover" src={card.image} alt="" /><p className="p-2 text-[10px] font-semibold leading-tight">{card.title.en}</p></div>)}</div><div className="mt-4 space-y-2">{selectedProducts.map((product)=><div className="flex items-center gap-2 text-xs" key={String(product.sku)}><img className="h-10 w-10 rounded object-cover" src={productImage(product)} alt="" /><span className="line-clamp-2">{String(product.title_en)}</span></div>)}</div></aside>
      </div>
    </main>
  </AdminShell>;
}

function ImageEditor({ src, label, uploadLabel, onUpload }: { src: string; label: string; uploadLabel: string; onUpload: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"><img className="h-28 w-full rounded-xl border border-[#dfd2c0] object-cover sm:w-40" src={src} alt="" /><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#8b6a45] bg-white px-4 py-2 text-sm font-semibold"><ImagePlus size={16}/>{uploadLabel}<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" aria-label={label} onChange={onUpload}/></label></div>;
}

function LocalizedFields({ language, languageLabel, title, body, alt, t, inputClass, onTitle, onBody, onAlt }: { language: "en"|"ar"; languageLabel: string; title: string; body: string; alt: string; t: typeof copy.en | typeof copy.zh; inputClass: string; onTitle:(value:string)=>void; onBody:(value:string)=>void; onAlt:(value:string)=>void }) {
  return <fieldset className="space-y-3" dir={language === "ar" ? "rtl" : "ltr"}><legend className="text-sm font-semibold">{languageLabel}</legend><label className="block text-sm">{t.titleLabel}<input className={inputClass} value={title} onChange={(event)=>onTitle(event.target.value)}/></label><label className="block text-sm">{t.body}<textarea rows={4} className={inputClass} value={body} onChange={(event)=>onBody(event.target.value)}/></label><label className="block text-sm">{t.alt}<input className={inputClass} value={alt} onChange={(event)=>onAlt(event.target.value)}/></label></fieldset>;
}

function ButtonFields({ title, label, href, t, inputClass, onLabel, onHref }: { title:string; label:{en:string;ar:string}; href:string; t:typeof copy.en|typeof copy.zh; inputClass:string; onLabel:(language:"en"|"ar",value:string)=>void; onHref:(value:string)=>void }) {
  return <fieldset className="rounded-xl border border-[#dfd2c0] bg-white p-4"><legend className="px-1 text-sm font-semibold">{title}</legend><label className="block text-sm">{t.label} · {t.english}<input className={inputClass} value={label.en} onChange={(event)=>onLabel("en",event.target.value)}/></label><label className="mt-3 block text-sm" dir="rtl">{t.label} · {t.arabic}<input className={inputClass} value={label.ar} onChange={(event)=>onLabel("ar",event.target.value)}/></label><label className="mt-3 block text-sm">{t.link}<input className={inputClass} value={href} onChange={(event)=>onHref(event.target.value)}/></label></fieldset>;
}

function ProductRow({ product, selected, actions }: { product: Row; selected: boolean; actions: React.ReactNode }) {
  return <div className={`flex items-center gap-3 rounded-lg border p-2 ${selected ? "border-[#8b6a45] bg-[#f1e7da]" : "border-[#dfd2c0] bg-white"}`}><img className="h-12 w-12 rounded object-cover" src={productImage(product)} alt=""/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{String(product.title_en ?? product.sku)}</p><p className="truncate text-xs text-muted">{String(product.sku)}</p></div><div className="flex items-center gap-2">{actions}</div></div>;
}
