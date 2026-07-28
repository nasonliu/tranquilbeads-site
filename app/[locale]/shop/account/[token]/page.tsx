import { notFound } from "next/navigation";

import { isLocale } from "@/src/lib/i18n";
import { redeemCustomerPortalToken, type CustomerPortalOrder } from "@/src/lib/retail/customer-portal";
import { localizeRetailVariantOptions } from "@/src/data/retail/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CustomerPortalPageProps = { params: Promise<{ locale: string; token: string }> };

const money = (amount: number, currency: string) => `${currency} ${(amount / 100).toFixed(2)}`;

function copy(locale: "en" | "ar" | "zh") {
  if (locale === "ar") return {
    title: "تفاصيل الطلب", reference: "مرجع الطلب", payment: "حالة الدفع", total: "الإجمالي", ordered: "تاريخ الطلب", items: "المنتجات", shipping: "التسليم", carrier: "شركة الشحن", tracking: "رقم التتبع", unavailable: "هذه الصفحة غير متاحة.", price: "السعر", discount: "الخصم",
    paid: "تم الدفع", pending: "قيد المعالجة", refunded: "تم الاسترداد", failed: "فشلت الدفعة", fulfilled: "تم الشحن", unfulfilled: "قيد التجهيز", none: "لا تتوفر معلومات تتبع حتى الآن.", returns: "المرتجعات",
  };
  if (locale === "zh") return {
    title: "订单详情", reference: "订单编号", payment: "付款状态", total: "订单合计", ordered: "下单时间", items: "商品", shipping: "配送", carrier: "承运商", tracking: "物流单号", unavailable: "此页面暂不可用。", price: "单价", discount: "优惠",
    paid: "已付款", pending: "处理中", refunded: "已退款", failed: "付款失败", fulfilled: "已发货", unfulfilled: "备货中", none: "暂未提供物流信息。", returns: "退货",
  };
  return {
    title: "Order details", reference: "Order reference", payment: "Payment status", total: "Order total", ordered: "Ordered", items: "Items", shipping: "Delivery", carrier: "Carrier", tracking: "Tracking number", unavailable: "This page is unavailable.", price: "Unit price", discount: "Discount",
    paid: "Paid", pending: "Processing", refunded: "Refunded", failed: "Payment failed", fulfilled: "Shipped", unfulfilled: "Preparing your order", none: "Tracking information is not available yet.", returns: "Returns",
  };
}

function statusLabel(order: CustomerPortalOrder, labels: ReturnType<typeof copy>) {
  if (order.paymentStatus === "captured") return labels.paid;
  if (order.paymentStatus === "refunded") return labels.refunded;
  if (["failed", "denied", "reversed", "cancelled", "expired"].includes(order.paymentStatus)) return labels.failed;
  return labels.pending;
}

function productTitle(item: CustomerPortalOrder["items"][number], locale: "en" | "ar" | "zh") {
  return locale === "ar" ? item.titleAr || item.titleEn || item.titleZh || "—" : locale === "zh" ? item.titleZh || item.titleEn || item.titleAr || "—" : item.titleEn || item.titleAr || item.titleZh || "—";
}

function optionSummary(item: CustomerPortalOrder["items"][number], locale: "en" | "ar" | "zh") {
  return Object.entries(localizeRetailVariantOptions(item.options, locale)).map(([name, value]) => `${name}: ${value}`).join(" · ");
}

export async function generateMetadata({ params }: CustomerPortalPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: locale === "ar" ? "تفاصيل الطلب" : locale === "zh" ? "订单详情" : "Order details",
    robots: { index: false, follow: false, noarchive: true, googleBot: { index: false, follow: false, noimageindex: true } },
    referrer: "no-referrer",
  };
}

export default async function CustomerPortalPage({ params }: CustomerPortalPageProps) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  const order = await redeemCustomerPortalToken(token);
  if (!order) notFound();
  const labels = copy(locale);
  const trackingAvailable = Boolean(order.carrier || order.trackingNumber);

  return <main className="noor-container pt-12">
    <section className="noor-panel mx-auto max-w-2xl rounded-[1.75rem] p-7">
      <h1 className="text-3xl font-semibold">{labels.title}</h1>
      <dl className="mt-7 space-y-3 text-sm">
        <div className="flex justify-between gap-4"><dt>{labels.reference}</dt><dd className="font-semibold">{order.orderPublicId}</dd></div>
        <div className="flex justify-between gap-4"><dt>{labels.payment}</dt><dd className="font-semibold">{statusLabel(order, labels)}</dd></div>
        <div className="flex justify-between gap-4"><dt>{labels.total}</dt><dd className="font-semibold">{money(order.amountMinor, order.currency)}</dd></div>
        <div className="flex justify-between gap-4"><dt>{labels.ordered}</dt><dd className="font-semibold">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(order.orderedAt))}</dd></div>
      </dl>
      <div className="mt-7 border-t border-black/10 pt-5"><h2 className="text-lg font-semibold">{labels.items}</h2><ul className="mt-3 space-y-3 text-sm">{order.items.map((item, index) => <li key={`${item.variantSku ?? productTitle(item, locale)}-${index}`} className="flex justify-between gap-4"><span><span className="block font-medium">{productTitle(item, locale)}</span>{optionSummary(item, locale) ? <span className="block text-xs text-muted">{optionSummary(item, locale)}</span> : null}<span className="block text-xs text-muted">{item.productSku ?? "—"} · {item.variantSku ?? "—"}</span></span><span className="text-right">×{Number(item.quantity ?? 0)}<span className="block text-xs text-muted">{labels.price} {money(Number(item.unitAmountMinor ?? 0), order.currency)}</span>{Number(item.discountMinor ?? 0) > 0 ? <span className="block text-xs text-muted">{labels.discount} −{money(Number(item.discountMinor), order.currency)}</span> : null}<span className="block font-medium">{money(Number(item.lineTotalMinor ?? ((Number(item.quantity ?? 0) * Number(item.unitAmountMinor ?? 0)) - Number(item.discountMinor ?? 0))), order.currency)}</span></span></li>)}</ul></div>
      <div className="mt-7 border-t border-black/10 pt-5"><h2 className="text-lg font-semibold">{labels.shipping}</h2>{trackingAvailable ? <dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt>{labels.carrier}</dt><dd>{order.carrier || "—"}</dd></div><div className="flex justify-between gap-4"><dt>{labels.tracking}</dt><dd>{order.trackingNumber || "—"}</dd></div><div className="mt-3 font-medium">{order.fulfilmentStatus === "fulfilled" ? labels.fulfilled : labels.unfulfilled}</div></dl> : <p className="mt-3 text-sm text-muted">{labels.none}</p>}</div>
      <div className="mt-7 border-t border-black/10 pt-5"><a className="text-sm font-medium text-[#6b7a51] hover:underline" href={`/${locale}/shop/account/${token}/returns`}>{labels.returns}</a></div>
    </section>
  </main>;
}
