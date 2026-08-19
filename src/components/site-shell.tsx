"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe2, UserRound } from "lucide-react";

import { siteSettings } from "@/src/data/site";
import { retailPolicyPaths } from "@/src/data/retail/policies";
import type { Locale } from "@/src/lib/i18n";
import { withLocale } from "@/src/lib/i18n";
import { RetailCartButton, RetailCartDrawer, RetailCartProvider } from "@/src/components/retail-cart";
import { WhatsAppContactMenu } from "@/src/components/whatsapp-contact-menu";

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
  const isRetailShop = /^\/(en|ar|zh)\/shop(?:\/|$)/.test(pathname ?? "");
  const isConsumerLocale = locale === "en" || locale === "ar";
  const otherLocale = locale === "en" ? "ar" : "en";
  // Strip current locale prefix from pathname
  const pathWithoutLocale = (pathname ?? withLocale(locale)).replace(/^\/(en|ar|zh)/, "") || "/";
  const switchLocaleHref = `/${otherLocale}${pathWithoutLocale}`;

  return (
    <RetailCartProvider><div className="noor-shell">
      <header className="maison-site-header sticky top-0 z-20 border-b border-border/70 bg-[#fffaf3]/95 backdrop-blur-xl">
        <div className="maison-announcement"><Globe2 aria-hidden="true" size={14} />{isArabic ? "توصيل دولي متتبع للوجهات المدعومة" : isChinese ? "支持地区可追踪配送" : "Worldwide tracked delivery to supported destinations"}</div>
        <div className="noor-container flex items-center justify-between gap-3 py-3 sm:gap-5">
          <Link href={withLocale(locale)} prefetch={isRetailShop ? false : undefined} className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <p className="noor-title truncate text-2xl sm:text-[1.7rem]">
                {siteSettings.brandName}
              </p>
              <p className="hidden text-[.58rem] uppercase tracking-[0.38em] text-muted sm:block">
                {isArabic ? "تسابيح فاخرة" : isChinese ? "精选念珠" : "Premium Tasbih"}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-[.78rem] font-medium text-[#4f423c] xl:flex" aria-label={isArabic ? "التنقل الرئيسي" : "Primary navigation"}>
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
            {isConsumerLocale ? <RetailCartButton locale={locale} /> : null}
            {isConsumerLocale ? <Link href={`/${locale}/shop/account`} aria-label={locale === "ar" ? "حسابي" : "My account"} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-white/55"><UserRound aria-hidden="true" size={18} /></Link> : null}
            <Link
              href={switchLocaleHref}
              prefetch={isRetailShop ? false : undefined}
              className="rounded-full border border-border/80 bg-white/55 px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent/40 hover:text-foreground"
            >
              {otherLocale === "ar" ? "العربية" : "English"}
            </Link>
          </div>
        </div>
        <div className="noor-container flex gap-2 overflow-x-auto pb-3 xl:hidden">
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

      <main className="maison-main">{children}</main>

      <footer className="maison-footer border-t border-border/80 bg-[#25141d] text-[#f7eee4]">
        <div className="noor-container grid gap-8 py-12 md:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <p className="noor-title text-3xl">{siteSettings.brandName}</p>
            <p className="max-w-sm text-sm leading-7 text-[#dcccbf]">
              {footerCopy.summary}
            </p>
          </div>
          <div className="space-y-2 text-sm text-[#dcccbf]">
            <p className="text-xs uppercase tracking-[0.24em] text-[#c3a16f]">{locale === "ar" ? "تسوّق" : isChinese ? "商店" : "Shop"}</p>
            <Link className="block hover:text-white" href={withLocale(locale, "/shop")}>{locale === "ar" ? "كل التسابيح" : isChinese ? "所有商品" : "All tasbih"}</Link>
            {isConsumerLocale ? <Link className="block hover:text-white" href={withLocale(locale, "/#bestsellers")}>{locale === "ar" ? "الجديد والمميز" : "New & featured"}</Link> : null}
            {isConsumerLocale ? <Link className="block hover:text-white" href={withLocale(locale, "/#gifting")}>{locale === "ar" ? "الهدايا" : "Gifts"}</Link> : null}
          </div>
          <div className="space-y-2 text-sm text-[#dcccb5]">
            <p className="text-xs uppercase tracking-[0.24em] text-[#a88a61]">
              {locale === "en" ? "For partners" : isChinese ? "合作" : "للشركاء"}
            </p>
            {isConsumerLocale ? <Link className="block hover:text-white" href={withLocale(locale, "/wholesale")}>{locale === "ar" ? "برنامج الجملة" : "Wholesale program"}</Link> : null}
            {isConsumerLocale ? <Link className="block hover:text-white" href={withLocale(locale, "/collections")}>{locale === "ar" ? "كتالوج الجملة" : "Wholesale catalog"}</Link> : null}
            {isConsumerLocale ? <Link className="block hover:text-white" href={withLocale(locale, "/contact")}>{locale === "ar" ? "اطلب قائمة الأسعار" : "Request a price list"}</Link> : null}
            {isConsumerLocale ? <p className="pt-3 text-xs uppercase tracking-[0.2em] text-[#a88a61]">{locale === "ar" ? "متوفر أيضًا على" : "Also available on"}</p> : null}
            {isConsumerLocale ? <div className="flex gap-4"><Link className="hover:text-white" href={withLocale(locale, "/amazon")}>Amazon</Link><Link className="hover:text-white" href={withLocale(locale, "/noon")}>Noon</Link></div> : null}
          </div>
          <div className="space-y-2 text-sm text-[#dcccb5]">
            <p className="text-xs uppercase tracking-[0.24em] text-[#a88a61]">
              {locale === "en" ? "Help & contact" : isChinese ? "帮助与联系" : "المساعدة والتواصل"}
            </p>
            <Link className="block hover:text-white" href={withLocale(locale, retailPolicyPaths["shipping-returns"])}>{locale === "ar" ? "الشحن والإرجاع" : isChinese ? "配送与退货" : "Shipping & returns"}</Link>
            <Link className="block hover:text-white" href={withLocale(locale, retailPolicyPaths.privacy)}>{locale === "ar" ? "الخصوصية" : isChinese ? "隐私政策" : "Privacy"}</Link>
            <Link className="block hover:text-white" href={withLocale(locale, retailPolicyPaths.terms)}>{locale === "ar" ? "شروط البيع" : isChinese ? "销售条款" : "Terms of sale"}</Link>
            <p>{siteSettings.email}</p>
            {siteSettings.whatsappContacts.map((contact) => (
              <a
                key={contact.id}
                className="latin-ui block hover:text-white"
                href={contact.href}
                target="_blank"
                rel="noreferrer"
              >
                {contact.label[locale] ?? contact.label.en}
              </a>
            ))}
            <p>{footerCopy.rights}</p>
          </div>
        </div>
      </footer>

      <WhatsAppContactMenu locale={locale} variant="floating" />
      <RetailCartDrawer locale={locale} />
    </div></RetailCartProvider>
  );
}
