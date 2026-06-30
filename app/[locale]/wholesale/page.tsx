import Link from "next/link";
import { notFound } from "next/navigation";

import { getPageCopy, getPageMetadata } from "@/src/data/site";
import { PageHero } from "@/src/components/page-hero";
import { isLocale, withLocale } from "@/src/lib/i18n";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/wholesale">) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return getPageMetadata(
    locale,
    "wholesale",
    locale === "en" ? "Wholesale Tasbih & Misbaha Sourcing" : "توريد تسابيح ومسابح بالجملة",
  );
}

export default async function WholesalePage({
  params,
}: PageProps<"/[locale]/wholesale">) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const copy = getPageCopy(locale);

  return (
    <div className="space-y-12 pt-8 md:space-y-16">
      <PageHero
        eyebrow={locale === "en" ? "Wholesale program" : "برنامج الجملة"}
        title={copy.wholesalePage.title}
        description={copy.wholesalePage.description}
        actions={
          <Link
            href={withLocale(locale, "/contact")}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
          >
            {locale === "en" ? "Discuss your market" : "ناقش سوقك"}
          </Link>
        }
        aside={
          <div className="noor-panel rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-accent-deep">
              {locale === "en" ? "What partners ask first" : "أهم ما يسأل عنه الشركاء"}
            </p>
            <ul className="mt-4 grid gap-3 text-sm leading-7 text-muted">
              {copy.wholesalePage.bullets.map((bullet) => (
                <li key={bullet} className="rounded-2xl bg-white/55 px-4 py-3">
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        }
      />

      <section className="noor-container grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="noor-panel rounded-[1.75rem] p-6 sm:p-8">
          <p className="noor-kicker text-xs font-semibold text-accent-deep">
            {copy.wholesalePage.flowTitle}
          </p>
          <div className="mt-6 grid gap-4">
            {copy.wholesalePage.flow.map((item, index) => (
              <div
                key={item}
                className="grid gap-4 rounded-[1.25rem] border border-border/70 bg-white/55 p-5 sm:grid-cols-[auto_1fr]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-muted">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {[
            {
              title: locale === "en" ? "MOQ starts from 100" : "موك يبدأ من 100",
              body:
                locale === "en"
                  ? "Ideal for testing a clean first order without overloading a new market."
                  : "مناسب لتجربة أول طلب بشكل واضح دون إرهاق السوق الجديد.",
            },
            {
              title: locale === "en" ? "Custom packaging" : "التغليف الخاص",
              body:
                locale === "en"
                  ? "Sleeves, insert cards, and bilingual presentation details can be matched to your channel."
                  : "يمكن مواءمة الأغلفة والبطاقات وتفاصيل العرض الثنائي اللغة مع قناتك البيعية.",
            },
            {
              title: locale === "en" ? "Lead time clarity" : "وضوح زمن التوريد",
              body:
                locale === "en"
                  ? "We keep the initial assortment focused so approvals and replenishment stay predictable."
                  : "نبقي التشكيلة الأولى مركزة حتى تظل الموافقات وإعادة التوريد قابلة للتنبؤ.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[1.5rem] border border-border/70 bg-[#1f1a15] p-6 text-[#efe6d8]">
              <h2 className="noor-title text-3xl text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#dfcfb8]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="noor-container">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="noor-kicker text-xs font-semibold text-accent-deep">
              {locale === "en" ? "Market-local SEO naming" : "تسمية مناسبة لكل سوق"}
            </p>
            <h2 className="noor-title mt-2 text-3xl">
              {locale === "en"
                ? "One tasbih catalog, different search languages"
                : "كتالوج تسابيح واحد بلغات بحث مختلفة"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              {locale === "en"
                ? "We help wholesale partners describe the same product accurately for each channel, from Gulf English listings to German-Turkish search terms, while keeping material claims conservative and certificate-based."
                : "نساعد شركاء الجملة على وصف المنتج بدقة حسب كل قناة، من قوائم الخليج إلى مصطلحات البحث التركية والألمانية، مع الحفاظ على ادعاءات الخامة مبنية على الشهادات."}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: locale === "en" ? "Gulf / UAE / Saudi" : "الخليج / الإمارات / السعودية",
                body:
                  locale === "en"
                    ? "Tasbih, Misbaha, Tasbeeh, Prayer Beads, 33 Beads, 99 Beads, Gift Box, Eid Gift, Ramadan Gift, Aqeeq and Aqiq."
                    : "تسبيح، مسبحة، خرز صلاة، 33 حبة، 99 حبة، علبة هدية، هدية العيد ورمضان، عقيق.",
              },
              {
                title: locale === "en" ? "Germany / Turkish diaspora" : "ألمانيا والجالية التركية",
                body:
                  locale === "en"
                    ? "Tesbih, Tespih, Gebetskette, Kehribar, Bernstein, 33 Perlen, Geschenkbox, Misbaha and worry beads when the channel is more lifestyle-led."
                    : "تيسبيح، تيسبيه، خرز صلاة، كهرمان، 33 خرزة، علبة هدية، ومسبحة حسب القناة.",
              },
              {
                title: locale === "en" ? "South Asia" : "جنوب آسيا",
                body:
                  locale === "en"
                    ? "Tasbeeh, Tasbih, Aqeeq, Aqiq, Hakik, Hakeek, Sulemani Aqeeq and Carnelian Aqeeq where the material pattern supports it."
                    : "تسبيح، عقيق، عقيق سليماني وعقيق كارنيليان عندما تدعم الخامة ذلك.",
              },
              {
                title: locale === "en" ? "Southeast Asia" : "جنوب شرق آسيا",
                body:
                  locale === "en"
                    ? "Tasbih Kokka, Kaukah, Kaokah, Koka, Kayu Kokka, original, certified, 33 beads and doorgift for Malay and Indonesian channels."
                    : "تسبيح كوكا وكوكا خشب، أصلي، معتمد، 33 حبة وهدايا مناسبات لقنوات الملايو وإندونيسيا.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.25rem] border border-border/70 bg-white/65 p-5"
              >
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
