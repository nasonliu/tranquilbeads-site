export const locales = ["en", "ar", "zh"] as const;
export const wholesaleLocales = ["en", "ar"] as const;

export type Locale = (typeof locales)[number];
export type WholesaleLocale = (typeof wholesaleLocales)[number];
export type Direction = "ltr" | "rtl";

export const defaultLocale = "en" satisfies Locale;

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function isWholesaleLocale(value: string): value is WholesaleLocale {
  return wholesaleLocales.includes(value as WholesaleLocale);
}

export function getDir(locale: Locale): Direction {
  return locale === "ar" ? "rtl" : "ltr";
}

export function getLocaleLabel(locale: Locale) {
  return locale === "ar" ? "العربية" : locale === "zh" ? "中文" : "English";
}

export function withLocale(locale: Locale, path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath === "/" ? `/${locale}` : `/${locale}${normalizedPath}`;
}
