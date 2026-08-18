import { z } from "zod";

const localizedText = z.object({
  en: z.string().trim().min(1).max(240),
  ar: z.string().trim().min(1).max(240),
}).strict();

const localizedBody = z.object({
  en: z.string().trim().min(1).max(800),
  ar: z.string().trim().min(1).max(800),
}).strict();

const imageReference = z.string().trim().min(1).max(2_000).refine((value) => {
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "invalid image reference");

const internalHref = z.string().trim().min(1).max(500).refine(
  (value) => value.startsWith("/") && !value.startsWith("//"),
  "invalid internal href",
);

export const homepageHeroSchema = z.object({
  image: imageReference,
  imageAlt: localizedText,
  title: localizedText,
  body: localizedBody,
  primaryLabel: localizedText,
  primaryHref: internalHref,
  secondaryLabel: localizedText,
  secondaryHref: internalHref,
}).strict();

export const homepageEditCardSchema = z.object({
  image: imageReference,
  title: localizedText,
  body: localizedBody,
  action: localizedText,
  href: internalHref,
}).strict();

export const homepageConfigSchema = z.object({
  hero: homepageHeroSchema,
  edits: z.array(homepageEditCardSchema).length(3),
  featuredProductSkus: z.array(z.string().trim().min(1).max(100)).max(5).refine(
    (items) => new Set(items).size === items.length,
    "duplicate featured product",
  ),
}).strict();

export type HomepageConfig = z.infer<typeof homepageConfigSchema>;

export const defaultHomepageConfig: HomepageConfig = {
  hero: {
    image: "/images/real-products/natural-kuka-wood/hero.jpeg",
    imageAlt: { en: "Natural kuka tasbih in a gift box", ar: "سبحة كوكا في صندوق هدية" },
    title: { en: "A meaningful gift, chosen with care", ar: "هدية ذات معنى، مختارة بعناية" },
    body: {
      en: "Handcrafted tasbih in amber, stone, and kuka. Timeless pieces for reflection, celebration, and everyday devotion.",
      ar: "تسابيح من الكهرمان والحجر وخشب الكوكا، صممت للتأمل والاحتفاء والذكر اليومي.",
    },
    primaryLabel: { en: "Shop gifts", ar: "تسوّق الهدايا" },
    primaryHref: "/shop",
    secondaryLabel: { en: "Discover amber", ar: "اكتشف الكهرمان" },
    secondaryHref: "/shop?material=Amber",
  },
  edits: [
    {
      image: "/images/factory-packaging.jpg",
      title: { en: "The gifting edit", ar: "مختارات الهدايا" },
      body: { en: "Curated for Ramadan, Eid, weddings, and life’s meaningful milestones.", ar: "اختيارات لرمضان والعيد والأعراس ولحظات الحياة المهمة." },
      action: { en: "Explore", ar: "استكشف" },
      href: "/shop",
    },
    {
      image: "/images/imported/faceted-orange/ambertasbish-66.jpg",
      title: { en: "Shop by material", ar: "تسوّق حسب الخامة" },
      body: { en: "Amber, stone, kuka wood, and luminous finishes.", ar: "كهرمان وحجر وخشب كوكا وتشطيبات مضيئة." },
      action: { en: "Explore", ar: "استكشف" },
      href: "/shop?material=Amber",
    },
    {
      image: "/images/noon/black-hematite-99.jpg",
      title: { en: "Find your count", ar: "اختر عدد الحبات" },
      body: { en: "Choose from 33, 45, and 99-bead designs.", ar: "تصاميم من 33 و45 و99 حبة." },
      action: { en: "Explore", ar: "استكشف" },
      href: "/shop?beadCount=99",
    },
  ],
  featuredProductSkus: [],
};

export function selectHomepageProducts<T extends { sku: string }>(products: T[], featuredSkus: string[]) {
  const bySku = new Map(products.map((product) => [product.sku, product]));
  const selected = featuredSkus.map((sku) => bySku.get(sku)).filter((product): product is T => Boolean(product));
  const selectedSkus = new Set(selected.map((product) => product.sku));
  return [...selected, ...products.filter((product) => !selectedSkus.has(product.sku))].slice(0, 5);
}
