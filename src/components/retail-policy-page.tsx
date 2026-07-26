import { getRetailPolicy, type RetailPolicyKey } from "@/src/data/retail/policies";
import type { Locale } from "@/src/lib/i18n";

export function RetailPolicyPage({ locale, policyKey }: { locale: Locale; policyKey: RetailPolicyKey }) {
  const policy = getRetailPolicy(locale, policyKey);

  return (
    <article className="noor-container max-w-4xl space-y-8 py-10 sm:py-14">
      <header className="rounded-[1.75rem] border border-accent/20 bg-white/65 p-6 sm:p-10">
        <p className="noor-kicker text-xs font-semibold text-accent-deep">{policy.eyebrow}</p>
        <h1 className="noor-title mt-3 text-4xl sm:text-5xl">{policy.title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">{policy.introduction}</p>
      </header>
      <div className="space-y-5">
        {policy.sections.map((section) => (
          <section key={section.heading} className="rounded-[1.5rem] border border-border/80 bg-white/55 p-6 sm:p-8">
            <h2 className="noor-title text-2xl sm:text-3xl">{section.heading}</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-muted sm:text-base sm:leading-8">
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
