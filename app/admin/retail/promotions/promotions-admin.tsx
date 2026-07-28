"use client";

import { useEffect, useState } from "react";

type AdminLocale = "en" | "zh";
type Row = Record<string, unknown>;

const copy = {
  en: {
    back: "Back to retail admin", title: "Promotions", subtitle: "Create and control checkout discount codes.", code: "Code", kind: "Type", amount: "Amount", minimum: "Minimum subtotal (USD cents)", scope: "Scope JSON", starts: "Starts at", ends: "Ends at", max: "Maximum redemptions", perCustomer: "Maximum per customer", active: "Active", status: "Status", used: "Used", create: "Create promotion", disable: "Disable", enable: "Enable", error: "Could not save changes", none: "No promotions yet", percent: "Percent (basis points)", fixed: "Fixed amount", freeShipping: "Free shipping", enabled: "Enabled", disabled: "Disabled",
  },
  zh: {
    back: "返回零售后台", title: "促销管理", subtitle: "创建并管理结账优惠码。", code: "优惠码", kind: "类型", amount: "优惠金额", minimum: "最低订单金额（美元分）", scope: "适用范围 JSON", starts: "开始时间", ends: "结束时间", max: "总使用上限", perCustomer: "每位客户上限", active: "启用", status: "状态", used: "已使用", create: "创建促销", disable: "停用", enable: "启用", error: "保存失败", none: "尚无促销", percent: "百分比（基点）", fixed: "固定金额", freeShipping: "免运费", enabled: "已启用", disabled: "已停用",
  },
} as const;

const id = () => crypto.randomUUID();

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

function storedLocale(): AdminLocale {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem("retail_admin_locale") === "zh" ? "zh" : "en";
}

function promotionKind(value: unknown, locale: AdminLocale) {
  const t = copy[locale];
  if (value === "percent") return t.percent;
  if (value === "fixed") return t.fixed;
  if (value === "free_shipping") return t.freeShipping;
  return String(value ?? "—");
}

export function PromotionsAdmin() {
  const [locale, setLocaleState] = useState<AdminLocale>("en");
  const t = copy[locale];
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ code: "", kind: "percent", amount: "", minimumSubtotalMinor: "0", scope: '{"all":true}', startsAt: "", endsAt: "", maxRedemptions: "", maxPerCustomer: "", active: true });
  const load = async () => setRows((await api("/api/admin/retail/promotions")).promotions ?? []);

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
      await api("/api/admin/retail/promotions", "POST", {
        ...form,
        amount: Number(form.amount),
        minimumSubtotalMinor: Number(form.minimumSubtotalMinor),
        scope: JSON.parse(form.scope),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
        maxPerCustomer: form.maxPerCustomer ? Number(form.maxPerCustomer) : null,
        idempotencyKey: id(),
      });
      await load();
    } catch {
      setMessage(t.error);
    }
  }

  async function toggle(row: Row) {
    try {
      await api(`/api/admin/retail/promotions/${row.id}`, "PATCH", { active: !row.active, idempotencyKey: id() });
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
    {message && <p role="alert" className="mt-3 text-red-700">{message}</p>}
    <form className="mt-6 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2" onSubmit={create}>
      <label>{t.code}<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
      <label>{t.kind}<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}><option value="percent">{t.percent}</option><option value="fixed">{t.fixed}</option><option value="free_shipping">{t.freeShipping}</option></select></label>
      <label>{t.amount}<input required type="number" min="0" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label>
      <label>{t.minimum}<input required type="number" min="0" value={form.minimumSubtotalMinor} onChange={(event) => setForm({ ...form, minimumSubtotalMinor: event.target.value })} /></label>
      <label>{t.starts}<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
      <label>{t.ends}<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
      <label>{t.max}<input type="number" min="1" value={form.maxRedemptions} onChange={(event) => setForm({ ...form, maxRedemptions: event.target.value })} /></label>
      <label>{t.perCustomer}<input type="number" min="1" value={form.maxPerCustomer} onChange={(event) => setForm({ ...form, maxPerCustomer: event.target.value })} /></label>
      <label className="md:col-span-2">{t.scope}<textarea required rows={2} value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })} /></label>
      <label><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />{t.active}</label>
      <button className="rounded bg-[#6f4e37] px-4 py-2 text-white md:w-fit">{t.create}</button>
    </form>
    <section className="mt-8 overflow-x-auto">
      <table className="w-full text-left text-sm"><thead><tr><th>{t.code}</th><th>{t.kind}</th><th>{t.amount}</th><th>{t.status}</th><th>{t.used}</th><th /></tr></thead><tbody>
        {rows.map((row) => <tr className="border-t" key={String(row.id)}><td>{String(row.code)}</td><td>{promotionKind(row.kind, locale)}</td><td>{String(row.amount)}</td><td>{row.active ? t.enabled : t.disabled}</td><td>{String(row.redemptions)}</td><td><button className="rounded border px-2 py-1" onClick={() => void toggle(row)}>{row.active ? t.disable : t.enable}</button></td></tr>)}
        {rows.length === 0 && <tr><td colSpan={6}>{t.none}</td></tr>}
      </tbody></table>
    </section>
  </main>;
}
