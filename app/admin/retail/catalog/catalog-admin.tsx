"use client";

import { useEffect, useState } from "react";

type AdminLocale = "en" | "zh";
type Row = Record<string, unknown>;

const copy = {
  en: {
    back: "Back to retail admin", title: "Variant catalogue", subtitle: "Manage sellable variants, independent price and inventory.", product: "Product", sku: "Variant SKU", titleEn: "Title (English)", titleAr: "Title (Arabic)", titleZh: "Title (Chinese)", options: "Options JSON (English / Arabic / Chinese)", price: "Price (USD cents)", stock: "On-hand stock", available: "available", create: "Add variant", active: "Active", archived: "Archived", status: "Status", used: "Used", save: "Save", error: "Could not save changes", noRows: "No variants yet",
  },
  zh: {
    back: "返回零售后台", title: "商品变体目录", subtitle: "管理可售变体、独立价格和库存。", product: "商品", sku: "变体 SKU", titleEn: "英文名称", titleAr: "阿拉伯文名称", titleZh: "中文名称", options: "选项 JSON（英文 / 阿拉伯文 / 中文）", price: "价格（美元分）", stock: "现货库存", available: "可售", create: "新增变体", active: "启用", archived: "停用", status: "状态", used: "已使用", save: "保存", error: "保存失败", noRows: "尚无变体",
  },
} as const;

const key = () => crypto.randomUUID();

async function api(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json();
  if (!response.ok || !json.ok) throw new Error(json.error || "request_failed");
  return json;
}

function options(value: string) {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid_options");
  return parsed;
}

function storedLocale(): AdminLocale {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem("retail_admin_locale") === "zh" ? "zh" : "en";
}

function variantStatus(value: unknown, locale: AdminLocale) {
  if (value === "active") return copy[locale].active;
  if (value === "archived") return copy[locale].archived;
  return String(value ?? "—");
}

