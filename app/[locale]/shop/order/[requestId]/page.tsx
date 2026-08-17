import { notFound } from "next/navigation";

import { isLocale, withLocale } from "@/src/lib/i18n";
import { getStorefrontOrderByRequestId } from "@/src/lib/retail/operations";
import { SITE_URL } from "@/src/lib/seo";

export const dynamic = "force-dynamic";

type StorefrontOrder = {
  status: string;
  currency: string;
  amount_minor: number | string;
};

const money = (amount: number | string, currency: string) => `${currency} ${(Number(amount) / 100).toFixed(2)}`;
type OrderPageProps = { params: Promise<{ locale: string; requestId: string }> };

export async function generateMetadata({ params }: OrderPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: locale === "ar" ? "تأكيد الطلب" : locale === "zh" ? "订单确认" : "Order confirmation",
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
    referrer: "no-referrer",
    alternates: { canonical: `${SITE_URL}${withLocale(locale, "/shop")}` },
  };
}

export default async function StorefrontOrderPage({ params }: OrderPageProps) {
  const { locale, requestId } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(requestId)) notFound();
  // This is intentionally server-only; customer confirmation is never sourced
  // from localStorage or a PayPal browser response.
  const order = await getStorefrontOrderByRequestId(requestId) as StorefrontOrder | null;
  if (!order) notFound();
  const copy = locale === "ar" ? { title: "تأكيد الطلب", status: "الحالة", amount: "المبلغ", delivery: "ملخص التوصيل", update: "سنرسل تحديثات التوصيل إلى بريدك الإلكتروني.", states: { captured: "تم الدفع", pending: "قيد المعالجة", cancelled: "ملغى", refunded: "تم الاسترداد", failed: "فشلت الدفعة" } } : locale === "zh" ? { title: "订单确认", status: "状态", amount: "金额", delivery: "配送摘要", update: "配送更新将发送至您的电子邮箱。", states: { captured: "已付款", pending: "处理中", cancelled: "已取消", refunded: "已退款", failed: "支付失败" } } : { title: "Order confirmation", status: "Status", amount: "Amount", delivery: "Delivery summary", update: "Delivery updates will be sent to your email.", states: { captured: "Paid", pending: "Processing", cancelled: "Cancelled", refunded: "Refunded", failed: "Payment failed" } };
  const status = copy.states[order.status as keyof typeof copy.states] ?? order.status;
  return <main className="noor-container pt-12"><section className="noor-panel mx-auto max-w-2xl rounded-[1.75rem] p-7"><h1 className="text-3xl font-semibold">{copy.title}</h1><dl className="mt-7 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt>{copy.status}</dt><dd className="font-semibold">{status}</dd></div><div className="flex justify-between gap-4"><dt>{copy.amount}</dt><dd className="font-semibold">{money(order.amount_minor, order.currency)}</dd></div></dl><div className="mt-7 border-t border-black/10 pt-5"><h2 className="text-lg font-semibold">{copy.delivery}</h2><p className="mt-3 text-sm text-muted">{copy.update}</p></div></section></main>;
}
