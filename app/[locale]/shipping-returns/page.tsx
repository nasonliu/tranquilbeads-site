import { notFound } from "next/navigation";

import { RetailPolicyPage } from "@/src/components/retail-policy-page";
import { isLocale, withLocale } from "@/src/lib/i18n";
import { SITE_URL } from "@/src/lib/seo";

type PolicyPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PolicyPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const title = locale === "ar" ? "الشحن والإرجاع والاسترداد" : locale === "zh" ? "配送、退货与退款" : "Shipping, returns and refunds";
  const description = locale === "ar" ? "معلومات شحن وإرجاع واسترداد طلبات TranquilBeads للتجزئة المباشرة." : locale === "zh" ? "TranquilBeads 直接零售订单的配送、退货和退款信息。" : "Shipping, return and refund information for TranquilBeads direct-retail orders.";
  return { title, description, alternates: { canonical: `${SITE_URL}${withLocale(locale, "/shipping-returns")}`, languages: { en: `${SITE_URL}/en/shipping-returns`, ar: `${SITE_URL}/ar/shipping-returns`, zh: `${SITE_URL}/zh/shipping-returns` } } };
}

export default async function ShippingReturnsPage({ params }: PolicyPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <RetailPolicyPage locale={locale} policyKey="shipping-returns" />;
}
