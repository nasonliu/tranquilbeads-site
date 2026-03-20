import { notFound } from "next/navigation";

import {
  collections,
  getPageCopy,
  getPageMetadata,
  siteSettings,
} from "@/src/data/site";
import { PageHero } from "@/src/components/page-hero";
import { CollectionCard } from "@/src/components/collection-card";
import { isLocale, withLocale } from "@/src/lib/i18n";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/collections">) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return getPageMetadata(
    locale,
    "collections",
    locale === "en" ? "Collections" : "المجموعات",
  );
}

export default async function CollectionsPage({
  params,
}: PageProps<"/[locale]/collections">) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const copy = getPageCopy(locale);

  return (
    <div className="space-y-12 pt-8 md:space-y-16">
      <PageHero
        eyebrow={copy.collectionsPage.filtersLabel}
        title={copy.collectionsPage.title}
        description={copy.collectionsPage.description}
        aside={
          <div className="space-y-4">
            <div className="noor-panel rounded-[1.5rem] p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-accent-deep">
                {locale === "en" ? "Catalog focus" : "تركيز الكتالوج"}
              </p>
              <p className="mt-4 text-sm leading-7 text-muted">
                {locale === "en"
                  ? "We keep the first release intentionally focused: hero tasbih designs, premium gifting combinations, and supporting décor pieces."
                  : "نبقي الإصدار الأول مركزًا عمدًا: تصاميم تسابيح أساسية، وتوليفات هدايا راقية، وقطع ديكور داعمة."}
              </p>
            </div>
            <a
              href={siteSettings.whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="latin-ui block rounded-[1.5rem] border border-accent/25 bg-[#1f1a15] p-6 text-sm leading-7 text-[#efe6d8]"
            >
              {locale === "en"
                ? "Need the full line sheet? Start a WhatsApp conversation and ask for the current export assortment."
                : "هل تحتاج إلى كشف التشكيلة الكامل؟ ابدأ محادثة واتساب واطلب تشكيلة التصدير الحالية."}
            </a>
          </div>
        }
      />

      <section className="noor-container grid gap-6">
        {collections.map((collection) => (
          <CollectionCard
            key={collection.slug}
            name={collection.name[locale]}
            description={collection.description[locale]}
            image={collection.heroImage}
            href={withLocale(locale, `/collections/${collection.slug}`)}
            ctaLabel={locale === "en" ? "Explore collection" : "استعرض المجموعة"}
          />
        ))}
      </section>
    </div>
  );
}
