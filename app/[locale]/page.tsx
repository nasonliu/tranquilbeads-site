import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight, CreditCard, Gift, Globe2, PackageCheck, ShieldCheck } from "lucide-react";

import { RetailNewsletterSignup } from "@/src/components/retail-newsletter-signup";
import { toRetailProduct } from "@/src/data/retail/product-view-model";
import type { RetailProduct } from "@/src/data/retail/types";
import { getPageMetadata } from "@/src/data/site";
import { isLocale, withLocale } from "@/src/lib/i18n";
import { selectHomepageProducts } from "@/src/lib/retail/homepage-config";
import { getPublishedStorefrontHomepage } from "@/src/lib/retail/storefront-pages";
import { listStorefrontV3Products } from "@/src/lib/retail/storefront-v3";

export const dynamic = "force-dynamic";

const fallbackProducts = [
  { name: { en: "Baltic amber tasbih", ar: "سبحة كهرمان بلطيقي" }, material: { en: "Amber", ar: "كهرمان" }, image: "/images/real-products/baltic-amber/hero.jpeg", href: "/shop?material=Amber" },
  { name: { en: "Midnight hematite tasbih", ar: "سبحة هيماتيت داكنة" }, material: { en: "Hematite", ar: "هيماتيت" }, image: "/images/noon/black-hematite-99.jpg", href: "/shop?material=Hematite" },
  { name: { en: "Natural kuka wood tasbih", ar: "سبحة كوكا طبيعية" }, material: { en: "Kuka wood", ar: "خشب كوكا" }, image: "/images/real-products/natural-kuka-wood/hero.jpeg", href: "/shop?material=Kuka" },
  { name: { en: "Black onyx tasbih", ar: "سبحة أونيكس سوداء" }, material: { en: "Onyx", ar: "أونيكس" }, image: "/images/imported/blackagate/main.jpg", href: "/shop?material=Onyx" },
  { name: { en: "Faceted amber tasbih", ar: "سبحة كهرمان متعددة الأوجه" }, material: { en: "Amber look", ar: "مظهر كهرماني" }, image: "/images/imported/faceted-orange/ambertasbish-66.jpg", href: "/shop?material=Amber" },
] as const;

