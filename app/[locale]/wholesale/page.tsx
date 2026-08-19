import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Globe2, Handshake, PackageCheck } from "lucide-react";

import { getPageCopy, getPageMetadata, siteSettings } from "@/src/data/site";
import { isWholesaleLocale, withLocale } from "@/src/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/wholesale">) {
  const { locale } = await params;
  if (!isWholesaleLocale(locale)) return {};
  return getPageMetadata(locale, "wholesale", locale === "en" ? "Wholesale Tasbih & Misbaha Sourcing" : "توريد تسابيح ومسابح بالجملة");
}

export default async function WholesalePage({ params }: PageProps<"/[locale]/wholesale">) {
  const { locale } = await params;
  if (!isWholesaleLocale(locale)) notFound();
  const copy = getPageCopy(locale);
  const english = locale === "en";

  const strengths = [
    { icon: BadgeCheck, title: english ? "Clear product facts" : "معلومات واضحة", body: english ? "Specifications and material claims are confirmed item by item." : "يتم تأكيد المواصفات وادعاءات الخامة لكل صنف." },
    { icon: PackageCheck, title: english ? "Private-label ready" : "جاهز للعلامة الخاصة", body: english ? "Gift boxes, sleeves, insert cards, and bilingual presentation options." : "علب هدايا وأغلفة وبطاقات داخلية وخيارات عرض ثنائية اللغة." },
    { icon: Globe2, title: english ? "Tracked global delivery" : "شحن دولي متتبع", body: english ? "Routes, timing, and costs are confirmed for supported destinations in the quote." : "يتم تأكيد المسار والمدة والتكلفة للوجهات المدعومة ضمن عرض السعر." },
    { icon: Handshake, title: english ? "Tailored commercial terms" : "شروط تجارية مخصصة", body: english ? "Pricing is shaped around quantity, material, packaging, and destination." : "يتحدد السعر حسب الكمية والخامة والتغليف ووجهة الشحن." },
  ];

  return <div className="maison-page pb-16 pt-8 md:pt-12">
    <section className="noor-container maison-wholesale-hero">
      <div className="maison-wholesale-copy">
        <p className="maison-eyebrow">{english ? "TranquilBeads wholesale" : "جملة TranquilBeads"}</p>
        <h1>{copy.wholesalePage.title}</h1>
        <p>{copy.wholesalePage.description}</p>
        <div className="maison-actions">
          <Link className="maison-button maison-button-plum" href={withLocale(locale, "/collections")}>{english ? "View wholesale catalog" : "عرض كتالوج الجملة"}</Link>
          <Link className="maison-button maison-button-emerald" href={withLocale(locale, "/contact")}>{english ? "Request price list" : "اطلب قائمة الأسعار"}</Link>
        </div>
      </div>
      <div className="maison-wholesale-image"><Image src="/images/factory-packaging.jpg" alt={english ? "TranquilBeads gift packaging and wholesale preparation" : "تجهيز وتغليف طلبات الجملة من TranquilBeads"} fill priority sizes="(max-width: 800px) 100vw, 48vw" /></div>
    </section>

    <section className="noor-container maison-wholesale-strengths" aria-label={english ? "Wholesale service strengths" : "مزايا خدمة الجملة"}>
      {strengths.map((item) => <article key={item.title}><item.icon aria-hidden="true" size={22} /><h2>{item.title}</h2><p>{item.body}</p></article>)}
    </section>

    <section className="noor-container maison-wholesale-details">
      <div className="maison-wholesale-panel">
        <p className="maison-eyebrow">{copy.wholesalePage.flowTitle}</p>
        <div className="maison-wholesale-flow">
          {copy.wholesalePage.flow.map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}
        </div>
      </div>
      <div className="maison-wholesale-panel maison-wholesale-terms">
        <p className="maison-eyebrow">{english ? "What you can request" : "ما يمكنك طلبه"}</p>
        <ul>{copy.wholesalePage.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
      </div>
    </section>

    <section className="noor-container maison-wholesale-contact">
      <div><p className="maison-eyebrow">{english ? "Talk to our wholesale team" : "تواصل مع فريق الجملة"}</p><h2>{english ? "Tell us your market, quantity, and target price." : "شاركنا السوق والكمية والسعر المستهدف."}</h2><p>{english ? "We will reply with a focused assortment, a tailored quotation, and the next sample or approval step." : "سنرد بتشكيلة مركزة وعرض سعر مخصص وخطوة العينة أو الاعتماد التالية."}</p></div>
      <div className="maison-actions"><Link className="maison-button maison-button-plum" href={withLocale(locale, "/contact")}>{english ? "Start a wholesale enquiry" : "ابدأ استفسار جملة"}</Link><a className="maison-button maison-button-emerald" href={`mailto:${siteSettings.email}`}>{siteSettings.email}</a></div>
    </section>
  </div>;
}
