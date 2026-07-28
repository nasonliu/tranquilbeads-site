import { notFound } from "next/navigation";
import { isLocale } from "@/src/lib/i18n";
import { redeemCustomerPortalToken } from "@/src/lib/retail/customer-portal";
import { ReturnPanel } from "./return-panel";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function ReturnsPage({ params }: { params: Promise<{ locale: string; token: string }> }) { const { locale, token } = await params; if (!isLocale(locale) || !await redeemCustomerPortalToken(token)) notFound(); return <main className="noor-container pt-12"><section className="noor-panel mx-auto max-w-2xl rounded-[1.75rem] p-7"><ReturnPanel token={token} locale={locale} /></section></main>; }
