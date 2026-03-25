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

export const products: Product[] = [
  {
    slug: "natural-kuka-wood-tasbih",
    collection: "signature-tasbih",
    title: { en: "Natural Kuka Wood Tasbih", ar: "سبحة كوكا خشبية طبيعية" },
    summary: {
      en: "A 33-bead natural wood tasbih with a calm vintage tone and a presentation-ready gift box.",
      ar: "سبحة من 33 حبة من خشب طبيعي بطابع هادئ ولمسة كلاسيكية مع صندوق هدية جاهز للعرض.",
    },
    image: "/images/real-products/natural-kuka-wood/hero.jpeg",
    material: { en: "Natural kuka wood", ar: "خشب كوكا طبيعي" },
    tags: {
      en: ["Natural material", "Gift box", "Daily dhikr"],
      ar: ["خامة طبيعية", "علبة هدية", "للذكر اليومي"],
    },
    detailIntro: {
      en: "One of the cleanest commercial tasbih directions in the current assortment, with natural wood character and a steady 33-bead format.",
      ar: "واحدة من أكثر اتجاهات التسابيح التجارية توازنًا في التشكيلة الحالية، مع حضور الخشب الطبيعي وصيغة 33 حبة الواضحة.",
    },
    detailBody: {
      en: "Selected from your current goods list, this item translates well to B2B because it is easy to understand on shelf: natural material story, modest profile, and gifting-ready packaging without looking over-designed.",
      ar: "تم اختيار هذه القطعة من قائمة بضائعك الحالية لأنها مناسبة جدًا لعرض B2B: قصة خامة طبيعية واضحة، مظهر متوازن، وتغليف هدايا جاهز دون مبالغة بصرية.",
    },
    idealFor: {
      en: "Built for boutiques, Ramadan gifting, and museum-style retail.",
      ar: "مناسبة للبوتيكات وهدايا رمضان ومتاجر التجزئة ذات الطابع الثقافي.",
    },
    heroAlt: {
      en: "Natural Kuka Wood Tasbih hero",
      ar: "الصورة الرئيسية لسبحة الكوكا الطبيعية",
    },
    gallery: [
      {
        image: "/images/real-products/natural-kuka-wood/detail-1.jpeg",
        alt: {
          en: "Natural Kuka Wood Tasbih detail 1",
          ar: "تفصيل 1 لسبحة الكوكا الطبيعية",
        },
      },
      {
        image: "/images/real-products/natural-kuka-wood/detail-2.jpeg",
        alt: {
          en: "Natural Kuka Wood Tasbih detail 2",
          ar: "تفصيل 2 لسبحة الكوكا الطبيعية",
        },
      },
      {
        image: "/images/real-products/natural-kuka-wood/detail-3.jpeg",
        alt: {
          en: "Natural Kuka Wood Tasbih detail 3",
          ar: "تفصيل 3 لسبحة الكوكا الطبيعية",
        },
      },
    ],
    specs: [
      {
        label: { en: "Bead count", ar: "عدد الحبات" },
        value: { en: "33 beads", ar: "33 حبة" },
      },
      {
        label: { en: "Material", ar: "الخامة" },
        value: { en: "Natural kuka wood", ar: "خشب كوكا طبيعي" },
      },
      {
        label: { en: "Packaging", ar: "التغليف" },
        value: { en: "Gift box included", ar: "يتضمن علبة هدية" },
      },
    ],
  },
  {
    slug: "golden-hematite-medallion-tasbih",
    collection: "signature-tasbih",
    title: { en: "Golden Hematite Medallion Tasbih", ar: "سبحة هيماتيت ذهبية بمدالية" },
    summary: {
      en: "A polished 33-bead hematite tasbih finished with golden accents and an Islamic medallion pendant.",
      ar: "سبحة هيماتيت من 33 حبة مع لمسات ذهبية ومدالية إسلامية تضيف حضورًا مميزًا.",
    },
    image: "/images/real-products/golden-hematite/hero.jpeg",
    material: { en: "Natural hematite stone", ar: "حجر هيماتيت طبيعي" },
    tags: {
      en: ["Metallic accents", "Executive gifting", "Premium presence"],
      ar: ["لمسات معدنية", "هدايا راقية", "حضور فاخر"],
    },
    detailIntro: {
      en: "This one reads immediately as premium, which makes it strong for higher-ticket gifting edits and more formal retail shelves.",
      ar: "تظهر هذه القطعة بطابع فاخر مباشر، ما يجعلها قوية للهدايا الأعلى قيمة ولرفوف البيع الأكثر رسمية.",
    },
    detailBody: {
      en: "From your downloaded product list, this SKU has one of the clearest luxury signals: stone body, metallic rhythm, medallion focal point, and gift-box positioning that works well for Ramadan and Eid programs.",
      ar: "من قائمتك الحالية، يحمل هذا المنتج أوضح إشارات الفخامة: جسم حجري، إيقاع معدني، نقطة تركيز عبر المدالية، وتموضع مناسب لصناديق الهدايا في رمضان والعيد.",
    },
    idealFor: {
      en: "Ideal for executive gifting, premium Ramadan edits, and boutique display walls.",
      ar: "مناسب للهدايا التنفيذية وتحريرات رمضان الفاخرة وجدران العرض الراقية.",
    },
    heroAlt: {
      en: "Golden Hematite Medallion Tasbih hero",
      ar: "الصورة الرئيسية لسبحة الهيماتيت الذهبية",
    },
    gallery: [
      {
        image: "/images/real-products/golden-hematite/detail-1.jpeg",
        alt: { en: "Golden Hematite Medallion Tasbih detail 1", ar: "تفصيل 1 لسبحة الهيماتيت الذهبية" },
      },
      {
        image: "/images/real-products/golden-hematite/detail-2.jpeg",
        alt: { en: "Golden Hematite Medallion Tasbih detail 2", ar: "تفصيل 2 لسبحة الهيماتيت الذهبية" },
      },
      {
        image: "/images/real-products/golden-hematite/detail-3.jpeg",
        alt: { en: "Golden Hematite Medallion Tasbih detail 3", ar: "تفصيل 3 لسبحة الهيماتيت الذهبية" },
      },
    ],
    specs: [
      {
        label: { en: "Bead count", ar: "عدد الحبات" },
        value: { en: "33 beads", ar: "33 حبة" },
      },
      {
        label: { en: "Accent", ar: "اللمسة" },
        value: { en: "Golden separators and medallion pendant", ar: "فواصل ذهبية ومدالية معلقة" },
      },
      {
        label: { en: "Packaging", ar: "التغليف" },
        value: { en: "Gift box presentation", ar: "عرض داخل علبة هدية" },
      },
    ],
  },
  {
    slug: "lacquer-art-33-bead-tasbih",
    collection: "signature-tasbih",
    title: { en: "Lacquer Art 33-Bead Tasbih", ar: "سبحة 33 حبة بتقنية لاكير فنية" },
    summary: {
      en: "Multicolor prayer beads with a smooth lacquer finish and a more contemporary visual language.",
      ar: "سبحة متعددة الألوان بتشطيب لاكير ناعم وطابع بصري أكثر حداثة.",
    },
    image: "/images/real-products/lacquer-art/hero.jpeg",
    material: { en: "Artisan resin", ar: "ريزن حرفي" },
    tags: {
      en: ["Younger retail", "Multicolor finish", "Accessible gifting"],
      ar: ["تجزئة شبابية", "تشطيب متعدد الألوان", "هدية سهلة الاختيار"],
    },
    detailIntro: {
      en: "This piece broadens the line beyond classic wood and stone, giving the assortment a younger and more playful entry point.",
      ar: "توسع هذه القطعة التشكيلة إلى ما بعد الخشب والحجر الكلاسيكيين، وتمنحها نقطة دخول أكثر شبابًا وخفة.",
    },
    detailBody: {
      en: "Selected from the current list because it adds visual range, this SKU is useful when you want the website to show that TranquilBeads can serve both classic Islamic gifting and more design-forward retail channels.",
      ar: "تم اختيارها من قائمتك الحالية لأنها توسع المدى البصري للتشكيلة، وتوضح أن TranquilBeads قادر على خدمة الهدايا الإسلامية الكلاسيكية وقنوات التجزئة الأكثر حداثة في الوقت نفسه.",
    },
    idealFor: {
      en: "Best for younger gifting audiences, concept stores, and mixed-material shelves.",
      ar: "أنسب للهدايا الموجهة لجمهور أصغر سنًا، ولمتاجر المفهوم، ورفوف العرض متعددة الخامات.",
    },
    heroAlt: {
      en: "Lacquer Art 33-Bead Tasbih hero",
      ar: "الصورة الرئيسية لسبحة اللاكير الفنية",
    },
    gallery: [
      {
        image: "/images/real-products/lacquer-art/detail-1.jpeg",
        alt: { en: "Lacquer Art 33-Bead Tasbih detail 1", ar: "تفصيل 1 لسبحة اللاكير الفنية" },
      },
      {
        image: "/images/real-products/lacquer-art/detail-2.jpeg",
        alt: { en: "Lacquer Art 33-Bead Tasbih detail 2", ar: "تفصيل 2 لسبحة اللاكير الفنية" },
      },
      {
        image: "/images/real-products/lacquer-art/detail-3.jpeg",
        alt: { en: "Lacquer Art 33-Bead Tasbih detail 3", ar: "تفصيل 3 لسبحة اللاكير الفنية" },
      },
    ],
    specs: [
      {
        label: { en: "Bead count", ar: "عدد الحبات" },
        value: { en: "33 beads", ar: "33 حبة" },
      },
      {
        label: { en: "Material", ar: "الخامة" },
        value: { en: "Resin body with lacquer technique", ar: "جسم من الريزن مع تقنية لاكير" },
      },
      {
        label: { en: "Positioning", ar: "التموضع" },
        value: { en: "Contemporary entry tasbih", ar: "سبحة عصرية ضمن المدخل السعري" },
      },
    ],
  },
  {
    slug: "baltic-amber-gift-set",
    collection: "gift-sets",
    title: { en: "Baltic Amber Gift Set", ar: "مجموعة هدية من الكهرمان البلطيقي" },
    summary: {
      en: "A 33-bead amber-look tasbih presented as a premium gifting set for Ramadan and Eid campaigns.",
      ar: "سبحة بطابع الكهرمان من 33 حبة مقدمة كطقم هدايا فاخر لحملات رمضان والعيد.",
    },
    image: "/images/real-products/baltic-amber/hero.jpeg",
    material: { en: "Amber-look bead set with gift box", ar: "مجموعة بطابع الكهرمان مع علبة هدية" },
    tags: {
      en: ["Seasonal gifting", "Presentation box", "Higher gift value"],
      ar: ["هدايا موسمية", "صندوق عرض", "قيمة هدية أعلى"],
    },
    detailIntro: {
      en: "This is the kind of item that helps the site feel more commercial for B2B buyers because the gifting use case is instantly clear.",
      ar: "هذا النوع من المنتجات يجعل الموقع أكثر إقناعًا لمشتري B2B لأن استخدامه كهدية واضح ومباشر منذ النظرة الأولى.",
    },
    detailBody: {
      en: "Pulled from your current goods list, the amber direction works well as a campaign product: strong color story, emotional gifting signal, and better perceived value than a plain single-item card.",
      ar: "تم سحب هذا الاتجاه من قائمتك الحالية، وهو يعمل جيدًا كمنتج حملات: لون قوي، إشارة هدية واضحة، وقيمة مدركة أعلى من عرض المنتج المفرد.",
    },
    idealFor: {
      en: "Great for Ramadan drops, Eid gifting, and premium souvenir counters.",
      ar: "ممتاز لإطلاقات رمضان، وهدايا العيد، ونقاط بيع التذكارات الراقية.",
    },
    heroAlt: {
      en: "Baltic Amber Gift Set hero",
      ar: "الصورة الرئيسية لمجموعة هدية الكهرمان البلطيقي",
    },
    gallery: [
      {
        image: "/images/real-products/baltic-amber/detail-1.jpeg",
        alt: { en: "Baltic Amber Gift Set detail 1", ar: "تفصيل 1 لمجموعة هدية الكهرمان" },
      },
      {
        image: "/images/real-products/baltic-amber/detail-2.jpeg",
        alt: { en: "Baltic Amber Gift Set detail 2", ar: "تفصيل 2 لمجموعة هدية الكهرمان" },
      },
      {
        image: "/images/real-products/baltic-amber/detail-3.jpeg",
        alt: { en: "Baltic Amber Gift Set detail 3", ar: "تفصيل 3 لمجموعة هدية الكهرمان" },
      },
    ],
    specs: [
      {
        label: { en: "Bead count", ar: "عدد الحبات" },
        value: { en: "33 beads", ar: "33 حبة" },
      },
      {
        label: { en: "Presentation", ar: "العرض" },
        value: { en: "Gift-ready premium box", ar: "صندوق فاخر جاهز للهدايا" },
      },
      {
        label: { en: "Use case", ar: "الاستخدام" },
        value: { en: "Ramadan and Eid gifting", ar: "هدايا رمضان والعيد" },
      },
    ],
  },
  {
    slug: "terahertz-road-safety-pendant",
    collection: "cultural-accents",
    title: { en: "Terahertz Road Safety Pendant", ar: "معلقة تيراهيرتز للسيارة والسلامة" },
    summary: {
      en: "A 99-count tasbih-inspired rearview pendant engraved with Bismillah and Ayat al-Kursi cues.",
      ar: "معلقة مرآة مستوحاة من التسبيح بعدد 99 حبة مع إشارات نقش بسم الله وآية الكرسي.",
    },
    image: "/images/real-products/terahertz-pendant/hero.jpeg",
    material: { en: "Terahertz stone look", ar: "طابع حجر تيراهيرتز" },
    tags: {
      en: ["Car charm", "Travel blessing", "Impulse gift"],
      ar: ["إكسسوار سيارة", "دعاء سفر", "هدية سريعة"],
    },
    detailIntro: {
      en: "This is a useful supporting product for the website because it shows your assortment can expand beyond hand-held tasbih into Islamic lifestyle accessories.",
      ar: "هذه قطعة داعمة مهمة للموقع لأنها تُظهر أن تشكيلتك تتجاوز التسابيح اليدوية إلى إكسسوارات أسلوب حياة إسلامي.",
    },
    detailBody: {
      en: "Chosen from the spreadsheet because it has a strong ecommerce hook, this pendant can work well for add-on counters, souvenir edits, and car-related gifting moments such as new drivers or travel blessings.",
      ar: "تم اختيارها من الجدول لأنها تحمل فكرة بيع واضحة، ويمكن أن تعمل جيدًا في نقاط الإضافة، وتشكيلات التذكارات، وهدايا السائقين الجدد أو دعوات السفر.",
    },
    idealFor: {
      en: "Best for souvenir counters, car accessory edits, and entry-price gifting.",
      ar: "أنسب لرفوف التذكارات، وتشكيلات إكسسوارات السيارة، والهدايا ضمن المدخل السعري.",
    },
    heroAlt: {
      en: "Terahertz Road Safety Pendant hero",
      ar: "الصورة الرئيسية لمعلقة التيراهيرتز",
    },
    gallery: [
      {
        image: "/images/real-products/terahertz-pendant/detail-1.jpeg",
        alt: { en: "Terahertz Road Safety Pendant detail 1", ar: "تفصيل 1 لمعلقة التيراهيرتز" },
      },
      {
        image: "/images/real-products/terahertz-pendant/detail-2.jpeg",
        alt: { en: "Terahertz Road Safety Pendant detail 2", ar: "تفصيل 2 لمعلقة التيراهيرتز" },
      },
      {
        image: "/images/real-products/terahertz-pendant/detail-3.jpeg",
        alt: { en: "Terahertz Road Safety Pendant detail 3", ar: "تفصيل 3 لمعلقة التيراهيرتز" },
      },
    ],
    specs: [
      {
        label: { en: "Format", ar: "النوع" },
        value: { en: "Rearview hanging pendant", ar: "معلقة لمرآة السيارة" },
      },
      {
        label: { en: "Count", ar: "العدد" },
        value: { en: "99-count strand", ar: "99 حبة" },
      },
      {
        label: { en: "Positioning", ar: "التموضع" },
        value: { en: "Lifestyle add-on product", ar: "منتج إضافي ضمن نمط الحياة" },
      },
    ],
  },
  {
    slug: "silver-sheen-obsidian-tasbih",
    collection: "signature-tasbih",
    title: { en: "Silver Sheen Obsidian Tasbih", ar: "سبحة Obsidian فضية اللمعان" },
    summary: {
      en: "A 33-bead Silver Sheen Obsidian tasbih with silver spacer accents and crystal details. Volcanic glass with a subtle metallic shimmer.",
      ar: "سبحة من 33 حبة من Obsidian فضي اللمعان مع فواصل فضية وتفاصيل كريستالية.",
    },
    image: "/images/imported/silver-sheen-obsidian/tasbih-03.jpg",
    material: { en: "Silver Sheen Obsidian (volcanic glass) with silver accents", ar: "Obsidian فضي اللمعان (زجاج بركاني) مع لمسات فضية" },
    tags: {
      en: ["Obsidian", "Volcanic Glass", "Silver Accents", "33 Beads"],
      ar: ["Obsidian", "زجاج بركاني", "لمسات فضية", "33 حبة"],
    },
    detailIntro: {
      en: "A sophisticated obsidian tasbih featuring volcanic glass beads with a natural metallic sheen, accented by silver spacers and crystal details.",
      ar: "سبحة Obsidian أنيقة تتميز بحبات من الزجاج البركاني مع بريق معدني طبيعي، ومزينة بفواصل فضية وتفاصيل كريستالية.",
    },
    detailBody: {
      en: "Silver Sheen Obsidian is prized for its deep black body and subtle silver reflections. This 33-bead format is ideal for daily dhikr and makes a strong statement on retail shelves. Suitable for distributors, boutique retailers, and premium gifting programs.",
      ar: "يُقدَّر Obsidian فضي اللمعان لونه الأسود العميق وانعكاساته الفضية الخفيفة. هذه الصيغة من 33 حبة مثالية للذكر اليومي وتُحدث أثرًا قويًا على رفوف التجزئة. مناسبة للموزعين ومتاجر البوتيك وبرامج الهدايا الفاخرة.",
    },
    idealFor: {
      en: "Boutiques, executive gifting, Ramadan and Eid programs, museum shops",
      ar: "البوتيكات، الهدايا التنفيذية، برامج رمضان والعيد، متاجر المتاحف",
    },
    heroAlt: {
      en: "Silver Sheen Obsidian Tasbih hero",
      ar: "الصورة الرئيسية لسبحة Obsidian فضي اللمعان",
    },
    gallery: [
      { image: "/images/imported/silver-sheen-obsidian/tasbih-12.jpg", alt: { en: "Silver Sheen Obsidian detail 1", ar: "تفصيل 1 لسبحة Obsidian فضي اللمعان" } },
      { image: "/images/imported/silver-sheen-obsidian/tasbih-22.jpg", alt: { en: "Silver Sheen Obsidian detail 2", ar: "تفصيل 2 لسبحة Obsidian فضي اللمعان" } },
      { image: "/images/imported/silver-sheen-obsidian/tasbih-23.jpg", alt: { en: "Silver Sheen Obsidian detail 3", ar: "تفصيل 3 لسبحة Obsidian فضي اللمعان" } },
      { image: "/images/imported/silver-sheen-obsidian/tasbih-24.jpg", alt: { en: "Silver Sheen Obsidian detail 4", ar: "تفصيل 4 لسبحة Obsidian فضي اللمعان" } },
      { image: "/images/imported/silver-sheen-obsidian/tasbih-40.jpg", alt: { en: "Silver Sheen Obsidian detail 5", ar: "تفصيل 5 لسبحة Obsidian فضي اللمعان" } },
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Silver Sheen Obsidian", ar: "Obsidian فضي اللمعان" } },
      { label: { en: "Accent", ar: "اللمسة" }, value: { en: "Silver spacers with crystal details", ar: "فواصل فضية مع تفاصيل كريستالية" } },
    ],
  },
  {
    slug: "blue-tigers-eye-tasbih",
    collection: "signature-tasbih",
    title: { en: "Blue Tiger's Eye Tasbih", ar: "سبحة عين النمر الزرقاء" },
    summary: {
      en: "A 33-bead Blue Tiger's Eye tasbih with gold-plated brass spacers. Known for its chatoyant blue silky luster.",
      ar: "سبحة من 33 حبة من عين النمر الزرقاء مع فواصل من النحاس المطلي بالذهب. معروفة ببريقها الحريري الأزرق المتغير.",
    },
    image: "/images/imported/blue-tigers-eye/tasbih-01.jpg",
    material: { en: "Blue Tiger's Eye (Hawk's Eye) with gold-plated brass accents", ar: "عين النمر الزرقاء (عين الصقر) مع لمسات من النحاس المطلي بالذهب" },
    tags: {
      en: ["Tiger's Eye", "Blue", "Gold Accents", "33 Beads", "Chatoyant"],
      ar: ["عين النمر", "أزرق", "لمسات ذهبية", "33 حبة", "متغير اللون"],
    },
    detailIntro: {
      en: "Blue Tiger's Eye is a member of the quartz family known for its distinctive chatoyant effect — a silky blue band that shimmers as light hits the stone at different angles.",
      ar: "عين النمر الزرقاء هي عضو في عائلة الكوارتز معروفة بتأثيرها المتغير المميز — شريط حريري أزرق يتلألأ مع تغير زاوية الضوء على الحجر.",
    },
    detailBody: {
      en: "This tasbih features perfectly round, highly polished Blue Tiger's Eye beads with two decorative gold-plated spacers. The deep navy base with royal blue flashes creates a sophisticated dark palette perfect for modern retail displays. Ideal for boutiques, gift programs, and collectors seeking unusual gemstone tasbih.",
      ar: "تتميز هذه المسبحة بحبات عين النمر الزرقاء المستديرة عالية التلميع مع فاصلين مزخرفين من النحاس المطلي بالذهب. القاعدة البحرية الداكنة مع ومضات باللون الأزرق الملكي تخلق لوحة ألوان متطورة مثالية لرفوف التجزئة الحديثة. مناسبة للبوتيكات وبرامج الهدايا والهواة الذين يبحثون عن تسابيح الأحجار الكريمة غير العادية.",
    },
    idealFor: {
      en: "Boutiques, gemstone collectors, premium gifting, cultural retail",
      ar: "البوتيكات، هواة الأحجار الكريمة، الهدايا الفاخرة، متاجر الثقافة",
    },
    heroAlt: {
      en: "Blue Tiger's Eye Tasbih hero",
      ar: "الصورة الرئيسية لسبحة عين النمر الزرقاء",
    },
    gallery: [
      { image: "/images/imported/blue-tigers-eye/tasbih-05.jpg", alt: { en: "Blue Tiger's Eye detail 1", ar: "تفصيل 1 لسبحة عين النمر الزرقاء" } },
      { image: "/images/imported/blue-tigers-eye/tasbih-10.jpg", alt: { en: "Blue Tiger's Eye detail 2", ar: "تفصيل 2 لسبحة عين النمر الزرقاء" } },
      { image: "/images/imported/blue-tigers-eye/tasbih-11.jpg", alt: { en: "Blue Tiger's Eye detail 3", ar: "تفصيل 3 لسبحة عين النمر الزرقاء" } },
      { image: "/images/imported/blue-tigers-eye/tasbih-25.jpg", alt: { en: "Blue Tiger's Eye detail 4", ar: "تفصيل 4 لسبحة عين النمر الزرقاء" } },
      { image: "/images/imported/blue-tigers-eye/tasbih-26.jpg", alt: { en: "Blue Tiger's Eye detail 5", ar: "تفصيل 5 لسبحة عين النمر الزرقاء" } },
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Blue Tiger's Eye (Hawk's Eye)", ar: "عين النمر الزرقاء (عين الصقر)" } },
      { label: { en: "Accent", ar: "اللمسة" }, value: { en: "Gold-plated brass spacers", ar: "فواصل نحاس مطلي بالذهب" } },
    ],
  },
];

