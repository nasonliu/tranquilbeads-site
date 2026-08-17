import { notFound, redirect } from "next/navigation";
import { RetailCheckoutPage } from "@/src/components/retail-checkout";
import { getRetailRuntimeConfig } from "@/src/lib/retail/config";
import { listStorefrontShippingZones } from "@/src/lib/retail/operations";
import { isLocale } from "@/src/lib/i18n";

export const dynamic = "force-dynamic";
export default async function Checkout({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); if (locale === "zh") redirect("/en/shop/checkout");
  const config = getRetailRuntimeConfig(); const zones = await listStorefrontShippingZones();
  return <RetailCheckoutPage locale={locale} zones={zones} paypalClientId={config.enabled ? config.paypalClientId : undefined} enabled={config.enabled} dynamicShippingEnabled={process.env.RETAIL_DYNAMIC_SHIPPING_ENABLED === "true"} />;
}
