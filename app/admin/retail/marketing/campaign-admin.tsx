"use client";

import { useCallback, useEffect, useState } from "react";

import type { AdminLocale } from "../admin-locale";

type Row = Record<string, unknown>;
const key = () => crypto.randomUUID();
const empty = { name: "", subjectEn: "", subjectAr: "", bodyEn: "", bodyAr: "", ctaLabelEn: "", ctaLabelAr: "", ctaUrl: "" };

async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(String(result.error ?? "request_failed"));
  return result as Row;
}

export function CampaignAdmin({ locale }: { locale: AdminLocale }) {
  const zh = locale === "zh";
  const [rows, setRows] = useState<Row[]>([]), [form, setForm] = useState(empty), [testEmail, setTestEmail] = useState(""), [schedule, setSchedule] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { const result = await api("/api/admin/retail/marketing/campaigns"); setRows((result.campaigns as Row[] | undefined) ?? []); }, []);
  useEffect(() => { void load().catch(() => setMessage(zh ? "活动加载失败。" : "Could not load campaigns.")); }, [load, zh]);
  const create = async () => {
    setMessage("");
    try {
      await api("/api/admin/retail/marketing/campaigns", "POST", { ...form, ctaLabelEn: form.ctaLabelEn || undefined, ctaLabelAr: form.ctaLabelAr || undefined, ctaUrl: form.ctaUrl || undefined, idempotencyKey: key() });
      setForm(empty); await load(); setMessage(zh ? "草稿已创建。" : "Draft created.");
    } catch { setMessage(zh ? "草稿保存失败，请检查英阿文内容。" : "Could not save the draft. Check both English and Arabic copy."); }
  };
  const action = async (row: Row, name: "test" | "schedule" | "cancel") => {
    setMessage("");
    try {
      const body = name === "test" ? { action: name, email: testEmail, locale: "en", confirm: true }
        : name === "schedule" ? { action: name, scheduledAt: new Date(schedule).toISOString(), confirm: true, idempotencyKey: key() }
          : { action: name, confirm: true, idempotencyKey: key() };
      await api(`/api/admin/retail/marketing/campaigns/${String(row.public_id)}`, "PATCH", body);
      await load(); setMessage(name === "test" ? (zh ? "测试邮件已发送。" : "Test email sent.") : (zh ? "活动状态已更新。" : "Campaign updated."));
    } catch { setMessage(zh ? "操作失败，请检查输入。" : "Action failed. Check the input." ); }
  };
  return <section className="mt-6 rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-5">
    <h2 className="text-xl font-semibold">{zh ? "促销邮件活动" : "Promotional campaigns"}</h2>
    <p className="mt-1 text-sm text-muted">{zh ? "只发送给双重确认且当前有效的订阅者；每封邮件都包含退订链接。" : "Sent only to active double-opt-in subscribers; every message includes an unsubscribe link."}</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {(["name","subjectEn","subjectAr","ctaLabelEn","ctaLabelAr","ctaUrl"] as const).map((field) => <input key={field} aria-label={field} className="rounded-lg border bg-white px-3 py-2 text-sm" placeholder={field} value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} />)}
      <textarea aria-label="bodyEn" className="min-h-28 rounded-lg border bg-white px-3 py-2 text-sm" placeholder="English body" value={form.bodyEn} onChange={(event) => setForm((current) => ({ ...current, bodyEn: event.target.value }))} />
      <textarea aria-label="bodyAr" dir="rtl" className="min-h-28 rounded-lg border bg-white px-3 py-2 text-sm" placeholder="النص العربي" value={form.bodyAr} onChange={(event) => setForm((current) => ({ ...current, bodyAr: event.target.value }))} />
    </div>
    <button className="mt-3 rounded-lg bg-[#6f4f33] px-4 py-2 text-sm font-semibold text-white" onClick={() => void create()}>{zh ? "保存草稿" : "Save draft"}</button>
    {message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}
    <div className="mt-5 grid gap-2 sm:grid-cols-2"><input type="email" className="rounded-lg border bg-white px-3 py-2 text-sm" placeholder={zh ? "测试收件邮箱" : "Test recipient email"} value={testEmail} onChange={(event) => setTestEmail(event.target.value)} /><input type="datetime-local" className="rounded-lg border bg-white px-3 py-2 text-sm" value={schedule} onChange={(event) => setSchedule(event.target.value)} /></div>
    <div className="mt-4 space-y-3">{rows.map((row) => <article className="rounded-lg border bg-white p-4" key={String(row.public_id)}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{String(row.name)}</strong><p className="text-xs text-muted">{String(row.status)} · {String(row.recipients ?? 0)} recipients · {String(row.sent ?? 0)} sent · {String(row.failed ?? 0)} failed</p></div>{row.status === "draft" ? <div className="flex gap-2"><button className="rounded border px-2 py-1 text-xs" disabled={!testEmail} onClick={() => void action(row,"test")}>{zh ? "发测试" : "Send test"}</button><button className="rounded border px-2 py-1 text-xs" disabled={!schedule} onClick={() => void action(row,"schedule")}>{zh ? "确认排期" : "Confirm schedule"}</button><button className="rounded border px-2 py-1 text-xs" onClick={() => void action(row,"cancel")}>{zh ? "取消" : "Cancel"}</button></div> : null}</div>
    </article>)}</div>
  </section>;
}
