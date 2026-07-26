import { notFound } from "next/navigation";

import { RetailPolicyPage } from "@/src/components/retail-policy-page";
import { isLocale, withLocale } from "@/src/lib/i18n";
import { SITE_URL } from "@/src/lib/seo";

type PolicyPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PolicyPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const title = locale === "ar" ? "شروط البيع" : "Terms of sale";
  const description = locale === "ar" ? "شروط البيع بالتجزئة المباشرة من TranquilBeads، الإصدار 2026-07-28." : "TranquilBeads direct-retail terms of sale, version 2026-07-28.";
  return { title, description, alternates: { canonical: `${SITE_URL}${withLocale(locale, "/terms")}`, languages: { en: `${SITE_URL}/en/terms`, ar: `${SITE_URL}/ar/terms` } } };
}

export default async function TermsPage({ params }: PolicyPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <RetailPolicyPage locale={locale} policyKey="terms" />;
}