export const contactFormCopy: ContactFormCopy = {
  title: {
    en: "Start your wholesale inquiry",
    ar: "ابدأ استفسارك الخاص بالجملة",
  },
  description: {
    en: "Tell us what you want to source, your target quantity, and your timeline. We will recommend a focused assortment quickly.",
    ar: "أخبرنا بما تريد شراءه والكمية المستهدفة والجدول الزمني، وسنقترح عليك تشكيلة مناسبة بسرعة.",
  },
  fields: {
    name: { en: "Full name", ar: "الاسم الكامل" },
    company: { en: "Company", ar: "الشركة" },
    country: { en: "Country", ar: "الدولة" },
    contact: { en: "Email or WhatsApp", ar: "البريد أو واتساب" },
    interest: { en: "Interest category", ar: "فئة الاهتمام" },
    quantity: { en: "Estimated quantity", ar: "الكمية التقديرية" },
    message: { en: "Message", ar: "الرسالة" },
  },
  submit: { en: "Send inquiry", ar: "إرسال الاستفسار" },
  success: {
    en: "Thank you — we will review your inquiry and reply with the best matching assortment.",
    ar: "شكرًا لك، سنراجع استفسارك ونعود إليك بأفضل تشكيلة مناسبة.",
  },
  validation: {
    name: { en: "Name is required.", ar: "الاسم مطلوب." },
    company: { en: "Company is required.", ar: "اسم الشركة مطلوب." },
    country: { en: "Country is required.", ar: "الدولة مطلوبة." },
    contact: { en: "Contact details are required.", ar: "بيانات التواصل مطلوبة." },
    interest: { en: "Choose an interest category.", ar: "اختر فئة الاهتمام." },
    quantity: { en: "Estimated quantity is required.", ar: "الكمية التقديرية مطلوبة." },
    message: { en: "Message is required.", ar: "الرسالة مطلوبة." },
  },
  whatsappLabel: { en: "Chat on WhatsApp", ar: "تحدث عبر واتساب" },
};

