import { notFound } from "next/navigation";

import { getPageCopy } from "@/src/data/site";
import { SiteShell } from "@/src/components/site-shell";
import { getDir, isLocale, locales } from "@/src/lib/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const copy = getPageCopy(locale);

  return (
    <div
      data-locale-shell
      lang={locale}
      dir={getDir(locale)}
      className="min-h-screen"
    >
      <SiteShell locale={locale} nav={copy.nav} footerCopy={copy.footer}>
        {children}
      </SiteShell>
    </div>
  );
}
