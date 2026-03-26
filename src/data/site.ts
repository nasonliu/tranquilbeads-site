import type { Metadata } from "next";

import type { Locale } from "@/src/lib/i18n";
import { withLocale } from "@/src/lib/i18n";

type LocalizedString = Record<Locale, string>;

type NavItem = {
  href: string;
  label: LocalizedString;
};

type Collection = {
  slug: string;
  name: LocalizedString;
  description: LocalizedString;
  heroImage: string;
  featured: boolean;
  overview: LocalizedString;
  positioning: LocalizedString;
  highlightPoints: Record<Locale, string[]>;
};

type Product = {
  slug: string;
  collection: string;
  title: LocalizedString;
  summary: LocalizedString;
  image: string;
  material: LocalizedString;
  tags: Record<Locale, string[]>;
  detailIntro: LocalizedString;
  detailBody: LocalizedString;
  idealFor: LocalizedString;
  heroAlt: LocalizedString;
  gallery: Array<{
    image: string;
    alt: LocalizedString;
  }>;
  specs: Array<{
    label: LocalizedString;
    value: LocalizedString;
  }>;
};

type ContactFormCopy = {
  title: LocalizedString;
  description: LocalizedString;
  fields: {
    name: LocalizedString;
    company: LocalizedString;
    country: LocalizedString;
    contact: LocalizedString;
    interest: LocalizedString;
    quantity: LocalizedString;
    message: LocalizedString;
  };
  submit: LocalizedString;
  success: LocalizedString;
  validation: {
    name: LocalizedString;
    company: LocalizedString;
    country: LocalizedString;
    contact: LocalizedString;
    interest: LocalizedString;
    quantity: LocalizedString;
    message: LocalizedString;
  };
  whatsappLabel: LocalizedString;
};

export const siteSettings = {
  brandName: "TranquilBeads",
  tagline: {
    en: "Elegant tasbih and Islamic culture products for modern wholesale partners.",
    ar: "تسابيح ومنتجات ثقافية إسلامية راقية لشركاء الجملة والتوزيع.",
  },
  email: "sales@tranquilbeads.com",
  whatsappHref: "https://wa.me/8618929564545",
  whatsappDisplay: "+86 189 2956 4545",
  socialProof: [
    {
      value: "12+",
      label: {
        en: "export markets served",
        ar: "سوق تصدير نخدمه",
      },
    },
    {
      value: "500",
      label: {
        en: "pieces starting MOQ",
        ar: "قطعة كحد أدنى للطلب",
      },
    },
    {
      value: "21",
      label: {
        en: "day average lead time",
        ar: "يومًا متوسط زمن التوريد",
      },
    },
  ],
} as const;

export const navItems: NavItem[] = [
  { href: "/", label: { en: "Home", ar: "الرئيسية" } },
  { href: "/collections", label: { en: "Collections", ar: "المجموعات" } },
  { href: "/wholesale", label: { en: "Wholesale", ar: "الجملة" } },
  { href: "/contact", label: { en: "Contact", ar: "التواصل" } },
];

