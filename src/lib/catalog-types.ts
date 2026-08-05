import type { Locale, WholesaleLocale } from "@/src/lib/i18n";

/** The legacy wholesale catalog is bilingual; Chinese belongs to direct retail. */
export type LocalizedString = Record<WholesaleLocale, string> &
  Partial<Record<Exclude<Locale, WholesaleLocale>, string>>;

export type SocialProofItem = {
  value: string;
  label: LocalizedString;
};

export type WhatsAppContact = {
  id: string;
  label: LocalizedString;
  href: string;
  display: string;
};

export type SiteSettings = {
  brandName: string;
  tagline: LocalizedString;
  email: string;
  whatsappHref: string;
  whatsappDisplay: string;
  whatsappContacts?: WhatsAppContact[];
  socialProof: SocialProofItem[];
};

export type Collection = {
  slug: string;
  name: LocalizedString;
  description: LocalizedString;
  heroImage: string;
  featured: boolean;
  overview: LocalizedString;
  positioning: LocalizedString;
  highlightPoints: Record<WholesaleLocale, string[]> &
    Partial<Record<Exclude<Locale, WholesaleLocale>, string[]>>;
};

export type ProductGalleryItem = {
  image: string;
  alt: LocalizedString;
};

export type ProductSpec = {
  key?: string;
  label: LocalizedString;
  value: LocalizedString;
};

export type Product = {
  slug: string;
  collection: string;
  title: LocalizedString;
  summary: LocalizedString;
  image: string;
  material: LocalizedString;
  tags: Record<WholesaleLocale, string[]> &
    Partial<Record<Exclude<Locale, WholesaleLocale>, string[]>>;
  detailIntro: LocalizedString;
  detailBody: LocalizedString;
  idealFor: LocalizedString;
  heroAlt: LocalizedString;
  gallery: ProductGalleryItem[];
  specs: ProductSpec[];
};

export type SiteContent = {
  siteSettings: SiteSettings;
  collections: Collection[];
  products: Product[];
};

export type ProductImportImage = {
  url: string;
  alt: Partial<LocalizedString>;
};

export type ProductImportSpec = {
  key?: string;
  label: Partial<LocalizedString>;
  value: Partial<LocalizedString>;
};

export type ProductImportRecord = {
  slug?: string;
  status?: "active" | "draft";
  sort_order?: number;
  collection_slug: string;
  featured?: boolean;
  title: Partial<LocalizedString>;
  summary: Partial<LocalizedString>;
  material: Partial<LocalizedString>;
  tags: Partial<Record<Locale, string[]>>;
  detail_intro: Partial<LocalizedString>;
  detail_body: Partial<LocalizedString>;
  ideal_for: Partial<LocalizedString>;
  hero_image: ProductImportImage;
  gallery: ProductImportImage[];
  specs: ProductImportSpec[];
};

export type ProductImportPayload = {
  products: ProductImportRecord[];
};
