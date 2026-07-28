"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { siteSettings } from "@/src/data/site";
import { retailPolicyPaths } from "@/src/data/retail/policies";
import type { Locale } from "@/src/lib/i18n";
import { withLocale } from "@/src/lib/i18n";

type SiteShellProps = {
  locale: Locale;
  nav: Array<{ href: string; label: string }>;
  footerCopy: {
    summary: string;
    rights: string;
  };
  children: React.ReactNode;
};

export function SiteShell({
  locale,
  nav,
  footerCopy,
  children,
}: SiteShellProps) {
  const isArabic = locale === "ar";
  const isChinese = locale === "zh";
  const pathname = usePathname();
  const isRetailShop = /^\/(en|ar|zh)\/shop\/?$/.test(pathname ?? "");
  const otherLocale = locale === "en" ? "ar" : locale === "ar" ? "zh" : "en";
  // Strip current locale prefix from pathname
  const pathWithoutLocale = (pathname ?? withLocale(locale)).replace(/^\/(en|ar|zh)/, "") || "/";
  const switchLocaleHref = `/${otherLocale}${pathWithoutLocale}`;

  return (
    <div className="noor-shell">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-panel/90 backdrop-blur-xl">
        <div className="noor-container flex items-center justify-between gap-3 py-4 sm:gap-6">
          <Link href={withLocale(locale)} prefetch={isRetailShop ? false : undefined} className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-[radial-gradient(circle_at_top,_rgba(173,132,86,0.35),_rgba(107,122,81,0.08))] text-sm font-semibold text-accent-deep">
              PN
            </div>
            <div className="min-w-0">
              <p className="noor-title truncate text-xl sm:text-2xl">
                {siteSettings.brandName}
              </p>
              <p className="hidden text-xs uppercase tracking-[0.28em] text-muted sm:block">
                {isArabic ? "تجارة راقية" : isChinese ? "优质贸易" : "Premium Trade"}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted lg:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={withLocale(locale, item.href)}
                prefetch={isRetailShop ? false : undefined}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href={switchLocaleHref}
              prefetch={isRetailShop ? false : undefined}
              className="rounded-full border border-border/80 bg-white/55 px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent/40 hover:text-foreground"
            >
              {otherLocale === "ar" ? "العربية" : otherLocale === "zh" ? "中文" : "English"}
            </Link>
            <a
              href={siteSettings.whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full border border-accent/30 px-4 py-2 text-sm font-semibold text-accent-deep transition hover:border-accent hover:bg-accent/10 sm:inline-flex"
            >
              WhatsApp
            </a>
          </div>
        </div>
        <div className="noor-container flex gap-2 overflow-x-auto pb-4 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={withLocale(locale, item.href)}
              prefetch={isRetailShop ? false : undefined}
              className="shrink-0 rounded-full border border-border/80 bg-white/55 px-4 py-2 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      <main className="pb-24">{children}</main>

      <footer className="border-t border-border/80 bg-[#1f1a15] text-[#efe6d8]">
        <div className="noor-container grid gap-8 py-10 md:grid-cols-[1.3fr_1fr_1fr]">
          <div className="space-y-3">
            <p className="noor-title text-3xl">{siteSettings.brandName}</p>
            <p className="max-w-xl text-sm leading-7 text-[#dcccb5]">
              {footerCopy.summary}
            </p>
          </div>
          <div className="space-y-2 text-sm text-[#dcccb5]">
            <p className="text-xs uppercase tracking-[0.24em] text-[#a88a61]">
              {locale === "en" ? "Quick links" : isChinese ? "快速链接" : "روابط سريعة"}
            </p>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={withLocale(locale, item.href)}
                prefetch={isRetailShop ? false : undefined}
                className="block transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[#a88a61]">
                {locale === "en" ? "Retail policies" : isChinese ? "零售政策" : "سياسات التجزئة"}
              </p>
              <div className="mt-2 grid gap-2">
                {[
                  [retailPolicyPaths.privacy, locale === "en" ? "Privacy" : isChinese ? "隐私政策" : "الخصوصية"],
                  [retailPolicyPaths.terms, locale === "en" ? "Terms of sale" : isChinese ? "销售条款" : "شروط البيع"],
                  [retailPolicyPaths["shipping-returns"], locale === "en" ? "Shipping & returns" : isChinese ? "配送与退货" : "الشحن والإرجاع"],
                ].map(([href, label]) => (
                  <Link key={href} href={withLocale(locale, href)} className="block transition-colors hover:text-white">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm text-[#dcccb5]">
            <p className="text-xs uppercase tracking-[0.24em] text-[#a88a61]">
              {locale === "en" ? "Contact" : isChinese ? "联系我们" : "التواصل"}
            </p>
            <p>{siteSettings.email}</p>
            <a className="latin-ui block hover:text-white" href={siteSettings.whatsappHref} target="_blank" rel="noreferrer">
              {siteSettings.whatsappDisplay}
            </a>
            <p>{footerCopy.rights}</p>
          </div>
        </div>
      </footer>

      <a
        href={siteSettings.whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="latin-ui fixed bottom-5 right-5 z-30 hidden rounded-full bg-accent-deep px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(28,36,20,0.28)] transition hover:-translate-y-0.5 sm:block"
      >
        {locale === "en" ? "WhatsApp Us" : isChinese ? "WhatsApp 联系我们" : "واتساب"}
      </a>
    </div>
  );
}