/** @deprecated Variant management is now scoped to /products/[id]/variants. */
export function CatalogAdmin() {
  const [locale, setLocaleState] = useState<AdminLocale>("en");
  const t = copy[locale];
  const [products, setProducts] = useState<Row[]>([]);
  const [variants, setVariants] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [edits, setEdits] = useState<Record<string, { amountMinor: string; onHand: string }>>({});
  const [form, setForm] = useState({ productId: "", sku: "", titleEn: "", titleAr: "", titleZh: "", optionValues: '{"en":{},"ar":{},"zh":{}}', amountMinor: "", onHand: "0" });

  const load = async () => {
    const [productResult, variantResult] = await Promise.all([api("/api/admin/retail/products"), api("/api/admin/retail/catalog/variants")]);
    setProducts(productResult.products ?? []);
    setVariants(variantResult.variants ?? []);
  };

  useEffect(() => {
    setLocaleState(storedLocale());
    void load().catch(() => setMessage(copy[storedLocale()].error));
  }, []);

  const setLocale = (next: AdminLocale) => {
    window.localStorage.setItem("retail_admin_locale", next);
    setLocaleState(next);
  };

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      await api("/api/admin/retail/catalog/variants", "POST", {
        ...form,
        optionValues: options(form.optionValues),
        amountMinor: Number(form.amountMinor),
        onHand: Number(form.onHand),
        idempotencyKey: key(),
      });
      setForm({ ...form, sku: "", titleEn: "", titleAr: "", titleZh: "", amountMinor: "", onHand: "0" });
      await load();
    } catch {
      setMessage(t.error);
    }
  }

  async function toggle(variant: Row) {
    try {
      await api(`/api/admin/retail/catalog/variants/${variant.public_id}`, "PATCH", {
        status: variant.status === "active" ? "archived" : "active",
        idempotencyKey: key(),
      });
      await load();
    } catch {
      setMessage(t.error);
    }
  }

  function editFor(variant: Row) {
    const id = String(variant.public_id);
    return edits[id] ?? { amountMinor: String(variant.amount_minor ?? ""), onHand: String(variant.on_hand ?? "") };
  }

  async function saveVariant(variant: Row) {
    const id = String(variant.public_id);
    const edit = editFor(variant);
    try {
      await api(`/api/admin/retail/catalog/variants/${id}`, "PATCH", { amountMinor: Number(edit.amountMinor), onHand: Number(edit.onHand), idempotencyKey: key() });
      setEdits((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      await load();
    } catch {
      setMessage(t.error);
    }
  }

  return <main className="mx-auto max-w-6xl p-6 text-[#34271f]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <a className="text-sm text-[#6f4e37] underline" href="/admin/retail/overview">← {t.back}</a>
        <h1 className="mt-2 text-3xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-sm text-[#6d5c4e]">{t.subtitle}</p>
      </div>
      <button className="rounded border px-3 py-2 text-sm" onClick={() => setLocale(locale === "en" ? "zh" : "en")}>{locale === "en" ? "中文" : "English"}</button>
    </div>
    {message && <p role="alert" className="mt-4 text-red-700">{message}</p>}
    <form className="mt-6 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2" onSubmit={create}>
      <label>{t.product}<select required value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}><option value="" />{products.map((product) => <option key={String(product.public_id)} value={String(product.public_id)}>{String(product.sku)} — {String(locale === "zh" ? product.title_zh ?? product.title_en : product.title_en)}</option>)}</select></label>
      <label>{t.sku}<input required value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label>
      <label>{t.titleEn}<input required value={form.titleEn} onChange={(event) => setForm({ ...form, titleEn: event.target.value })} /></label>
      <label>{t.titleAr}<input required dir="rtl" value={form.titleAr} onChange={(event) => setForm({ ...form, titleAr: event.target.value })} /></label>
      <label>{t.titleZh}<input required value={form.titleZh} onChange={(event) => setForm({ ...form, titleZh: event.target.value })} /></label>
      <label>{t.price}<input required min="1" type="number" value={form.amountMinor} onChange={(event) => setForm({ ...form, amountMinor: event.target.value })} /></label>
      <label>{t.stock}<input required min="0" type="number" value={form.onHand} onChange={(event) => setForm({ ...form, onHand: event.target.value })} /></label>
      <label className="md:col-span-2">{t.options}<textarea required rows={3} value={form.optionValues} onChange={(event) => setForm({ ...form, optionValues: event.target.value })} /></label>
      <button className="rounded bg-[#6f4e37] px-4 py-2 text-white md:w-fit">{t.create}</button>
    </form>
    <section className="mt-8 overflow-x-auto">
      <table className="w-full text-left text-sm"><thead><tr><th>{t.sku}</th><th>{t.product}</th><th>{t.price}</th><th>{t.stock}</th><th>{t.status}</th><th /></tr></thead><tbody>
        {variants.map((variant) => {
          const id = String(variant.public_id);
          const edit = editFor(variant);
          return <tr className="border-t" key={id}>
            <td>{String(variant.sku)}<br /><span className="text-xs text-[#6d5c4e]">{String(locale === "zh" ? variant.title_zh ?? variant.title_en : variant.title_en ?? variant.title_zh)}</span></td>
            <td>{String(variant.product_sku)}</td>
            <td><input aria-label={`${String(variant.sku)} ${t.price}`} className="w-28 rounded border px-2 py-1" min="1" type="number" value={edit.amountMinor} onChange={(event) => setEdits((current) => ({ ...current, [id]: { ...edit, amountMinor: event.target.value } }))} /></td>
            <td><input aria-label={`${String(variant.sku)} ${t.stock}`} className="w-24 rounded border px-2 py-1" min={Number(variant.reserved ?? 0)} type="number" value={edit.onHand} onChange={(event) => setEdits((current) => ({ ...current, [id]: { ...edit, onHand: event.target.value } }))} /><span className="ml-2 text-xs text-[#6d5c4e]">{String(variant.available)} {t.available}</span></td>
            <td>{variantStatus(variant.status, locale)}</td>
            <td className="flex gap-2 py-2"><button className="rounded border px-2 py-1" onClick={() => void saveVariant(variant)}>{t.save}</button><button className="rounded border px-2 py-1" onClick={() => void toggle(variant)}>{variant.status === "active" ? t.archived : t.active}</button></td>
          </tr>;
        })}
        {variants.length === 0 && <tr><td colSpan={6}>{t.noRows}</td></tr>}
      </tbody></table>
    </section>
  </main>;
}
