import { notFound } from "next/navigation";

import { RetailUnsubscribe } from "./retail-unsubscribe";

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ locale }, { token = "" }] = await Promise.all([params, searchParams]);
  if ((locale !== "en" && locale !== "ar") || !/^[0-9a-f-]{36}$/i.test(token)) notFound();
  return <RetailUnsubscribe locale={locale} token={token} />;
}
