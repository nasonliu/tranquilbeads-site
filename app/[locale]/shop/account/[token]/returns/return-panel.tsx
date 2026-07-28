"use client";

import { useEffect, useState } from "react";

type Locale = "en" | "ar" | "zh";
type Line = { lineId: string; sku: string; titleEn: string; titleAr: string; titleZh: string; purchasedQuantity: number; remainingQuantity: number };
type Return = { public_id: string; status: string; reason: string; customer_note: string; admin_note: string; requested_at: string; lines: Array<{ sku: string; titleEn: string; titleAr: string; titleZh: string; quantity: number }> };

const text = {
  en: { title: "Returns", request: "Request a return", reason: "Reason", note: "Additional details (optional)", submit: "Submit return request", none: "No return requests yet.", unavailable: "No items are currently eligible for return.", sent: "Your return request was submitted.", error: "We could not submit this return request. Please try again.", quantity: "Quantity", status: "Status" },
  zh: { title: "退货", request: "申请退货", reason: "退货原因", note: "补充说明（可选）", submit: "提交退货申请", none: "暂无退货申请。", unavailable: "当前没有可申请退货的商品。", sent: "退货申请已提交。", error: "暂时无法提交退货申请，请重试。", quantity: "数量", status: "状态" },
  ar: { title: "المرتجعات", request: "طلب إرجاع", reason: "سبب الإرجاع", note: "تفاصيل إضافية (اختياري)", submit: "إرسال طلب الإرجاع", none: "لا توجد طلبات إرجاع حتى الآن.", unavailable: "لا توجد منتجات مؤهلة للإرجاع حالياً.", sent: "تم إرسال طلب الإرجاع.", error: "تعذر إرسال طلب الإرجاع. حاول مرة أخرى.", quantity: "الكمية", status: "الحالة" },
} as const;

function title(line: Line | Return["lines"][number], locale: Locale) { return locale === "zh" ? line.titleZh || line.titleEn : locale === "ar" ? line.titleAr || line.titleEn : line.titleEn || line.titleZh; }

export function ReturnPanel({ token, locale }: { token: string; locale: Locale }) {
  const copy = text[locale];
  const [lines, setLines] = useState<Line[]>([]); const [returns, setReturns] = useState<Return[]>([]); const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState(""); const [note, setNote] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const load = async () => { const response = await fetch(`/api/retail/customer/${token}/returns`, { cache: "no-store" }); if (!response.ok) return; const body = await response.json(); setLines(body.returnableLines ?? []); setReturns(body.returns ?? []); };
  useEffect(() => { void load(); }, []);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const selected = lines.flatMap((line) => quantities[line.lineId] ? [{ lineId: line.lineId, quantity: quantities[line.lineId] }] : []); if (!selected.length || !reason.trim()) { setMessage(copy.error); return; } setBusy(true); setMessage(""); try { const response = await fetch(`/api/retail/customer/${token}/returns`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines: selected, reason: reason.trim(), customerNote: note, idempotencyKey: crypto.randomUUID() }) }); if (!response.ok) throw new Error(); setReason(""); setNote(""); setQuantities({}); setMessage(copy.sent); await load(); } catch { setMessage(copy.error); } finally { setBusy(false); } };
  return <section className="mt-7 border-t border-black/10 pt-5" dir={locale === "ar" ? "rtl" : undefined}><h2 className="text-lg font-semibold">{copy.title}</h2>
    {returns.length ? <ul className="mt-3 space-y-2 text-sm">{returns.map((item) => <li key={item.public_id} className="rounded-lg border border-black/10 p-3"><div className="flex justify-between gap-3"><strong>{copy.status}: {item.status}</strong><span>{new Date(item.requested_at).toLocaleDateString(locale)}</span></div><p className="mt-1">{item.reason}</p><p className="mt-1 text-muted">{item.lines.map((line) => `${title(line, locale)} ×${line.quantity}`).join(", ")}</p></li>)}</ul> : <p className="mt-3 text-sm text-muted">{copy.none}</p>}
    <form className="mt-5 rounded-xl border border-black/10 p-4" onSubmit={submit}><h3 className="font-semibold">{copy.request}</h3>{lines.filter((line) => line.remainingQuantity > 0).length ? <><div className="mt-3 space-y-2">{lines.filter((line) => line.remainingQuantity > 0).map((line) => <label className="flex items-center justify-between gap-4 text-sm" key={line.lineId}><span>{title(line, locale)} <span className="text-muted">({line.sku})</span></span><input aria-label={`${copy.quantity} ${line.sku}`} className="w-20 rounded border p-1" type="number" min="0" max={line.remainingQuantity} value={quantities[line.lineId] ?? 0} onChange={(event) => setQuantities((old) => ({ ...old, [line.lineId]: Math.min(line.remainingQuantity, Math.max(0, Number(event.target.value) || 0)) }))} /></label>)}</div><label className="mt-3 block text-sm">{copy.reason}<input className="mt-1 w-full rounded border p-2" value={reason} maxLength={1000} required onChange={(event) => setReason(event.target.value)} /></label><label className="mt-3 block text-sm">{copy.note}<textarea className="mt-1 w-full rounded border p-2" value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} /></label><button className="mt-4 rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={busy}>{copy.submit}</button></> : <p className="mt-3 text-sm text-muted">{copy.unavailable}</p>}{message && <p className="mt-3 text-sm" role="status">{message}</p>}</form>
  </section>;
}