const copy = {
  en: {
    heroTitle: "A meaningful gift, chosen with care",
    heroBody: "Handcrafted tasbih in amber, stone, and kuka. Timeless pieces for reflection, celebration, and everyday devotion.",
    shopGifts: "Shop gifts", discoverAmber: "Discover amber", seasonal: "The gifting edit",
    seasonalBody: "Curated for Ramadan, Eid, weddings, and life’s meaningful milestones.",
    materials: "Shop by material", materialsBody: "Amber, stone, kuka wood, and luminous finishes.",
    counts: "Find your count", countsBody: "Choose from 33, 45, and 99-bead designs.", explore: "Explore",
    bestsellers: "Bestsellers", bestsellersBody: "Customer favourites, selected for material, finish, and gifting presence.",
    all: "View all tasbih", noPrice: "Explore in the shop", personalized: "Gift-ready presentation",
    personalizedBody: "Thoughtful packaging helps every piece arrive ready to give. Add your message during checkout.",
    crafted: "Crafted with purpose", craftedBody: "Carefully selected materials, balanced beadwork, and finishing details made for daily use.", story: "Our story",
    checkout: "Checkout with confidence", checkoutBody: "Secure payment through PayPal, with order and delivery updates sent by email.",
    worldwide: "Worldwide delivery", worldwideBody: "Tracked shipping is quoted for supported destinations at checkout.",
    secure: "Secure payments", secureBody: "PayPal checkout with server-verified prices.",
    packaged: "Carefully packaged", packagedBody: "Protected presentation for every order.",
  },
  ar: {
    heroTitle: "هدية ذات معنى، مختارة بعناية",
    heroBody: "تسابيح من الكهرمان والحجر وخشب الكوكا، صممت للتأمل والاحتفاء والذكر اليومي.",
    shopGifts: "تسوّق الهدايا", discoverAmber: "اكتشف الكهرمان", seasonal: "مختارات الهدايا",
    seasonalBody: "اختيارات لرمضان والعيد والأعراس ولحظات الحياة المهمة.",
    materials: "تسوّق حسب الخامة", materialsBody: "كهرمان وحجر وخشب كوكا وتشطيبات مضيئة.",
    counts: "اختر عدد الحبات", countsBody: "تصاميم من 33 و45 و99 حبة.", explore: "استكشف",
    bestsellers: "الأكثر طلبًا", bestsellersBody: "قطع مفضلة اختيرت لجمال الخامة والتشطيب وحضور الهدية.",
    all: "عرض كل التسابيح", noPrice: "اكتشفها في المتجر", personalized: "تغليف جاهز للإهداء",
    personalizedBody: "تغليف أنيق يحمي القطعة ويجعلها جاهزة للتقديم، مع إمكانية إضافة رسالتك عند الدفع.",
    crafted: "صناعة هادفة", craftedBody: "خامات مختارة بعناية وتوازن في الحبات وتفاصيل تشطيب مناسبة للاستخدام اليومي.", story: "قصتنا",
    checkout: "ادفع بثقة", checkoutBody: "دفع آمن عبر PayPal مع إرسال تحديثات الطلب والتوصيل عبر البريد الإلكتروني.",
    worldwide: "توصيل دولي", worldwideBody: "يظهر سعر الشحن المتتبع للوجهات المدعومة عند الدفع.",
    secure: "دفع آمن", secureBody: "أسعار مؤكدة من الخادم ودفع عبر PayPal.",
    packaged: "تغليف بعناية", packagedBody: "حماية وتقديم أنيق لكل طلب.",
  },
} as const;