const pageDescriptions = {
  home: {
    en: "Premium tasbih collections, Islamic gifts, and distributor-ready assortments for modern B2B buyers.",
    ar: "مجموعات تسابيح راقية وهدايا إسلامية وتشكيلات جاهزة للموزعين والمشترين بالجملة.",
  },
  collections: {
    en: "Browse tasbih-led collections, gift-ready sets, and supporting cultural accessories for distributors.",
    ar: "تصفح مجموعات التسابيح ومجموعات الهدايا والمنتجات الثقافية المساندة للموزعين.",
  },
  wholesale: {
    en: "MOQ, packaging, customization, and lead-time information for retail and gifting partners.",
    ar: "معلومات الحد الأدنى والكرتون والتخصيص ومواعيد التوريد لشركاء التجزئة والهدايا.",
  },
  contact: {
    en: "Send your inquiry and connect with TranquilBeads on WhatsApp for fast wholesale conversations.",
    ar: "أرسل استفسارك وتواصل مع ترانكويل بيدز عبر واتساب لبدء محادثة جملة سريعة.",
  },
} as const;

export function getPageMetadata(
  locale: Locale,
  page: keyof typeof pageDescriptions,
  title: string,
): Metadata {
  const description = pageDescriptions[page][locale];
  return {
    title,
    description,
    alternates: {
      canonical: withLocale(locale, page === "home" ? "/" : `/${page}`),
      languages: {
        en: withLocale("en", page === "home" ? "/" : `/${page}`),
        ar: withLocale("ar", page === "home" ? "/" : `/${page}`),
      },
    },
    openGraph: {
      title,
      description,
    },
  };
}

