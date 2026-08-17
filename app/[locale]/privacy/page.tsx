import { notFound } from "next/navigation";

import { RetailPolicyPage } from "@/src/components/retail-policy-page";
import { isLocale } from "@/src/lib/i18n";
import { SITE_URL } from "@/src/lib/seo";
import { withLocale } from "@/src/lib/i18n";

type PolicyPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PolicyPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const title = locale === "ar" ? "سياسة الخصوصية" : locale === "zh" ? "隐私政策" : "Privacy policy";
  const description = locale === "ar" ? "إشعار خصوصية متجر TranquilBeads للتجزئة المباشرة." : locale === "zh" ? "TranquilBeads 直接零售商店的隐私声明。" : "Privacy notice for the TranquilBeads direct-retail shop.";
  return { title, description, alternates: { canonical: `${SITE_URL}${withLocale(locale, "/privacy")}`, languages: { en: `${SITE_URL}/en/privacy`, ar: `${SITE_URL}/ar/privacy`, zh: `${SITE_URL}/zh/privacy` } } };
}

export default async function PrivacyPage({ params }: PolicyPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <RetailPolicyPage locale={locale} policyKey="privacy" />;
}
