"use client";

import { useCallback, useEffect, useState } from "react";

import type { AdminLocale } from "../../admin-locale";

type Row = Record<string, unknown>;
const idempotencyKey = () => crypto.randomUUID();

async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(String(data.error ?? "request_failed"));
  return data as Row;
}

const copy = {
  en: {
    title: "Logistics & customs", help: "Maintain the parcel and customs facts required for YunExpress quotes and shipment creation. Blank values are never guessed.",
    weight: "Shipping weight (g)", length: "Package length (mm)", width: "Package width (mm)", height: "Package height (mm)",
    customs: "Customs description (English)", hs: "HS code", origin: "Country of origin (ISO-2)", dangerous: "Special / dangerous goods", save: "Save logistics profile", saved: "Saved.", failed: "Could not save logistics profile.", empty: "No SKU variants yet.", complete: "Ready for carrier setup", incomplete: "Missing logistics data",
  },
  zh: {
    title: "物流与报关", help: "维护云途报价和制单所需的包裹与报关事实；空白数据不会自动猜测。",
    weight: "发货重量（克）", length: "包装长度（毫米）", width: "包装宽度（毫米）", height: "包装高度（毫米）",
    customs: "英文申报品名", hs: "HS Code", origin: "原产国（两位代码）", dangerous: "特殊/危险货物", save: "保存物流资料", saved: "已保存。", failed: "物流资料保存失败。", empty: "还没有 SKU 变体。", complete: "可用于承运商配置", incomplete: "物流资料不完整",
  },
} as const;

const numberOrNull = (value: FormDataEntryValue | null) => value === null || String(value).trim() === "" ? null : Number(value);
const stringOrNull = (value: FormDataEntryValue | null) => value === null || String(value).trim() === "" ? null : String(value).trim();

export function ProductLogisticsManager({ productId, locale }: { productId: string; locale: AdminLocale }) {
  const [variants, setVariants] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const t = copy[locale];
  const load = useCallback(async () => {
    const result = await api(`/api/admin/retail/catalog/variants?productId=${encodeURIComponent(productId)}`);
    setVariants((result.variants as Row[] | undefined) ?? []);
  }, [productId]);
  useEffect(() => { void load().catch(() => setMessage(t.failed)); }, [load, t.failed]);

  return <section className="space-y-5">
    <header><h2 className="text-xl font-semibold">{t.title}</h2><p className="mt-1 max-w-3xl text-sm text-muted">{t.help}</p></header>
    {variants.map((variant) => {
      const complete = Boolean(variant.shipping_weight_grams && variant.package_length_mm && variant.package_width_mm && variant.package_height_mm && variant.customs_description_en && variant.hs_code && variant.origin_country);
      return <form key={String(variant.public_id)} className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-5" onSubmit={async (event) => {
        event.preventDefault(); setMessage(""); const data = new FormData(event.currentTarget);
        try {
          await api(`/api/admin/retail/catalog/variants/${String(variant.public_id)}`, "PATCH", {
            shippingWeightGrams: numberOrNull(data.get("shippingWeightGrams")), packageLengthMm: numberOrNull(data.get("packageLengthMm")), packageWidthMm: numberOrNull(data.get("packageWidthMm")), packageHeightMm: numberOrNull(data.get("packageHeightMm")),
            customsDescriptionEn: stringOrNull(data.get("customsDescriptionEn")), hsCode: stringOrNull(data.get("hsCode")), originCountry: stringOrNull(data.get("originCountry"))?.toUpperCase() ?? null, dangerousGoods: data.get("dangerousGoods") === "on", idempotencyKey: idempotencyKey(),
          });
          setMessage(`${String(variant.sku)}: ${t.saved}`); await load();
        } catch { setMessage(`${String(variant.sku)}: ${t.failed}`); }
      }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{String(variant.sku)}</h3><p className="text-sm text-muted">{String(variant.title_en ?? "")}</p></div><span className={`rounded-full px-3 py-1 text-xs ${complete ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>{complete ? t.complete : t.incomplete}</span></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[["shippingWeightGrams",t.weight,"shipping_weight_grams"],["packageLengthMm",t.length,"package_length_mm"],["packageWidthMm",t.width,"package_width_mm"],["packageHeightMm",t.height,"package_height_mm"]].map(([name,label,column]) => <label className="text-sm" key={name}>{label}<input className="mt-1 w-full rounded-md border border-[#cdbda9] bg-white p-2" name={name} type="number" min="1" defaultValue={variant[column] == null ? "" : String(variant[column])}/></label>)}
          <label className="text-sm md:col-span-2">{t.customs}<input className="mt-1 w-full rounded-md border border-[#cdbda9] bg-white p-2" name="customsDescriptionEn" maxLength={240} defaultValue={String(variant.customs_description_en ?? "")}/></label>
          <label className="text-sm">{t.hs}<input className="mt-1 w-full rounded-md border border-[#cdbda9] bg-white p-2" name="hsCode" inputMode="numeric" pattern="[0-9]{4,12}" defaultValue={String(variant.hs_code ?? "")}/></label>
          <label className="text-sm">{t.origin}<input className="mt-1 w-full rounded-md border border-[#cdbda9] bg-white p-2 uppercase" name="originCountry" maxLength={2} pattern="[A-Za-z]{2}" defaultValue={String(variant.origin_country ?? "")}/></label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm"><input name="dangerousGoods" type="checkbox" defaultChecked={variant.dangerous_goods === true}/>{t.dangerous}</label>
        <button className="mt-4 rounded-md bg-accent px-4 py-2 text-sm text-white">{t.save}</button>
      </form>;
    })}
    {!variants.length && <p className="text-sm text-muted">{t.empty}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
