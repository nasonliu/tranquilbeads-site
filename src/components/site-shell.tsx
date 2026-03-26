"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { siteSettings } from "@/src/data/site";
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
  const pathname = usePathname();
  const otherLocale = locale === "en" ? "ar" : "en";
  // Strip current locale prefix from pathname
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";
  const switchLocaleHref = `/${otherLocale}${pathWithoutLocale}`;

  return (
    <div className="noor-shell">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-panel/90 backdrop-blur-xl">
        <div className="noor-container flex items-center justify-between gap-6 py-4">
          <Link href={withLocale(locale)} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-accent/40 bg-[radial-gradient(circle_at_top,_rgba(173,132,86,0.35),_rgba(107,122,81,0.08))] text-sm font-semibold text-accent-deep">
              PN
            </div>
            <div>
              <p className="noor-title text-2xl">{siteSettings.brandName}</p>
              <p className="text-xs uppercase tracking-[0.28em] text-muted">
                {isArabic ? "تجارة راقية" : "Premium Trade"}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted lg:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={withLocale(locale, item.href)}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={switchLocaleHref}
              className="rounded-full border border-border/80 bg-white/55 px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent/40 hover:text-foreground"
            >
              {locale === "en" ? "العربية" : "English"}
            </Link>
            <a
              href={siteSettings.whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-accent/30 px-4 py-2 text-sm font-semibold text-accent-deep transition hover:border-accent hover:bg-accent/10"
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
              {locale === "en" ? "Quick links" : "روابط سريعة"}
            </p>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={withLocale(locale, item.href)}
                className="block transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="space-y-2 text-sm text-[#dcccb5]">
            <p className="text-xs uppercase tracking-[0.24em] text-[#a88a61]">
              {locale === "en" ? "Contact" : "التواصل"}
            </p>
            <p>{siteSettings.email}</p>
            <p className="latin-ui">{siteSettings.whatsappDisplay}</p>
            <p>{footerCopy.rights}</p>
          </div>
        </div>
      </footer>

      <a
        href={siteSettings.whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="latin-ui fixed bottom-5 right-5 z-30 rounded-full bg-accent-deep px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(28,36,20,0.28)] transition hover:-translate-y-0.5"
      >
        {locale === "en" ? "WhatsApp Us" : "واتساب"}
      </a>
    </div>
  );
}