export const collections: Collection[] = [
  {
    slug: "signature-tasbih",
    name: { en: "Signature Tasbih", ar: "تسابيح مميزة" },
    description: {
      en: "Premium prayer beads in sandalwood, stone, and brushed metallic finishes for modern shelves.",
      ar: "تسابيح راقية من خشب الصندل والحجر والتشطيبات المعدنية الهادئة لعرض عصري.",
    },
    heroImage: "/images/collection-signature.svg",
    featured: true,
    overview: {
      en: "The hero TranquilBeads line for retailers who want tactile materials, premium finishing, and strong everyday sell-through.",
      ar: "الخط الأساسي من ترانكويل بيدز للمتاجر التي تبحث عن خامات ملموسة وتشطيبات راقية ومعدل بيع يومي قوي.",
    },
    positioning: {
      en: "Tasbih-first assortment for boutiques, museum retail, and premium gifting shelves.",
      ar: "تشكيلة ترتكز على التسابيح للبوتيكات ومتاجر المتاحف ورفوف الهدايا الراقية.",
    },
    highlightPoints: {
      en: ["Natural material stories", "Premium shelf presence", "Repeat-order friendly SKUs"],
      ar: ["قصص خامات طبيعية", "حضور فاخر على الرف", "منتجات سهلة إعادة الطلب"],
    },
  },
  {
    slug: "gift-sets",
    name: { en: "Gift-Ready Sets", ar: "مجموعات هدايا جاهزة" },
    description: {
      en: "Curated combinations for Ramadan gifting, cultural retail, and premium hospitality programs.",
      ar: "توليفات منسقة لهدايا رمضان ومتاجر الثقافة وبرامج الضيافة الراقية.",
    },
    heroImage: "/images/collection-gift.svg",
    featured: true,
    overview: {
      en: "Presentation-ready combinations designed for seasonal campaigns, hospitality programs, and corporate gifting.",
      ar: "توليفات جاهزة للعرض صممت للحملات الموسمية وبرامج الضيافة وهدايا الشركات.",
    },
    positioning: {
      en: "Gift-led formats that shorten sourcing decisions for B2B buyers.",
      ar: "صيغ هدايا تقلل زمن اتخاذ القرار لدى مشتري الجملة.",
    },
    highlightPoints: {
      en: ["Seasonal gifting format", "Custom sleeve ready", "Hospitality-friendly"],
      ar: ["صيغة مناسبة للهدايا الموسمية", "جاهز للتغليف المخصص", "مناسب للضيافة"],
    },
  },
  {
    slug: "cultural-accents",
    name: { en: "Cultural Accents", ar: "لمسات ثقافية" },
    description: {
      en: "Bakhoor accessories, keepsake boxes, and Islamic décor pieces that complement tasbih-led assortments.",
      ar: "إكسسوارات البخور وصناديق التذكارات وقطع الديكور الإسلامية المكملة لتشكيلات التسابيح.",
    },
    heroImage: "/images/collection-accents.svg",
    featured: false,
    overview: {
      en: "Supporting cultural objects that round out tasbih assortments with décor, keepsake, and sensory layers.",
      ar: "قطع ثقافية داعمة تكمل تشكيلات التسابيح بلمسات ديكور وتذكارات وحضور حسي.",
    },
    positioning: {
      en: "Add-on products for stores that want a fuller Islamic lifestyle edit.",
      ar: "منتجات إضافية للمتاجر التي تريد تحريرًا أوسع لنمط الحياة الإسلامي.",
    },
    highlightPoints: {
      en: ["Cross-merchandising support", "Décor-driven storytelling", "Gift counter add-ons"],
      ar: ["دعم البيع المتقاطع", "سرد بصري قائم على الديكور", "منتجات إضافية لمنطقة الهدايا"],
    },
  },
];