function money(minor: number, locale: "en" | "ar") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(minor / 100);
}

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "zh") return {};
  return getPageMetadata(locale, "home", locale === "ar" ? "تسابيح وهدايا مختارة بعناية" : "Premium Tasbih & Meaningful Gifts");
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale === "zh") redirect("/en");
  const language = locale as "en" | "ar";
  const t = copy[language];
  const [homepage, storefrontProducts] = await Promise.all([getPublishedStorefrontHomepage(), listStorefrontV3Products()]);
  const products = selectHomepageProducts(
    storefrontProducts.filter((product) => product.images[0]?.url && product.variants.length),
    homepage.featuredProductSkus,
  ).map((product) => toRetailProduct(product, language));

  return <div className="maison-home">
    <section className="maison-hero" aria-labelledby="maison-hero-title">
      <div className="maison-hero-copy">
        <p className="maison-eyebrow">{language === "ar" ? "TranquilBeads · تسابيح فاخرة" : "TranquilBeads · Premium Tasbih"}</p>
        <h1 id="maison-hero-title">{homepage.hero.title[language]}</h1>
        <p>{homepage.hero.body[language]}</p>
        <div className="maison-actions">
          <Link className="maison-button maison-button-plum" href={withLocale(language, homepage.hero.primaryHref)}>{homepage.hero.primaryLabel[language]}</Link>
          <Link className="maison-button maison-button-emerald" href={withLocale(language, homepage.hero.secondaryHref)}>{homepage.hero.secondaryLabel[language]}</Link>
        </div>
      </div>
      <div className="maison-hero-image"><Image src={homepage.hero.image} alt={homepage.hero.imageAlt[language]} fill loading="eager" fetchPriority="high" sizes="(max-width: 800px) 100vw, 66vw" unoptimized={homepage.hero.image.startsWith("https://")} /></div>
    </section>

    <section id="gifting" className="maison-edit-grid" aria-label={language === "ar" ? "طرق التسوق" : "Ways to shop"}>
      {homepage.edits.map((card, index) => <EditCard
        key={`${card.href}-${index}`}
        className={["maison-edit-gift", "maison-edit-material", "maison-edit-count"][index]}
        href={withLocale(language, card.href)}
        image={card.image}
        title={card.title[language]}
        body={card.body[language]}
        action={card.action[language]}
      />)}
    </section>

    <section className="maison-bestsellers" aria-labelledby="bestseller-title">
      <header><p className="maison-eyebrow">TranquilBeads edit</p><h2 id="bestseller-title">{t.bestsellers}</h2><p>{t.bestsellersBody}</p><Link href={withLocale(language, "/shop")}>{t.all} <ArrowUpRight aria-hidden="true" size={16} /></Link></header>
      <div className="maison-product-grid">
        {products.length ? products.map((product) => <RetailProductCard key={product.sku} product={product} locale={language} />) : fallbackProducts.map((product) => <Link key={product.image} className="maison-product-card" href={withLocale(language, product.href)}><span className="maison-product-image"><Image src={product.image} alt={product.name[language]} fill sizes="(max-width: 700px) 50vw, 20vw" /></span><span className="maison-product-copy"><small>{product.material[language]}</small><strong>{product.name[language]}</strong><em>{t.noPrice}</em></span></Link>)}
      </div>
    </section>

    <section className="maison-story-grid">
      <article><div className="maison-story-image"><Image src="/images/factory-packaging.jpg" alt="" fill sizes="(max-width: 800px) 100vw, 25vw" /></div><div><Gift aria-hidden="true" /><h2>{t.personalized}</h2><p>{t.personalizedBody}</p></div></article>
      <article><div className="maison-story-image"><Image src="/images/imported/blackagate/tasbih-19.jpg" alt="" fill sizes="(max-width: 800px) 100vw, 25vw" /></div><div><PackageCheck aria-hidden="true" /><h2>{t.crafted}</h2><p>{t.craftedBody}</p><Link href={withLocale(language, "/blog")}>{t.story} <ArrowUpRight aria-hidden="true" size={15} /></Link></div></article>
      <article className="maison-confidence"><CreditCard aria-hidden="true" /><div><h2>{t.checkout}</h2><p>{t.checkoutBody}</p></div></article>
    </section>

    <section className="maison-trust" aria-label={language === "ar" ? "مزايا التسوق" : "Shopping assurances"}>
      <div><Globe2 aria-hidden="true" /><span><strong>{t.worldwide}</strong><small>{t.worldwideBody}</small></span></div>
      <div><ShieldCheck aria-hidden="true" /><span><strong>{t.secure}</strong><small>{t.secureBody}</small></span></div>
      <div><Gift aria-hidden="true" /><span><strong>{t.packaged}</strong><small>{t.packagedBody}</small></span></div>
    </section>
    <RetailNewsletterSignup locale={language} />
  </div>;
}

function EditCard({ className, href, image, title, body, action }: { className: string; href: string; image: string; title: string; body: string; action: string }) {
  return <Link className={`maison-edit-card ${className}`} href={href}><div><h2>{title}</h2><p>{body}</p><span>{action} <ArrowUpRight aria-hidden="true" size={16} /></span></div><Image src={image} alt="" fill sizes="(max-width: 800px) 100vw, 33vw" unoptimized={image.startsWith("https://")} /></Link>;
}

function RetailProductCard({ product, locale }: { product: RetailProduct; locale: "en" | "ar" }) {
  const options = product.variants?.[0]?.options ?? {};
  const material = options.Material ?? options.material ?? "TranquilBeads";
  return <Link className="maison-product-card" href={withLocale(locale, `/shop/${product.slug}`)}><span className="maison-product-image"><img src={product.image} alt={product.name[locale]} loading="lazy" /></span><span className="maison-product-copy"><small>{material}</small><strong>{product.name[locale]}</strong><em>{money(product.priceMinor, locale)}</em></span></Link>;
}
