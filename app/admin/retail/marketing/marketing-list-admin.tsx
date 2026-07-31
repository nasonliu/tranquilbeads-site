"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { type AdminLocale } from "../admin-locale";
import { AdminShell } from "../ui";

type Row = Record<string, unknown>;
const key = () => crypto.randomUUID();
const text = {
  en: { title: "Email list", subtitle: "Consent-backed retail subscribers for future promotions.", export: "Export active CSV", email: "Email", locale: "Language", source: "Source", status: "Status", joined: "Subscribed", action: "Action", pending: "Pending confirmation", active: "Active", unsubscribed: "Unsubscribed", suppressed: "Suppressed", stop: "Stop marketing", restore: "Restore", suppress: "Suppress", empty: "No subscribers yet.", failed: "Could not load the email list.", saved: "Status updated." },
  zh: { title: "邮件名单", subtitle: "用于后续促销的零售顾客授权订阅名单。", export: "导出有效名单 CSV", email: "邮箱", locale: "语言", source: "来源", status: "状态", joined: "订阅时间", action: "操作", pending: "等待邮件确认", active: "订阅中", unsubscribed: "已退订", suppressed: "已停发", stop: "停止营销", restore: "恢复订阅", suppress: "强制停发", empty: "暂时没有订阅者。", failed: "邮件名单加载失败。", saved: "状态已更新。" },
} as const;

async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(String(result.error ?? "request_failed"));
  return result as Row;
}

function storedLocale(): AdminLocale { return typeof window !== "undefined" && localStorage.getItem("retail_admin_locale") === "zh" ? "zh" : "en"; }

export function MarketingListAdmin() {
  const [locale, setLocaleState] = useState<AdminLocale>(storedLocale);
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const t = text[locale];
  const load = useCallback(async () => { const result = await api("/api/admin/retail/marketing"); setRows((result.subscribers as Row[] | undefined) ?? []); }, []);
  useEffect(() => { void load().catch(() => setMessage(text[storedLocale()].failed)); }, [load]);
  const counts = useMemo(() => ({ pending: rows.filter((row) => row.status === "pending").length, active: rows.filter((row) => row.status === "active").length, unsubscribed: rows.filter((row) => row.status === "unsubscribed").length, suppressed: rows.filter((row) => row.status === "suppressed").length }), [rows]);
  const changeLocale = (next: AdminLocale) => { localStorage.setItem("retail_admin_locale", next); setLocaleState(next); };
  const setStatus = async (row: Row, status: "active" | "unsubscribed" | "suppressed") => {
    setMessage("");
    try { await api(`/api/admin/retail/marketing/${String(row.public_id)}`, "PATCH", { status, idempotencyKey: key() }); await load(); setMessage(t.saved); }
    catch { setMessage(t.failed); }
  };
  const date = (value: unknown) => value ? new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(String(value))) : "—";
  const status = (value: unknown) => value === "pending" ? t.pending : value === "active" ? t.active : value === "suppressed" ? t.suppressed : t.unsubscribed;

  return <AdminShell section="marketing" locale={locale} onLocale={changeLocale} refresh={() => void load()}>
    <main className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="noor-title text-3xl">{t.title}</h1><p className="mt-2 text-sm text-muted">{t.subtitle}</p></div><a className="rounded-md border border-[#cdbda9] px-4 py-2 text-sm" href="/api/admin/retail/marketing?format=csv">{t.export}</a></header>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(["pending","active","unsubscribed","suppressed"] as const).map((name) => <div className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-4" key={name}><p className="text-sm text-muted">{status(name)}</p><p className="mt-2 text-3xl font-semibold">{counts[name]}</p></div>)}</section>
      {message && <p className="mt-4 text-sm" role="status">{message}</p>}
      <section className="mt-6 overflow-x-auto rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-3"><table className="w-full text-left text-sm"><thead><tr className="text-muted"><th className="p-3">{t.email}</th><th className="p-3">{t.locale}</th><th className="p-3">{t.source}</th><th className="p-3">{t.status}</th><th className="p-3">{t.joined}</th><th className="p-3">{t.action}</th></tr></thead><tbody>
        {rows.map((row) => <tr className="border-t border-[#e8ded1]" key={String(row.public_id)}><td className="p-3">{String(row.email)}</td><td className="p-3">{String(row.locale)}</td><td className="p-3">{String(row.source)}</td><td className="p-3">{status(row.status)}</td><td className="p-3">{date(row.consented_at)}</td><td className="p-3"><div className="flex flex-wrap gap-2">{row.status !== "active" && <button className="rounded border px-2 py-1" onClick={() => void setStatus(row,"active")}>{t.restore}</button>}{row.status === "active" && <button className="rounded border px-2 py-1" onClick={() => void setStatus(row,"unsubscribed")}>{t.stop}</button>}{row.status !== "suppressed" && <button className="rounded border px-2 py-1" onClick={() => void setStatus(row,"suppressed")}>{t.suppress}</button>}</div></td></tr>)}
        {!rows.length && <tr><td className="p-8 text-muted" colSpan={6}>{t.empty}</td></tr>}
      </tbody></table></section>
    </main>
  </AdminShell>;
}
