import { notFound } from "next/navigation";

import {
  contactFormCopy,
  getInterestOptions,
  getPageCopy,
  getPageMetadata,
  siteSettings,
} from "@/src/data/site";
import { InquiryForm } from "@/src/components/inquiry-form";
import { PageHero } from "@/src/components/page-hero";
import { isLocale } from "@/src/lib/i18n";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  return getPageMetadata(
    locale,
    "contact",
    locale === "en" ? "Contact" : "التواصل",
  );
}

export default async function ContactPage({
  params,
}: PageProps<"/[locale]/contact">) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const copy = getPageCopy(locale);

  return (
    <div className="space-y-12 pt-8 md:space-y-16">
      <PageHero
        eyebrow={locale === "en" ? "Inquiry" : "الاستفسار"}
        title={copy.contactPage.title}
        description={copy.contactPage.description}
        aside={
          <div className="grid gap-4">
            {copy.contactPage.detailCards.map((card) => (
              <div
                key={card}
                className="rounded-[1.5rem] border border-border/80 bg-white/55 p-5 text-sm leading-7 text-muted"
              >
                {card}
              </div>
            ))}
            <a
              href={siteSettings.whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="latin-ui rounded-[1.5rem] bg-[#1f1a15] px-5 py-5 text-sm font-semibold text-[#efe6d8]"
            >
              {copy.contactPage.whatsappLabel}
            </a>
          </div>
        }
      />

      <section className="noor-container grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="noor-panel rounded-[1.85rem] p-6 sm:p-8">
          <InquiryForm
            locale={locale}
            interestOptions={getInterestOptions(locale)}
            whatsappHref={siteSettings.whatsappHref}
            submissionEndpoint={process.env.NEXT_PUBLIC_FORM_ENDPOINT}
            copy={{
              labels: {
                name: contactFormCopy.fields.name[locale],
                company: contactFormCopy.fields.company[locale],
                country: contactFormCopy.fields.country[locale],
                contact: contactFormCopy.fields.contact[locale],
                interest: contactFormCopy.fields.interest[locale],
                quantity: contactFormCopy.fields.quantity[locale],
                message: contactFormCopy.fields.message[locale],
              },
              submit: contactFormCopy.submit[locale],
              success: contactFormCopy.success[locale],
              validation: {
                name: contactFormCopy.validation.name[locale],
                company: contactFormCopy.validation.company[locale],
                country: contactFormCopy.validation.country[locale],
                contact: contactFormCopy.validation.contact[locale],
                interest: contactFormCopy.validation.interest[locale],
                quantity: contactFormCopy.validation.quantity[locale],
                message: contactFormCopy.validation.message[locale],
              },
              whatsappLabel: contactFormCopy.whatsappLabel[locale],
            }}
          />
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.5rem] border border-accent/20 bg-[linear-gradient(145deg,_rgba(31,26,21,0.98),_rgba(58,45,30,0.96))] p-6 text-[#efe6d8]">
            <p className="text-xs uppercase tracking-[0.24em] text-[#c8a06d]">
              {locale === "en" ? "Fastest route" : "أسرع طريق"}
            </p>
            <h2 className="noor-title mt-3 text-3xl text-white">
              {locale === "en"
                ? "Share your brief, then continue on WhatsApp"
                : "شاركنا طلبك ثم أكمل عبر واتساب"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#dfcfb8]">
              {locale === "en"
                ? "The form keeps your requirements structured. WhatsApp keeps the conversation moving."
                : "النموذج يحفظ متطلباتك بشكل منظم، وواتساب يحافظ على سرعة المحادثة."}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-white/60 p-6 text-sm leading-7 text-muted">
            <p className="font-semibold text-foreground">{siteSettings.email}</p>
            <p className="latin-ui mt-2">{siteSettings.whatsappDisplay}</p>
            <p className="mt-4">
              {locale === "en"
                ? "Hosted form endpoint can be connected later by setting NEXT_PUBLIC_FORM_ENDPOINT in Vercel."
                : "يمكن توصيل نقطة نهاية النموذج لاحقًا عبر ضبط NEXT_PUBLIC_FORM_ENDPOINT في Vercel."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
