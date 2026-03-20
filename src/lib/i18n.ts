export const locales = ["en", "ar"] as const;

export type Locale = (typeof locales)[number];
export type Direction = "ltr" | "rtl";

export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getDir(locale: Locale): Direction {
  return locale === "ar" ? "rtl" : "ltr";
}

export function getLocaleLabel(locale: Locale) {
  return locale === "ar" ? "العربية" : "English";
}

export function withLocale(locale: Locale, path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath === "/" ? `/${locale}` : `/${locale}${normalizedPath}`;
}
