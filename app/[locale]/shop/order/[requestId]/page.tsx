import { notFound } from "next/navigation";

import { isLocale, withLocale } from "@/src/lib/i18n";
import { getStorefrontOrderByRequestId } from "@/src/lib/retail/operations";
import { SITE_URL } from "@/src/lib/seo";

export const dynamic = "force-dynamic";

type StorefrontOrder = {
  status: string;
  currency: string;
  amount_minor: number | string;
  checkout_shipping?: { recipient?: string; line1?: string; line2?: string; city?: string; region?: string; postalCode?: string; country?: string } | null;
};

const money = (amount: number | string, currency: string) => `${currency} ${(Number(amount) / 100).toFixed(2)}`;
type OrderPageProps = { params: Promise<{ locale: string; requestId: string }> };

export async function generateMetadata({ params }: OrderPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: locale === "ar" ? "تأكيد الطلب" : "Order confirmation", alternates: { canonical: `${SITE_URL}${withLocale(locale, "/shop")}` } };
}

export default async function StorefrontOrderPage({ params }: OrderPageProps) {
  const { locale, requestId } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(requestId)) notFound();
  // This is intentionally server-only; customer confirmation is never sourced
  // from localStorage or a PayPal browser response.
  const order = await getStorefrontOrderByRequestId(requestId) as StorefrontOrder | null;
  if (!order) notFound();
  const shipping = order.checkout_shipping;
  const title = locale === "ar" ? "تأكيد الطلب" : "Order confirmation";
  return <main className="noor-container pt-12"><section className="noor-panel mx-auto max-w-2xl rounded-[1.75rem] p-7"><p className="text-sm text-muted">{locale === "ar" ? "رقم الطلب" : "Order reference"}: {requestId}</p><h1 className="mt-2 text-3xl font-semibold">{title}</h1><dl className="mt-7 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt>{locale === "ar" ? "الحالة" : "Status"}</dt><dd className="font-semibold capitalize">{order.status}</dd></div><div className="flex justify-between gap-4"><dt>{locale === "ar" ? "المبلغ" : "Amount"}</dt><dd className="font-semibold">{money(order.amount_minor, order.currency)}</dd></div></dl><div className="mt-7 border-t border-black/10 pt-5"><h2 className="text-lg font-semibold">{locale === "ar" ? "ملخص التوصيل" : "Delivery summary"}</h2>{shipping ? <address className="mt-3 whitespace-pre-line text-sm not-italic text-muted">{[shipping.recipient, shipping.line1, shipping.line2, [shipping.city, shipping.region, shipping.postalCode].filter(Boolean).join(", "), shipping.country].filter(Boolean).join("\n")}</address> : <p className="mt-3 text-sm text-muted">{locale === "ar" ? "سنرسل تفاصيل التوصيل إلى بريدك الإلكتروني." : "Delivery details will be sent to your email."}</p>}</div></section></main>;
}