export const products: Product[] = [export const products: Product[] = [
  {
    slug: "natural-kuka-wood-tasbih",
    title: { en: "Natural Kuka Wood Tasbih", ar: "Natural Kuka Wood Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Natural kuka wood", beads: "33" },
    price: 0,
    image: "/images/real-products/natural-kuka-wood/hero.jpeg",
    images: ["/images/real-products/natural-kuka-wood/hero.jpeg", "/images/real-products/natural-kuka-wood/detail-1.jpeg", "/images/real-products/natural-kuka-wood/detail-2.jpeg", "/images/real-products/natural-kuka-wood/detail-3.jpeg"]
  },
  {
    slug: "golden-hematite-medallion-tasbih",
    title: { en: "Golden Hematite Medallion Tasbih", ar: "Golden Hematite Medallion Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Natural hematite stone", beads: "33" },
    price: 0,
    image: "/images/real-products/golden-hematite/hero.jpeg",
    images: ["/images/real-products/golden-hematite/hero.jpeg", "/images/real-products/golden-hematite/detail-1.jpeg", "/images/real-products/golden-hematite/detail-2.jpeg", "/images/real-products/golden-hematite/detail-3.jpeg"]
  },
  {
    slug: "lacquer-art-33-bead-tasbih",
    title: { en: "Lacquer Art 33-Bead Tasbih", ar: "Lacquer Art 33-Bead Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Artisan resin", beads: "33" },
    price: 0,
    image: "/images/real-products/lacquer-art/hero.jpeg",
    images: ["/images/real-products/lacquer-art/hero.jpeg", "/images/real-products/lacquer-art/detail-1.jpeg", "/images/real-products/lacquer-art/detail-2.jpeg", "/images/real-products/lacquer-art/detail-3.jpeg"]
  },
  {
    slug: "baltic-amber-gift-set",
    title: { en: "Baltic Amber Gift Set", ar: "Baltic Amber Gift Set" },
    collection: "gift-sets",
    specs: { material: "Amber-look bead set with gift box", beads: "33" },
    price: 0,
    image: "/images/real-products/baltic-amber/hero.jpeg",
    images: ["/images/real-products/baltic-amber/hero.jpeg", "/images/real-products/baltic-amber/detail-1.jpeg", "/images/real-products/baltic-amber/detail-2.jpeg", "/images/real-products/baltic-amber/detail-3.jpeg"]
  },
  {
    slug: "terahertz-road-safety-pendant",
    title: { en: "Terahertz Road Safety Pendant", ar: "Terahertz Road Safety Pendant" },
    collection: "cultural-accents",
    specs: { material: "Terahertz stone look", beads: "33" },
    price: 0,
    image: "/images/real-products/terahertz-pendant/hero.jpeg",
    images: ["/images/real-products/terahertz-pendant/hero.jpeg", "/images/real-products/terahertz-pendant/detail-3.jpeg"]
  },
  {
    slug: "silver-sheen-obsidian-tasbih",
    title: { en: "Silver Sheen Obsidian Tasbih", ar: "Silver Sheen Obsidian Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Silver Sheen Obsidian (volcanic glass)", beads: "33" },
    price: 0,
    image: "/images/imported/silver-sheen-obsidian/tasbih-03.jpg",
    images: ["/images/imported/silver-sheen-obsidian/tasbih-03.jpg", "/images/imported/silver-sheen-obsidian/tasbih-12.jpg", "/images/imported/silver-sheen-obsidian/tasbih-22.jpg", "/images/imported/silver-sheen-obsidian/tasbih-23.jpg", "/images/imported/silver-sheen-obsidian/tasbih-24.jpg", "/images/imported/silver-sheen-obsidian/tasbih-40.jpg"]
  },
  {
    slug: "blue-tigers-eye-tasbih",
    title: { en: "Blue Tiger's Eye Tasbih", ar: "Blue Tiger's Eye Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Blue Tiger's Eye (Hawk's Eye)", beads: "33" },
    price: 0,
    image: "/images/imported/blue-tigers-eye/tasbih-01.jpg",
    images: ["/images/imported/blue-tigers-eye/tasbih-01.jpg", "/images/imported/blue-tigers-eye/tasbih-10.jpg", "/images/imported/blue-tigers-eye/tasbih-25.jpg", "/images/imported/blue-tigers-eye/tasbih-26.jpg"]
  },
  {
    slug: "pearl-tasbih",
    title: { en: "Pearl Tasbih", ar: "Pearl Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Pearl", beads: "33" },
    price: 0,
    image: "/images/imported/pearl-tasbih/size.jpg",
    images: ["/images/imported/pearl-tasbih/size.jpg", "/images/imported/pearl-tasbih/tasbih-45.jpg", "/images/imported/pearl-tasbih/tasbih-46.jpg", "/images/imported/pearl-tasbih/tasbih-47.jpg", "/images/imported/pearl-tasbih/tasbih-50.jpg", "/images/imported/pearl-tasbih/tasbih-51.jpg"]
  },
  {
    slug: "obsidian-tasbih",
    title: { en: "Obsidian Tasbih", ar: "Obsidian Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Obsidian", beads: "33" },
    price: 0,
    image: "/images/imported/obsidian-tasbih/size.jpg",
    images: ["/images/imported/obsidian-tasbih/size.jpg", "/images/imported/obsidian-tasbih/tasbih-03.jpg", "/images/imported/obsidian-tasbih/tasbih-12.jpg", "/images/imported/obsidian-tasbih/tasbih-22.jpg", "/images/imported/obsidian-tasbih/tasbih-23.jpg", "/images/imported/obsidian-tasbih/tasbih-24.jpg"]
  },
  {
    slug: "resin-tasbih",
    title: { en: "Resin Tasbih", ar: "Resin Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Resin", beads: "33" },
    price: 0,
    image: "/images/imported/resin-tasbih/resin-01.jpg",
    images: ["/images/imported/resin-tasbih/resin-01.jpg", "/images/imported/resin-tasbih/resin-02.jpg", "/images/imported/resin-tasbih/resin-03.jpg", "/images/imported/resin-tasbih/resin-04.jpg", "/images/imported/resin-tasbih/resin-05.jpg", "/images/imported/resin-tasbih/resin-06.jpg"]
  },
  {
    slug: "crystal-tasbih",
    title: { en: "Crystal Tasbih", ar: "Crystal Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Crystal", beads: "33" },
    price: 0,
    image: "/images/imported/crystal-tasbih/size.jpg",
    images: ["/images/imported/crystal-tasbih/size.jpg", "/images/imported/crystal-tasbih/tasbih-16.jpg", "/images/imported/crystal-tasbih/tasbih-17.jpg", "/images/imported/crystal-tasbih/tasbih-43.jpg", "/images/imported/crystal-tasbih/tasbih-49.jpg", "/images/imported/crystal-tasbih/tasbih-52.jpg"]
  },
  {
    slug: "kechainrose",
    title: { en: "Kechain Rose Tasbih", ar: "Kechain Rose Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Rose Crystal", beads: "33" },
    price: 0,
    image: "/images/imported/kechainrose/phone.jpg",
    images: ["/images/imported/kechainrose/phone.jpg", "/images/imported/kechainrose/rose-01.jpg", "/images/imported/kechainrose/rose-02.jpg", "/images/imported/kechainrose/rose-03.jpg", "/images/imported/kechainrose/rose-04.jpg", "/images/imported/kechainrose/rose-05.jpg"]
  },
  {
    slug: "pocket",
    title: { en: "Pocket Tiger Eye Tasbih", ar: "Pocket Tiger Eye Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Mixed Material", beads: "33" },
    price: 0,
    image: "/images/imported/pocket/size.jpg",
    images: ["/images/imported/pocket/size.jpg", "/images/imported/pocket/tasbih-060.jpg", "/images/imported/pocket/tasbih-061.jpg", "/images/imported/pocket/tasbih-062.jpg", "/images/imported/pocket/tasbih-072.jpg", "/images/imported/pocket/tasbih-073.jpg"]
  },
  {
    slug: "99-pla",
    title: { en: "99-Bead Plastic Tasbih", ar: "99-Bead Plastic Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Mixed Material", beads: "33" },
    price: 0,
    image: "/images/imported/99-pla/size.jpg",
    images: ["/images/imported/99-pla/size.jpg", "/images/imported/99-pla/tasbih-053.jpg", "/images/imported/99-pla/tasbih-054.jpg", "/images/imported/99-pla/tasbih-085.jpg", "/images/imported/99-pla/tasbih-104.jpg", "/images/imported/99-pla/tasbih-105.jpg"]
  },
  {
    slug: "zebra",
    title: { en: "Zebra Agate Tasbih", ar: "Zebra Agate Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Mixed Material", beads: "33" },
    price: 0,
    image: "/images/imported/zebra/main.jpg",
    images: ["/images/imported/zebra/main.jpg", "/images/imported/zebra/size.jpg", "/images/imported/zebra/tasbih-07.jpg", "/images/imported/zebra/tasbih-17.jpg", "/images/imported/zebra/tasbih-21.jpg", "/images/imported/zebra/tasbih-31.jpg"]
  },
  {
    slug: "watergrass",
    title: { en: "Water Grass Agate Tasbih", ar: "Water Grass Agate Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Mixed Material", beads: "33" },
    price: 0,
    image: "/images/imported/watergrass/main.jpg",
    images: ["/images/imported/watergrass/main.jpg", "/images/imported/watergrass/size.jpg", "/images/imported/watergrass/tasbih-08.jpg", "/images/imported/watergrass/tasbih-14.jpg", "/images/imported/watergrass/tasbih-15.jpg", "/images/imported/watergrass/tasbih-18.jpg"]
  },
  {
    slug: "orangeagate",
    title: { en: "Orange Agate Tasbih", ar: "Orange Agate Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Agate", beads: "33" },
    price: 0,
    image: "/images/imported/orangeagate/main.jpg",
    images: ["/images/imported/orangeagate/main.jpg", "/images/imported/orangeagate/size.jpg", "/images/imported/orangeagate/tasbih-04.jpg", "/images/imported/orangeagate/tasbih-12.jpg", "/images/imported/orangeagate/tasbih-23.jpg", "/images/imported/orangeagate/tasbih-28.jpg"]
  },
  {
    slug: "bluetiger",
    title: { en: "Blue Tiger Agate Tasbih", ar: "Blue Tiger Agate Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Tiger Eye", beads: "33" },
    price: 0,
    image: "/images/imported/bluetiger/main.jpg",
    images: ["/images/imported/bluetiger/main.jpg", "/images/imported/bluetiger/size.jpg", "/images/imported/bluetiger/tasbih-06.jpg", "/images/imported/bluetiger/tasbih-13.jpg", "/images/imported/bluetiger/tasbih-22.jpg", "/images/imported/bluetiger/tasbih-29.jpg"]
  },
  {
    slug: "blackagate",
    title: { en: "Black Agate Tasbih", ar: "Black Agate Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Agate", beads: "33" },
    price: 0,
    image: "/images/imported/blackagate/main.jpg",
    images: ["/images/imported/blackagate/main.jpg", "/images/imported/blackagate/size.jpg", "/images/imported/blackagate/tasbih-03.jpg", "/images/imported/blackagate/tasbih-19.jpg", "/images/imported/blackagate/tasbih-32.jpg", "/images/imported/blackagate/tasbih-40.jpg"]
  },
  {
    slug: "oud2",
    title: { en: "Oud Wood Tasbih 2", ar: "Oud Wood Tasbih 2" },
    collection: "signature-tasbih",
    specs: { material: "Wood", beads: "33" },
    price: 0,
    image: "/images/imported/oud2/size.jpg",
    images: ["/images/imported/oud2/size.jpg", "/images/imported/oud2/tasbih-03.jpg", "/images/imported/oud2/tasbih-08.jpg", "/images/imported/oud2/tasbih-09.jpg", "/images/imported/oud2/tasbih-25.jpg", "/images/imported/oud2/tasbih-26.jpg"]
  },
  {
    slug: "shoushan",
    title: { en: "Shoushan Agate Tasbih", ar: "Shoushan Agate Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Natural Stone", beads: "33" },
    price: 0,
    image: "/images/imported/shoushan/ambertasbish-100.jpg",
    images: ["/images/imported/shoushan/ambertasbish-100.jpg", "/images/imported/shoushan/ambertasbish-101.jpg", "/images/imported/shoushan/ambertasbish-102.jpg", "/images/imported/shoushan/ambertasbish-103.jpg", "/images/imported/shoushan/ambertasbish-36.jpg"]
  },
  {
    slug: "oval-orange",
    title: { en: "Oval Orange Agate Tasbih", ar: "Oval Orange Agate Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Mixed Material", beads: "33" },
    price: 0,
    image: "/images/imported/oval-orange/ambertasbish-094.jpg",
    images: ["/images/imported/oval-orange/ambertasbish-094.jpg", "/images/imported/oval-orange/ambertasbish-095.jpg", "/images/imported/oval-orange/ambertasbish-38.jpg", "/images/imported/oval-orange/ambertasbish-50.jpg", "/images/imported/oval-orange/ambertasbish-60.jpg", "/images/imported/oval-orange/ambertasbish-74.jpg"]
  },
  {
    slug: "faceted-orange",
    title: { en: "Faceted Orange Agate Tasbih", ar: "Faceted Orange Agate Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Natural Agate", beads: "33" },
    price: 0,
    image: "/images/imported/faceted-orange/ambertasbish-104.jpg",
    images: ["/images/imported/faceted-orange/ambertasbish-104.jpg", "/images/imported/faceted-orange/ambertasbish-105.jpg", "/images/imported/faceted-orange/ambertasbish-41.jpg", "/images/imported/faceted-orange/ambertasbish-47.jpg", "/images/imported/faceted-orange/ambertasbish-66.jpg", "/images/imported/faceted-orange/ambertasbish-70.jpg"]
  },
  {
    slug: "redwhiteglass",
    title: { en: "Red White Glass Tasbih", ar: "Red White Glass Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Glass", beads: "33" },
    price: 0,
    image: "/images/imported/redwhiteglass/amber-097.jpg",
    images: ["/images/imported/redwhiteglass/amber-097.jpg", "/images/imported/redwhiteglass/amber-098.jpg", "/images/imported/redwhiteglass/amber-099.jpg", "/images/imported/redwhiteglass/amber-100.jpg"]
  },
  {
    slug: "greenresin",
    title: { en: "Green Resin Tasbih", ar: "Green Resin Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Resin", beads: "33" },
    price: 0,
    image: "/images/imported/greenresin/amber-094.jpg",
    images: ["/images/imported/greenresin/amber-094.jpg", "/images/imported/greenresin/amber-110.jpg", "/images/imported/greenresin/amber-115.jpg", "/images/imported/greenresin/amber-116.jpg", "/images/imported/greenresin/amber-117.jpg"]
  },
  {
    slug: "ambercube33",
    title: { en: "Amber Cube 33-Bead Tasbih", ar: "Amber Cube 33-Bead Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Amber", beads: "33" },
    price: 0,
    image: "/images/imported/ambercube33/amber-53.jpg",
    images: ["/images/imported/ambercube33/amber-53.jpg", "/images/imported/ambercube33/amber-60.jpg", "/images/imported/ambercube33/amber-63.jpg"]
  },
  {
    slug: "colorchangecube",
    title: { en: "Color Change Cube Tasbih", ar: "Color Change Cube Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Mixed Material", beads: "33" },
    price: 0,
    image: "/images/imported/colorchangecube/C0020T01.jpg",
    images: ["/images/imported/colorchangecube/C0020T01.jpg", "/images/imported/colorchangecube/DSC01400.jpg", "/images/imported/colorchangecube/_DSC1321.jpg", "/images/imported/colorchangecube/_DSC1337.jpg", "/images/imported/colorchangecube/_DSC1345.jpg", "/images/imported/colorchangecube/_DSC1363-Enhanced-NR.jpg"]
  },
  {
    slug: "whiteagate33-s",
    title: { en: "White Agate 33-Bead Special Tasbih", ar: "White Agate 33-Bead Special Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Agate", beads: "33" },
    price: 0,
    image: "/images/imported/whiteagate33-s/ram-23.jpg",
    images: ["/images/imported/whiteagate33-s/ram-23.jpg", "/images/imported/whiteagate33-s/ram-24.jpg", "/images/imported/whiteagate33-s/ram-30.jpg", "/images/imported/whiteagate33-s/ram-31.jpg", "/images/imported/whiteagate33-s/ram-32.jpg", "/images/imported/whiteagate33-s/ram-35.jpg"]
  },
  {
    slug: "greenagate99",
    title: { en: "Green Agate 99-Bead Tasbih", ar: "Green Agate 99-Bead Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Agate", beads: "33" },
    price: 0,
    image: "/images/imported/greenagate99/ram-01.jpg",
    images: ["/images/imported/greenagate99/ram-01.jpg", "/images/imported/greenagate99/ram-02.jpg", "/images/imported/greenagate99/ram-08.jpg", "/images/imported/greenagate99/ram-09.jpg", "/images/imported/greenagate99/ram-10.jpg", "/images/imported/greenagate99/ram-14.jpg"]
  },
  {
    slug: "glass-smoke",
    title: { en: "Smoke Glass Tasbih", ar: "Smoke Glass Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Glass", beads: "33" },
    price: 0,
    image: "/images/imported/glass-smoke/main.jpg",
    images: ["/images/imported/glass-smoke/main.jpg", "/images/imported/glass-smoke/ram-03.jpg", "/images/imported/glass-smoke/ram-04.jpg", "/images/imported/glass-smoke/ram-13.jpg", "/images/imported/glass-smoke/ram-20.jpg", "/images/imported/glass-smoke/ram-21.jpg"]
  },
  {
    slug: "glass-champon",
    title: { en: "Champon Glass Tasbih", ar: "Champon Glass Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Glass", beads: "33" },
    price: 0,
    image: "/images/imported/glass-champon/main.jpg",
    images: ["/images/imported/glass-champon/main.jpg", "/images/imported/glass-champon/ram-05.jpg", "/images/imported/glass-champon/ram-06.jpg", "/images/imported/glass-champon/ram-07.jpg", "/images/imported/glass-champon/ram-11.jpg", "/images/imported/glass-champon/ram-12.jpg"]
  },
  {
    slug: "lumnousglass99",
    title: { en: "Luminous Glass 99-Bead Tasbih", ar: "Luminous Glass 99-Bead Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Glass", beads: "33" },
    price: 0,
    image: "/images/imported/lumnousglass99/com.jpg",
    images: ["/images/imported/lumnousglass99/com.jpg", "/images/imported/lumnousglass99/new-02.jpg", "/images/imported/lumnousglass99/new-03.jpg", "/images/imported/lumnousglass99/new-04.jpg", "/images/imported/lumnousglass99/new-05.jpg", "/images/imported/lumnousglass99/new-06.jpg"]
  },
  {
    slug: "99blackrosewood",
    title: { en: "Black Rosewood 99-Bead Tasbih", ar: "Black Rosewood 99-Bead Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Wood", beads: "33" },
    price: 0,
    image: "/images/imported/99blackrosewood/main.jpg",
    images: ["/images/imported/99blackrosewood/main.jpg", "/images/imported/99blackrosewood/newwood-03.jpg", "/images/imported/99blackrosewood/newwood-04.jpg", "/images/imported/99blackrosewood/newwood-06.jpg", "/images/imported/99blackrosewood/newwood-29.jpg", "/images/imported/99blackrosewood/newwood-36.jpg"]
  },
  {
    slug: "33shellbar",
    title: { en: "Shell Bar 33-Bead Tasbih", ar: "Shell Bar 33-Bead Tasbih" },
    collection: "signature-tasbih",
    specs: { material: "Shell", beads: "33" },
    price: 0,
    image: "/images/imported/33shellbar/ambertest-8.jpg",
    images: ["/images/imported/33shellbar/ambertest-8.jpg", "/images/imported/33shellbar/main.jpg", "/images/imported/33shellbar/shellnew-05.jpg", "/images/imported/33shellbar/shellnew-06.jpg", "/images/imported/33shellbar/shellnew-14.jpg", "/images/imported/33shellbar/shellnew-15.jpg"]
  }
];
];
}

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getCollectionBySlug(slug: string) {
  return collections.find((collection) => collection.slug === slug);
}

export function getProductsByCollection(collectionSlug: string) {
  return products.filter((product) => product.collection === collectionSlug);
}
