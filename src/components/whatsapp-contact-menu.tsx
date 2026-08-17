import { siteSettings } from "@/src/data/site";
import type { Locale } from "@/src/lib/i18n";

type WhatsAppContactMenuProps = {
  locale: Locale;
  variant: "header" | "floating";
};

export function WhatsAppContactMenu({
  locale,
  variant,
}: WhatsAppContactMenuProps) {
  const isFloating = variant === "floating";
  const summaryLabel =
    locale === "ar"
      ? "واتساب"
      : locale === "zh"
        ? "WhatsApp 联系我们"
        : isFloating
          ? "WhatsApp Us"
          : "WhatsApp";

  return (
    <details
      className={
        isFloating
          ? "latin-ui group fixed bottom-5 right-5 z-30 block"
          : "latin-ui group relative hidden sm:block"
      }
    >
      <summary
        className={
          isFloating
            ? "cursor-pointer list-none rounded-full bg-accent-deep px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(28,36,20,0.28)] transition hover:-translate-y-0.5 [&::-webkit-details-marker]:hidden"
            : "cursor-pointer list-none rounded-full border border-accent/30 px-4 py-2 text-sm font-semibold text-accent-deep transition hover:border-accent hover:bg-accent/10 [&::-webkit-details-marker]:hidden"
        }
      >
        {summaryLabel}
      </summary>
      <div
        className={`absolute right-0 w-64 overflow-hidden rounded-2xl border border-border/80 bg-white p-2 text-foreground shadow-[0_18px_45px_rgba(28,36,20,0.22)] ${
          isFloating ? "bottom-full mb-3" : "top-full mt-3"
        }`}
      >
        {siteSettings.whatsappContacts.map((contact) => (
          <a
            key={contact.id}
            href={contact.href}
            target="_blank"
            rel="noreferrer"
            aria-label={contact.label[locale] ?? contact.label.en}
            className="block rounded-xl px-4 py-3 transition hover:bg-accent/10"
          >
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-accent-deep">
              {contact.label[locale] ?? contact.label.en}
            </span>
            <span className="mt-1 block text-sm font-semibold">{locale === "ar" ? "ابدأ المحادثة" : locale === "zh" ? "开始聊天" : "Start chat"}</span>
          </a>
        ))}
      </div>
    </details>
  );
}
