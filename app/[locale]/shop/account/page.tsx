import { notFound, redirect } from "next/navigation";

import { CustomerAccountLogin, CustomerAccountLogout, CustomerMarketingPreferences } from "@/src/components/retail-customer-account";
import { getCustomerAccount } from "@/src/lib/retail/customer-auth";
import { isLocale } from "@/src/lib/i18n";

export const dynamic = "force-dynamic";
export const revalidate = 0;
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> };
const money = (minor: number, currency: string) => `${currency} ${(Number(minor) / 100).toFixed(2)}`;

export async function generateMetadata({ params }: Props) { const { locale } = await params; return { title: locale === "ar" ? "حسابي" : "My account", robots: { index: false, follow: false }, referrer: "no-referrer" }; }

export default async function CustomerAccountPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  if (rawLocale === "zh") redirect("/en/shop/account");
  const locale = rawLocale as "en" | "ar"; const ar = locale === "ar";
  const account = await getCustomerAccount().catch(() => null);
  if (!account) return <main className="noor-container pt-12"><CustomerAccountLogin locale={locale} error={(await searchParams).error === "link"} /></main>;
  return <main className="noor-container pt-12"><section className="noor-panel mx-auto max-w-3xl rounded-[1.75rem] p-7"><div className="flex items-start justify-between gap-5"><div><h1 className="text-3xl font-semibold">{ar ? "حسابي" : "My account"}</h1><p className="mt-2 text-sm text-muted">{account.email}</p></div><CustomerAccountLogout locale={locale} /></div><div className="mt-8 border-t border-black/10 pt-6"><h2 className="text-xl font-semibold">{ar ? "طلباتي" : "My orders"}</h2>{account.orders.length ? <ul className="mt-4 divide-y divide-black/10">{account.orders.map((order) => <li key={order.publicId} className="flex flex-wrap justify-between gap-3 py-4 text-sm"><span><span className="block font-medium">{order.publicId}</span><span className="text-muted">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(order.orderedAt))} · {order.fulfilmentStatus}</span>{order.trackingNumber ? <span className="block text-muted">{order.carrier || "—"}: {order.trackingNumber}</span> : null}</span><strong>{money(order.amountMinor, order.currency)}</strong></li>)}</ul> : <p className="mt-3 text-sm text-muted">{ar ? "لا توجد طلبات مرتبطة بهذا البريد الإلكتروني حتى الآن." : "No orders are linked to this email yet."}</p>}</div><div className="mt-8 border-t border-black/10 pt-6"><h2 className="text-xl font-semibold">{ar ? "عناويني" : "My addresses"}</h2>{account.addresses.length ? <ul className="mt-4 grid gap-3 sm:grid-cols-2">{account.addresses.map((address) => <li key={address.id} className="rounded-xl border border-black/10 p-4 text-sm"><span className="font-medium">{address.recipient}{address.isDefault ? (ar ? " · افتراضي" : " · Default") : ""}</span><span className="mt-1 block text-muted">{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}{address.region ? `, ${address.region}` : ""} {address.postalCode || ""}<br />{address.country}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted">{ar ? "سيظهر عنوانك هنا بعد إتمام الطلب." : "Your address will appear here after checkout."}</p>}</div>{account.marketingConsentActive ? <div className="mt-8 border-t border-black/10 pt-6"><h2 className="text-xl font-semibold">{ar ? "تفضيلات البريد" : "Email preferences"}</h2><div className="mt-3"><CustomerMarketingPreferences locale={locale} /></div></div> : null}</section></main>;
}
