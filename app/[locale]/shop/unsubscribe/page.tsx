import { notFound } from "next/navigation";

import { RetailUnsubscribe } from "./retail-unsubscribe";
import { isLocale } from "@/src/lib/i18n";

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string | string[] }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "zh") notFound();
  const search = await searchParams;
  const token = typeof search.token === "string" ? search.token : "";
  return <RetailUnsubscribe locale={locale} token={token} />;
}
