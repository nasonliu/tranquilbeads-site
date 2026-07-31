"use client";

import { useEffect } from "react";

import type { Locale } from "@/src/lib/i18n";

export function LocaleDocumentAttributes({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
