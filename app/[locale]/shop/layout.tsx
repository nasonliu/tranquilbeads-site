import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import {
  RetailReferenceCurrencyProvider,
  RetailReferenceCurrencyToolbar,
} from "@/src/components/retail-reference-currency";
import { isLocale } from "@/src/lib/i18n";
import { getRetailReferenceCurrencySnapshot } from "@/src/lib/retail/reference-currency-server";

export default async function RetailShopLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const snapshot = getRetailReferenceCurrencySnapshot();
  return <RetailReferenceCurrencyProvider snapshot={snapshot} refreshUrl="/api/retail/reference-currency">
    <RetailReferenceCurrencyToolbar locale={locale} />
    {children}
  </RetailReferenceCurrencyProvider>;
}