export function getPageCopy(locale: Locale) {
  return {
    locale,
    nav: navItems.map((item) => ({
      href: item.href,
      label: item.label[locale],
    })),
    hero: {
      eyebrow: locale === "en" ? "B2B Tasbih & Cultural Gifts" : "تسابيح وهدايا ثقافية للجملة",
      title:
        locale === "en"
          ? "Tasbih crafted for modern wholesale partners"
          : "تسابيح مصممة لشركاء الجملة العصريين",
      description:
        locale === "en"
          ? "TranquilBeads pairs elevated design, dependable production, and culturally aligned storytelling for distributors, museum shops, gifting programs, and premium retailers."
          : "يجمع ترانكويل بيدز بين التصميم الراقي والإنتاج الموثوق والسرد الثقافي المتوازن لخدمة الموزعين ومتاجر المتاحف وبرامج الهدايا وتجار التجزئة المتميزين.",
      primaryCta: locale === "en" ? "Request Catalog" : "اطلب الكتالوج",
      secondaryCta: contactFormCopy.whatsappLabel[locale],
      featuredLabel: locale === "en" ? "Featured collections" : "مجموعات مميزة",
      metricsIntro:
        locale === "en"
          ? "Built for distribution teams that need shelf-ready stories and reliable replenishment."
          : "مصمم لفرق التوزيع التي تحتاج إلى قصة عرض قوية وتوريد موثوق.",
    },
    collectionsPage: {
      title: locale === "en" ? "Signature Tasbih Collections" : "مجموعات تسابيح مميزة",
      description:
        locale === "en"
          ? "A compact first-edition catalog led by tasbih, supported by gift sets and complementary cultural pieces."
          : "كتالوج أولي مركز تقوده التسابيح وتدعمه مجموعات هدايا وقطع ثقافية مكملة.",
      filtersLabel: locale === "en" ? "Tasbih-led catalog" : "كتالوج تقوده التسابيح",
      inquiryLabel: locale === "en" ? "Inquire now" : "اطلب الآن",
      detailLabel: locale === "en" ? "View details" : "عرض التفاصيل",
    },
    wholesalePage: {
      title: locale === "en" ? "Built for retail and wholesale rollout" : "مصمم للتوزيع والجملة",
      description:
        locale === "en"
          ? "Everything on the first release is shaped around fast distributor onboarding: MOQ clarity, packaging, customization, and dependable lead times."
          : "تم تصميم الإصدار الأول لتسهيل انطلاق الشركاء بسرعة: وضوح الحد الأدنى، التغليف، التخصيص، ومواعيد التوريد الموثوقة.",
      bullets:
        locale === "en"
          ? [
              "MOQ starts from 500 pieces across tasbih-focused assortments.",
              "Private label sleeves, insert cards, and bilingual packaging available.",
              "Average lead time from approval to dispatch is 21 days.",
            ]
          : [
              "موك يبدأ من 500 قطعة ضمن تشكيلات تركز على التسابيح.",
              "التغليف الخاص وبطاقات الإدراج والتغليف الثنائي اللغة متاح.",
              "متوسط زمن التوريد من الاعتماد إلى الشحن هو 21 يومًا.",
            ],
      flowTitle: locale === "en" ? "How cooperation works" : "كيف تتم الشراكة",
      flow:
        locale === "en"
          ? ["Share your market and quantity targets", "Receive a tight assortment proposal", "Approve packaging and launch timeline"]
          : ["شاركنا السوق والكمية المستهدفة", "استلم اقتراح تشكيلة مركزة", "اعتمد التغليف والجدول الزمني للإطلاق"],
    },
    contactPage: {
      title: contactFormCopy.title[locale],
      description: contactFormCopy.description[locale],
      whatsappLabel: contactFormCopy.whatsappLabel[locale],
      detailCards:
        locale === "en"
          ? [
              "Ideal for distributors, museum stores, gifting programs, and boutique retailers.",
              "Include your target market, desired material, and timeline for a faster reply.",
            ]
          : [
              "مناسب للموزعين ومتاجر المتاحف وبرامج الهدايا ومتاجر التجزئة المتخصصة.",
              "أضف السوق المستهدفة والخامة المطلوبة والجدول الزمني لتحصل على رد أسرع.",
            ],
    },
    footer: {
      summary: siteSettings.tagline[locale],
      rights:
        locale === "en"
          ? "Premium tasbih and Islamic culture goods for contemporary trade partners."
          : "تسابيح ومنتجات ثقافية إسلامية راقية لشركاء التجارة المعاصرين.",
    },
  };
}

export function getInterestOptions(locale: Locale) {
  return locale === "en"
    ? ["Tasbih", "Gift Sets", "Custom Packaging", "Retail Assortment"]
    : ["تسابيح", "مجموعات هدايا", "تغليف مخصص", "تشكيلة متجر"];
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
