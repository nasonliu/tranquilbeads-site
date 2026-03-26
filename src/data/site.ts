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
  {    slug: "red-agate-tasbih",
    collection: "signature-tasbih",
    title: { en: "Red Agate Tasbih", ar: "سبحة عقيق أحمر" },
    summary: { en: "A 33-bead Red Agate tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عقيق أحمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/red-agate-tasbih/SIZE1.jpg",
    material: { en: "Red Agate", ar: "عقيق أحمر" },
    tags: { en: ["Red Agate", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u0642\u064a\u0642 \u0623\u062d\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted red agate tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عقيق أحمر بمظهر متطور." },
    detailBody: { en: "This red agate tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عقيق أحمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "Red Agate Tasbih hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/red-agate-tasbih/SIZE2.jpg", alt: { en: "Red Agate Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/red-agate-tasbih/tasbih-04.jpg", alt: { en: "Red Agate Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/red-agate-tasbih/tasbih-07.jpg", alt: { en: "Red Agate Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/red-agate-tasbih/tasbih-15.jpg", alt: { en: "Red Agate Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/red-agate-tasbih/tasbih-29.jpg", alt: { en: "Red Agate Tasbih detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Red Agate", ar: "عقيق أحمر" } },
    ],
  },
  {
    slug: "pearl-tasbih",
    collection: "signature-tasbih",
    title: { en: "Pearl Tasbih", ar: "سبحة لؤلؤ" },
    summary: { en: "A 33-bead Pearl tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من لؤلؤ بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/pearl-tasbih/size.jpg",
    material: { en: "Pearl", ar: "لؤلؤ" },
    tags: { en: ["Pearl", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0644\u0624\u0644\u0624", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted pearl tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من لؤلؤ بمظهر متطور." },
    detailBody: { en: "This pearl tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من لؤلؤ بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "Pearl Tasbih hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/pearl-tasbih/tasbih-45.jpg", alt: { en: "Pearl Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/pearl-tasbih/tasbih-46.jpg", alt: { en: "Pearl Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/pearl-tasbih/tasbih-47.jpg", alt: { en: "Pearl Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/pearl-tasbih/tasbih-50.jpg", alt: { en: "Pearl Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/pearl-tasbih/tasbih-51.jpg", alt: { en: "Pearl Tasbih detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Pearl", ar: "لؤلؤ" } },
    ],
  },
  {
    slug: "obsidian-tasbih",
    collection: "signature-tasbih",
    title: { en: "Obsidian Tasbih", ar: "سبحة أوبسيديان" },
    summary: { en: "A 33-bead Obsidian tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من أوبسيديان بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/obsidian-tasbih/size.jpg",
    material: { en: "Obsidian", ar: "أوبسيديان" },
    tags: { en: ["Obsidian", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0623\u0648\u0628\u0633\u064a\u062f\u064a\u0627\u0646", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted obsidian tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من أوبسيديان بمظهر متطور." },
    detailBody: { en: "This obsidian tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من أوبسيديان بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "Obsidian Tasbih hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/obsidian-tasbih/tasbih-03.jpg", alt: { en: "Obsidian Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/obsidian-tasbih/tasbih-12.jpg", alt: { en: "Obsidian Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/obsidian-tasbih/tasbih-22.jpg", alt: { en: "Obsidian Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/obsidian-tasbih/tasbih-23.jpg", alt: { en: "Obsidian Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/obsidian-tasbih/tasbih-24.jpg", alt: { en: "Obsidian Tasbih detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Obsidian", ar: "أوبسيديان" } },
    ],
  },
  {
    slug: "resin-tasbih",
    collection: "signature-tasbih",
    title: { en: "Resin Tasbih", ar: "سبحة ريزن" },
    summary: { en: "A 33-bead Resin tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من ريزن بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/resin-tasbih/resin-01.jpg",
    material: { en: "Resin", ar: "ريزن" },
    tags: { en: ["Resin", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0631\u064a\u0632\u0646", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted resin tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من ريزن بمظهر متطور." },
    detailBody: { en: "This resin tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من ريزن بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "Resin Tasbih hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/resin-tasbih/resin-02.jpg", alt: { en: "Resin Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/resin-tasbih/resin-03.jpg", alt: { en: "Resin Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/resin-tasbih/resin-04.jpg", alt: { en: "Resin Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/resin-tasbih/resin-05.jpg", alt: { en: "Resin Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/resin-tasbih/resin-06.jpg", alt: { en: "Resin Tasbih detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Resin", ar: "ريزن" } },
    ],
  },
  {
    slug: "crystal-tasbih",
    collection: "signature-tasbih",
    title: { en: "Crystal Tasbih", ar: "سبحة كريستال" },
    summary: { en: "A 33-bead Crystal tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من كريستال بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/crystal-tasbih/size.jpg",
    material: { en: "Crystal", ar: "كريستال" },
    tags: { en: ["Crystal", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0643\u0631\u064a\u0633\u062a\u0627\u0644", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted crystal tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من كريستال بمظهر متطور." },
    detailBody: { en: "This crystal tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من كريستال بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "Crystal Tasbih hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/crystal-tasbih/tasbih-16.jpg", alt: { en: "Crystal Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/crystal-tasbih/tasbih-17.jpg", alt: { en: "Crystal Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/crystal-tasbih/tasbih-43.jpg", alt: { en: "Crystal Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/crystal-tasbih/tasbih-49.jpg", alt: { en: "Crystal Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/crystal-tasbih/tasbih-52.jpg", alt: { en: "Crystal Tasbih detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Crystal", ar: "كريستال" } },
    ],
  },
  {
    slug: "kechainrose",
    collection: "signature-tasbih",
    title: { en: "kechainrose", ar: "سبحة ذكر حرفي" },
    summary: { en: "A 33-bead Artisan Dhikr tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من ذكر حرفي بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/kechainrose/phone.jpg",
    material: { en: "Artisan Dhikr", ar: "ذكر حرفي" },
    tags: { en: ["Artisan Dhikr", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0630\u0643\u0631 \u062d\u0631\u0641\u064a", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted artisan dhikr tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من ذكر حرفي بمظهر متطور." },
    detailBody: { en: "This artisan dhikr tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من ذكر حرفي بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "kechainrose hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/kechainrose/rose-01.jpg", alt: { en: "kechainrose detail", ar: "تفصيل" } },
            { image: "/images/imported/kechainrose/rose-02.jpg", alt: { en: "kechainrose detail", ar: "تفصيل" } },
            { image: "/images/imported/kechainrose/rose-03.jpg", alt: { en: "kechainrose detail", ar: "تفصيل" } },
            { image: "/images/imported/kechainrose/rose-04.jpg", alt: { en: "kechainrose detail", ar: "تفصيل" } },
            { image: "/images/imported/kechainrose/rose-05.jpg", alt: { en: "kechainrose detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Artisan Dhikr", ar: "ذكر حرفي" } },
    ],
  },
  {
    slug: "amber-tasbih",
    collection: "signature-tasbih",
    title: { en: "Amber Tasbih", ar: "سبحة كهرمان" },
    summary: { en: "A 33-bead Amber tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من كهرمان بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/amber-tasbih/ambertasbish-01.jpg",
    material: { en: "Amber", ar: "كهرمان" },
    tags: { en: ["Amber", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0643\u0647\u0631\u0645\u0627\u0646", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted amber tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من كهرمان بمظهر متطور." },
    detailBody: { en: "This amber tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من كهرمان بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "Amber Tasbih hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/amber-tasbih/ambertasbish-02.jpg", alt: { en: "Amber Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/amber-tasbih/ambertasbish-03.jpg", alt: { en: "Amber Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/amber-tasbih/ambertasbish-04.jpg", alt: { en: "Amber Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/amber-tasbih/ambertasbish-05.jpg", alt: { en: "Amber Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/amber-tasbih/ambertasbish-06.jpg", alt: { en: "Amber Tasbih detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Amber", ar: "كهرمان" } },
    ],
  },
  {
    slug: "64faceset",
    collection: "signature-tasbih",
    title: { en: "64faceset", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/64faceset/size.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "64faceset hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/64faceset/size1.jpg", alt: { en: "64faceset detail", ar: "تفصيل" } },
            { image: "/images/imported/64faceset/size2.jpg", alt: { en: "64faceset detail", ar: "تفصيل" } },
            { image: "/images/imported/64faceset/size3.jpg", alt: { en: "64faceset detail", ar: "تفصيل" } },
            { image: "/images/imported/64faceset/tasbih-119.jpg", alt: { en: "64faceset detail", ar: "تفصيل" } },
            { image: "/images/imported/64faceset/tasbih-120.jpg", alt: { en: "64faceset detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "pocket",
    collection: "signature-tasbih",
    title: { en: "pocket", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/pocket/size.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "pocket hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/pocket/tasbih-060.jpg", alt: { en: "pocket detail", ar: "تفصيل" } },
            { image: "/images/imported/pocket/tasbih-061.jpg", alt: { en: "pocket detail", ar: "تفصيل" } },
            { image: "/images/imported/pocket/tasbih-062.jpg", alt: { en: "pocket detail", ar: "تفصيل" } },
            { image: "/images/imported/pocket/tasbih-072.jpg", alt: { en: "pocket detail", ar: "تفصيل" } },
            { image: "/images/imported/pocket/tasbih-073.jpg", alt: { en: "pocket detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "99-pla",
    collection: "signature-tasbih",
    title: { en: "99-pla", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/99-pla/size.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "99-pla hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/99-pla/tasbih-053.jpg", alt: { en: "99-pla detail", ar: "تفصيل" } },
            { image: "/images/imported/99-pla/tasbih-054.jpg", alt: { en: "99-pla detail", ar: "تفصيل" } },
            { image: "/images/imported/99-pla/tasbih-085.jpg", alt: { en: "99-pla detail", ar: "تفصيل" } },
            { image: "/images/imported/99-pla/tasbih-104.jpg", alt: { en: "99-pla detail", ar: "تفصيل" } },
            { image: "/images/imported/99-pla/tasbih-105.jpg", alt: { en: "99-pla detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "99-arc",
    collection: "signature-tasbih",
    title: { en: "99-arc", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/99-arc/size.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "99-arc hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/99-arc/tasbih-052.jpg", alt: { en: "99-arc detail", ar: "تفصيل" } },
            { image: "/images/imported/99-arc/tasbih-087.jpg", alt: { en: "99-arc detail", ar: "تفصيل" } },
            { image: "/images/imported/99-arc/tasbih-093.jpg", alt: { en: "99-arc detail", ar: "تفصيل" } },
            { image: "/images/imported/99-arc/tasbih-094.jpg", alt: { en: "99-arc detail", ar: "تفصيل" } },
            { image: "/images/imported/99-arc/tasbih-095.jpg", alt: { en: "99-arc detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "33-pla-pattren",
    collection: "signature-tasbih",
    title: { en: "33-pla-pattren", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/33-pla-pattren/size.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "33-pla-pattren hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/33-pla-pattren/tasbih-055.jpg", alt: { en: "33-pla-pattren detail", ar: "تفصيل" } },
            { image: "/images/imported/33-pla-pattren/tasbih-056.jpg", alt: { en: "33-pla-pattren detail", ar: "تفصيل" } },
            { image: "/images/imported/33-pla-pattren/tasbih-086.jpg", alt: { en: "33-pla-pattren detail", ar: "تفصيل" } },
            { image: "/images/imported/33-pla-pattren/tasbih-106.jpg", alt: { en: "33-pla-pattren detail", ar: "تفصيل" } },
            { image: "/images/imported/33-pla-pattren/tasbih-107.jpg", alt: { en: "33-pla-pattren detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "33-kuka",
    collection: "signature-tasbih",
    title: { en: "33-kuka", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/33-kuka/size.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "33-kuka hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/33-kuka/tasbih-063.jpg", alt: { en: "33-kuka detail", ar: "تفصيل" } },
            { image: "/images/imported/33-kuka/tasbih-064.jpg", alt: { en: "33-kuka detail", ar: "تفصيل" } },
            { image: "/images/imported/33-kuka/tasbih-065.jpg", alt: { en: "33-kuka detail", ar: "تفصيل" } },
            { image: "/images/imported/33-kuka/tasbih-066.jpg", alt: { en: "33-kuka detail", ar: "تفصيل" } },
            { image: "/images/imported/33-kuka/tasbih-067.jpg", alt: { en: "33-kuka detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "33-arc",
    collection: "signature-tasbih",
    title: { en: "33-arc", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/33-arc/size.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "33-arc hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/33-arc/tasbih-057.jpg", alt: { en: "33-arc detail", ar: "تفصيل" } },
            { image: "/images/imported/33-arc/tasbih-058.jpg", alt: { en: "33-arc detail", ar: "تفصيل" } },
            { image: "/images/imported/33-arc/tasbih-059.jpg", alt: { en: "33-arc detail", ar: "تفصيل" } },
            { image: "/images/imported/33-arc/tasbih-081.jpg", alt: { en: "33-arc detail", ar: "تفصيل" } },
            { image: "/images/imported/33-arc/tasbih-082.jpg", alt: { en: "33-arc detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "zebra",
    collection: "signature-tasbih",
    title: { en: "zebra", ar: "سبحة العقيق" },
    summary: { en: "A 33-bead Agate tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من العقيق بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/zebra/main.jpg",
    material: { en: "Agate", ar: "العقيق" },
    tags: { en: ["Agate", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0627\u0644\u0639\u0642\u064a\u0642", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted agate tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من العقيق بمظهر متطور." },
    detailBody: { en: "This agate tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من العقيق بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "zebra hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/zebra/size.jpg", alt: { en: "zebra detail", ar: "تفصيل" } },
            { image: "/images/imported/zebra/tasbih-07.jpg", alt: { en: "zebra detail", ar: "تفصيل" } },
            { image: "/images/imported/zebra/tasbih-17.jpg", alt: { en: "zebra detail", ar: "تفصيل" } },
            { image: "/images/imported/zebra/tasbih-21.jpg", alt: { en: "zebra detail", ar: "تفصيل" } },
            { image: "/images/imported/zebra/tasbih-31.jpg", alt: { en: "zebra detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "العقيق" } },
    ],
  },
  {
    slug: "watergrass",
    collection: "signature-tasbih",
    title: { en: "watergrass", ar: "سبحة العقيق" },
    summary: { en: "A 33-bead Agate tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من العقيق بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/watergrass/main.jpg",
    material: { en: "Agate", ar: "العقيق" },
    tags: { en: ["Agate", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0627\u0644\u0639\u0642\u064a\u0642", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted agate tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من العقيق بمظهر متطور." },
    detailBody: { en: "This agate tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من العقيق بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "watergrass hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/watergrass/size.jpg", alt: { en: "watergrass detail", ar: "تفصيل" } },
            { image: "/images/imported/watergrass/tasbih-08.jpg", alt: { en: "watergrass detail", ar: "تفصيل" } },
            { image: "/images/imported/watergrass/tasbih-14.jpg", alt: { en: "watergrass detail", ar: "تفصيل" } },
            { image: "/images/imported/watergrass/tasbih-15.jpg", alt: { en: "watergrass detail", ar: "تفصيل" } },
            { image: "/images/imported/watergrass/tasbih-18.jpg", alt: { en: "watergrass detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "العقيق" } },
    ],
  },
  {
    slug: "silkagate",
    collection: "signature-tasbih",
    title: { en: "silkagate", ar: "سبحة العقيق" },
    summary: { en: "A 33-bead Agate tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من العقيق بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/silkagate/main.jpg",
    material: { en: "Agate", ar: "العقيق" },
    tags: { en: ["Agate", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0627\u0644\u0639\u0642\u064a\u0642", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted agate tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من العقيق بمظهر متطور." },
    detailBody: { en: "This agate tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من العقيق بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "silkagate hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/silkagate/size.jpg", alt: { en: "silkagate detail", ar: "تفصيل" } },
            { image: "/images/imported/silkagate/tasbih-05.jpg", alt: { en: "silkagate detail", ar: "تفصيل" } },
            { image: "/images/imported/silkagate/tasbih-16.jpg", alt: { en: "silkagate detail", ar: "تفصيل" } },
            { image: "/images/imported/silkagate/tasbih-20.jpg", alt: { en: "silkagate detail", ar: "تفصيل" } },
            { image: "/images/imported/silkagate/tasbih-30.jpg", alt: { en: "silkagate detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "العقيق" } },
    ],
  },
  {
    slug: "orangeagate",
    collection: "signature-tasbih",
    title: { en: "orangeagate", ar: "سبحة العقيق" },
    summary: { en: "A 33-bead Agate tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من العقيق بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/orangeagate/main.jpg",
    material: { en: "Agate", ar: "العقيق" },
    tags: { en: ["Agate", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0627\u0644\u0639\u0642\u064a\u0642", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted agate tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من العقيق بمظهر متطور." },
    detailBody: { en: "This agate tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من العقيق بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "orangeagate hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/orangeagate/size.jpg", alt: { en: "orangeagate detail", ar: "تفصيل" } },
            { image: "/images/imported/orangeagate/tasbih-04.jpg", alt: { en: "orangeagate detail", ar: "تفصيل" } },
            { image: "/images/imported/orangeagate/tasbih-12.jpg", alt: { en: "orangeagate detail", ar: "تفصيل" } },
            { image: "/images/imported/orangeagate/tasbih-23.jpg", alt: { en: "orangeagate detail", ar: "تفصيل" } },
            { image: "/images/imported/orangeagate/tasbih-28.jpg", alt: { en: "orangeagate detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "العقيق" } },
    ],
  },
  {
    slug: "dreamyagate",
    collection: "signature-tasbih",
    title: { en: "dreamyagate", ar: "سبحة العقيق" },
    summary: { en: "A 33-bead Agate tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من العقيق بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/dreamyagate/main.jpg",
    material: { en: "Agate", ar: "العقيق" },
    tags: { en: ["Agate", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0627\u0644\u0639\u0642\u064a\u0642", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted agate tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من العقيق بمظهر متطور." },
    detailBody: { en: "This agate tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من العقيق بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "dreamyagate hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/dreamyagate/size.jpg", alt: { en: "dreamyagate detail", ar: "تفصيل" } },
            { image: "/images/imported/dreamyagate/tasbih-02.jpg", alt: { en: "dreamyagate detail", ar: "تفصيل" } },
            { image: "/images/imported/dreamyagate/tasbih-11.jpg", alt: { en: "dreamyagate detail", ar: "تفصيل" } },
            { image: "/images/imported/dreamyagate/tasbih-25.jpg", alt: { en: "dreamyagate detail", ar: "تفصيل" } },
            { image: "/images/imported/dreamyagate/tasbih-27.jpg", alt: { en: "dreamyagate detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "العقيق" } },
    ],
  },
  {
    slug: "bluetiger",
    collection: "signature-tasbih",
    title: { en: "bluetiger", ar: "سبحة العقيق" },
    summary: { en: "A 33-bead Agate tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من العقيق بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/bluetiger/main.jpg",
    material: { en: "Agate", ar: "العقيق" },
    tags: { en: ["Agate", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0627\u0644\u0639\u0642\u064a\u0642", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted agate tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من العقيق بمظهر متطور." },
    detailBody: { en: "This agate tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من العقيق بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "bluetiger hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/bluetiger/size.jpg", alt: { en: "bluetiger detail", ar: "تفصيل" } },
            { image: "/images/imported/bluetiger/tasbih-06.jpg", alt: { en: "bluetiger detail", ar: "تفصيل" } },
            { image: "/images/imported/bluetiger/tasbih-13.jpg", alt: { en: "bluetiger detail", ar: "تفصيل" } },
            { image: "/images/imported/bluetiger/tasbih-22.jpg", alt: { en: "bluetiger detail", ar: "تفصيل" } },
            { image: "/images/imported/bluetiger/tasbih-29.jpg", alt: { en: "bluetiger detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "العقيق" } },
    ],
  },
  {
    slug: "blackagate",
    collection: "signature-tasbih",
    title: { en: "blackagate", ar: "سبحة العقيق" },
    summary: { en: "A 33-bead Agate tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من العقيق بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/blackagate/main.jpg",
    material: { en: "Agate", ar: "العقيق" },
    tags: { en: ["Agate", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0627\u0644\u0639\u0642\u064a\u0642", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted agate tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من العقيق بمظهر متطور." },
    detailBody: { en: "This agate tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من العقيق بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "blackagate hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/blackagate/size.jpg", alt: { en: "blackagate detail", ar: "تفصيل" } },
            { image: "/images/imported/blackagate/tasbih-03.jpg", alt: { en: "blackagate detail", ar: "تفصيل" } },
            { image: "/images/imported/blackagate/tasbih-19.jpg", alt: { en: "blackagate detail", ar: "تفصيل" } },
            { image: "/images/imported/blackagate/tasbih-32.jpg", alt: { en: "blackagate detail", ar: "تفصيل" } },
            { image: "/images/imported/blackagate/tasbih-40.jpg", alt: { en: "blackagate detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "العقيق" } },
    ],
  },
  {
    slug: "amberorange",
    collection: "signature-tasbih",
    title: { en: "amberorange", ar: "سبحة العقيق" },
    summary: { en: "A 33-bead Agate tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من العقيق بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/amberorange/main.jpg",
    material: { en: "Agate", ar: "العقيق" },
    tags: { en: ["Agate", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0627\u0644\u0639\u0642\u064a\u0642", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted agate tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من العقيق بمظهر متطور." },
    detailBody: { en: "This agate tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من العقيق بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "amberorange hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/amberorange/size.jpg", alt: { en: "amberorange detail", ar: "تفصيل" } },
            { image: "/images/imported/amberorange/tasbih-01.jpg", alt: { en: "amberorange detail", ar: "تفصيل" } },
            { image: "/images/imported/amberorange/tasbih-09.jpg", alt: { en: "amberorange detail", ar: "تفصيل" } },
            { image: "/images/imported/amberorange/tasbih-10.jpg", alt: { en: "amberorange detail", ar: "تفصيل" } },
            { image: "/images/imported/amberorange/tasbih-24.jpg", alt: { en: "amberorange detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "العقيق" } },
    ],
  },
  {
    slug: "oud2",
    collection: "signature-tasbih",
    title: { en: "oud2", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/oud2/size.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "oud2 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/oud2/tasbih-03.jpg", alt: { en: "oud2 detail", ar: "تفصيل" } },
            { image: "/images/imported/oud2/tasbih-08.jpg", alt: { en: "oud2 detail", ar: "تفصيل" } },
            { image: "/images/imported/oud2/tasbih-09.jpg", alt: { en: "oud2 detail", ar: "تفصيل" } },
            { image: "/images/imported/oud2/tasbih-25.jpg", alt: { en: "oud2 detail", ar: "تفصيل" } },
            { image: "/images/imported/oud2/tasbih-26.jpg", alt: { en: "oud2 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "oud1",
    collection: "signature-tasbih",
    title: { en: "oud1", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/oud1/tasbih-04.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "oud1 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/oud1/tasbih-10.jpg", alt: { en: "oud1 detail", ar: "تفصيل" } },
            { image: "/images/imported/oud1/tasbih-11.jpg", alt: { en: "oud1 detail", ar: "تفصيل" } },
            { image: "/images/imported/oud1/tasbih-24.jpg", alt: { en: "oud1 detail", ar: "تفصيل" } },
            { image: "/images/imported/oud1/tasbih-28.jpg", alt: { en: "oud1 detail", ar: "تفصيل" } },
            { image: "/images/imported/oud1/tasbih-29.jpg", alt: { en: "oud1 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "shoushan",
    collection: "signature-tasbih",
    title: { en: "shoushan", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/shoushan/ambertasbish-098.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "shoushan hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/shoushan/ambertasbish-100.jpg", alt: { en: "shoushan detail", ar: "تفصيل" } },
            { image: "/images/imported/shoushan/ambertasbish-101.jpg", alt: { en: "shoushan detail", ar: "تفصيل" } },
            { image: "/images/imported/shoushan/ambertasbish-102.jpg", alt: { en: "shoushan detail", ar: "تفصيل" } },
            { image: "/images/imported/shoushan/ambertasbish-103.jpg", alt: { en: "shoushan detail", ar: "تفصيل" } },
            { image: "/images/imported/shoushan/ambertasbish-36.jpg", alt: { en: "shoushan detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "pink",
    collection: "signature-tasbih",
    title: { en: "pink", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/pink/ambertasbish-092.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "pink hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/pink/ambertasbish-093.jpg", alt: { en: "pink detail", ar: "تفصيل" } },
            { image: "/images/imported/pink/ambertasbish-44.jpg", alt: { en: "pink detail", ar: "تفصيل" } },
            { image: "/images/imported/pink/ambertasbish-45.jpg", alt: { en: "pink detail", ar: "تفصيل" } },
            { image: "/images/imported/pink/ambertasbish-67.jpg", alt: { en: "pink detail", ar: "تفصيل" } },
            { image: "/images/imported/pink/ambertasbish-68.jpg", alt: { en: "pink detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "oval-black",
    collection: "signature-tasbih",
    title: { en: "oval-black", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/oval-black/ambertasbish-081.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "oval-black hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/oval-black/ambertasbish-082.jpg", alt: { en: "oval-black detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-black/ambertasbish-085.jpg", alt: { en: "oval-black detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-black/ambertasbish-086.jpg", alt: { en: "oval-black detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-black/ambertasbish-089.jpg", alt: { en: "oval-black detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-black/ambertasbish-106.jpg", alt: { en: "oval-black detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "oval-red",
    collection: "signature-tasbih",
    title: { en: "oval red", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/oval-red/ambertasbish-34.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "oval red hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/oval-red/ambertasbish-55.jpg", alt: { en: "oval red detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-red/ambertasbish-56.jpg", alt: { en: "oval red detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-red/ambertasbish-59.jpg", alt: { en: "oval red detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-red/ambertasbish-75.jpg", alt: { en: "oval red detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-red/size.jpg", alt: { en: "oval red detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "oval-peacock",
    collection: "signature-tasbih",
    title: { en: "oval peacock", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/oval-peacock/ambertasbish-080.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "oval peacock hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/oval-peacock/ambertasbish-083.jpg", alt: { en: "oval peacock detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-peacock/ambertasbish-084.jpg", alt: { en: "oval peacock detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-peacock/ambertasbish-087.jpg", alt: { en: "oval peacock detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-peacock/ambertasbish-088.jpg", alt: { en: "oval peacock detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-peacock/ambertasbish-096.jpg", alt: { en: "oval peacock detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "oval-orange",
    collection: "signature-tasbih",
    title: { en: "oval orange", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/oval-orange/ambertasbish-094.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "oval orange hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/oval-orange/ambertasbish-095.jpg", alt: { en: "oval orange detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-orange/ambertasbish-38.jpg", alt: { en: "oval orange detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-orange/ambertasbish-50.jpg", alt: { en: "oval orange detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-orange/ambertasbish-60.jpg", alt: { en: "oval orange detail", ar: "تفصيل" } },
            { image: "/images/imported/oval-orange/ambertasbish-74.jpg", alt: { en: "oval orange detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "necklace",
    collection: "signature-tasbih",
    title: { en: "necklace", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/necklace/ambertasbish-077.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "necklace hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/necklace/ambertasbish-078.jpg", alt: { en: "necklace detail", ar: "تفصيل" } },
            { image: "/images/imported/necklace/ambertasbish-079.jpg", alt: { en: "necklace detail", ar: "تفصيل" } },
            { image: "/images/imported/necklace/ambertasbish-32.jpg", alt: { en: "necklace detail", ar: "تفصيل" } },
            { image: "/images/imported/necklace/ambertasbish-33.jpg", alt: { en: "necklace detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "faceted-orange",
    collection: "signature-tasbih",
    title: { en: "faceted-orange", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/faceted-orange/ambertasbish-104.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "faceted-orange hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/faceted-orange/ambertasbish-105.jpg", alt: { en: "faceted-orange detail", ar: "تفصيل" } },
            { image: "/images/imported/faceted-orange/ambertasbish-41.jpg", alt: { en: "faceted-orange detail", ar: "تفصيل" } },
            { image: "/images/imported/faceted-orange/ambertasbish-47.jpg", alt: { en: "faceted-orange detail", ar: "تفصيل" } },
            { image: "/images/imported/faceted-orange/ambertasbish-66.jpg", alt: { en: "faceted-orange detail", ar: "تفصيل" } },
            { image: "/images/imported/faceted-orange/ambertasbish-70.jpg", alt: { en: "faceted-orange detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "faceted-choc",
    collection: "signature-tasbih",
    title: { en: "faceted-choc", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/faceted-choc/ambertasbish-099.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "faceted-choc hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/faceted-choc/ambertasbish-42.jpg", alt: { en: "faceted-choc detail", ar: "تفصيل" } },
            { image: "/images/imported/faceted-choc/ambertasbish-43.jpg", alt: { en: "faceted-choc detail", ar: "تفصيل" } },
            { image: "/images/imported/faceted-choc/ambertasbish-46.jpg", alt: { en: "faceted-choc detail", ar: "تفصيل" } },
            { image: "/images/imported/faceted-choc/ambertasbish-69.jpg", alt: { en: "faceted-choc detail", ar: "تفصيل" } },
            { image: "/images/imported/faceted-choc/size.jpg", alt: { en: "faceted-choc detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "faceted-redsand",
    collection: "signature-tasbih",
    title: { en: "faceted redsand", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/faceted-redsand/ambertasbish-39.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "faceted redsand hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/faceted-redsand/ambertasbish-48.jpg", alt: { en: "faceted redsand detail", ar: "تفصيل" } },
            { image: "/images/imported/faceted-redsand/ambertasbish-64.jpg", alt: { en: "faceted redsand detail", ar: "تفصيل" } },
            { image: "/images/imported/faceted-redsand/ambertasbish-65.jpg", alt: { en: "faceted redsand detail", ar: "تفصيل" } },
            { image: "/images/imported/faceted-redsand/ambertasbish-71.jpg", alt: { en: "faceted redsand detail", ar: "تفصيل" } },
            { image: "/images/imported/faceted-redsand/size.jpg", alt: { en: "faceted redsand detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "colorful",
    collection: "signature-tasbih",
    title: { en: "colorful", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/colorful/ambertasbish-090.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "colorful hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/colorful/ambertasbish-091.jpg", alt: { en: "colorful detail", ar: "تفصيل" } },
            { image: "/images/imported/colorful/ambertasbish-40.jpg", alt: { en: "colorful detail", ar: "تفصيل" } },
            { image: "/images/imported/colorful/ambertasbish-49.jpg", alt: { en: "colorful detail", ar: "تفصيل" } },
            { image: "/images/imported/colorful/ambertasbish-63.jpg", alt: { en: "colorful detail", ar: "تفصيل" } },
            { image: "/images/imported/colorful/ambertasbish-72.jpg", alt: { en: "colorful detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "yellowredamber",
    collection: "signature-tasbih",
    title: { en: "yellowredamber", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/yellowredamber/._main.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "yellowredamber hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/yellowredamber/._size.jpg", alt: { en: "yellowredamber detail", ar: "تفصيل" } },
            { image: "/images/imported/yellowredamber/amber-135.jpg", alt: { en: "yellowredamber detail", ar: "تفصيل" } },
            { image: "/images/imported/yellowredamber/amber-136.jpg", alt: { en: "yellowredamber detail", ar: "تفصيل" } },
            { image: "/images/imported/yellowredamber/amber-153.jpg", alt: { en: "yellowredamber detail", ar: "تفصيل" } },
            { image: "/images/imported/yellowredamber/amber-154.jpg", alt: { en: "yellowredamber detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "yellow-agrwood-amber33",
    collection: "signature-tasbih",
    title: { en: "yellow-agrwood-amber33", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/yellow-agrwood-amber33/._lady.png",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "yellow-agrwood-amber33 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/yellow-agrwood-amber33/._main.jpg", alt: { en: "yellow-agrwood-amber33 detail", ar: "تفصيل" } },
            { image: "/images/imported/yellow-agrwood-amber33/._sence.jpg", alt: { en: "yellow-agrwood-amber33 detail", ar: "تفصيل" } },
            { image: "/images/imported/yellow-agrwood-amber33/._size.jpg", alt: { en: "yellow-agrwood-amber33 detail", ar: "تفصيل" } },
            { image: "/images/imported/yellow-agrwood-amber33/amber-137.jpg", alt: { en: "yellow-agrwood-amber33 detail", ar: "تفصيل" } },
            { image: "/images/imported/yellow-agrwood-amber33/amber-138.jpg", alt: { en: "yellow-agrwood-amber33 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "peakcock33",
    collection: "signature-tasbih",
    title: { en: "peakcock33", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/peakcock33/._main.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "peakcock33 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/peakcock33/._main1.jpg", alt: { en: "peakcock33 detail", ar: "تفصيل" } },
            { image: "/images/imported/peakcock33/._size.jpg", alt: { en: "peakcock33 detail", ar: "تفصيل" } },
            { image: "/images/imported/peakcock33/amber-139.jpg", alt: { en: "peakcock33 detail", ar: "تفصيل" } },
            { image: "/images/imported/peakcock33/amber-151.jpg", alt: { en: "peakcock33 detail", ar: "تفصيل" } },
            { image: "/images/imported/peakcock33/amber-156.jpg", alt: { en: "peakcock33 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "bluetigereye33",
    collection: "signature-tasbih",
    title: { en: "bluetigereye33", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/bluetigereye33/._main.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "bluetigereye33 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/bluetigereye33/._size.jpg", alt: { en: "bluetigereye33 detail", ar: "تفصيل" } },
            { image: "/images/imported/bluetigereye33/amber-141.jpg", alt: { en: "bluetigereye33 detail", ar: "تفصيل" } },
            { image: "/images/imported/bluetigereye33/amber-142.jpg", alt: { en: "bluetigereye33 detail", ar: "تفصيل" } },
            { image: "/images/imported/bluetigereye33/amber-150.jpg", alt: { en: "bluetigereye33 detail", ar: "تفصيل" } },
            { image: "/images/imported/bluetigereye33/amber-157.jpg", alt: { en: "bluetigereye33 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "agarwood33new",
    collection: "signature-tasbih",
    title: { en: "Agarwood33new", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/agarwood33new/._amber-146.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "Agarwood33new hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/agarwood33new/._main.jpg", alt: { en: "Agarwood33new detail", ar: "تفصيل" } },
            { image: "/images/imported/agarwood33new/._size.jpg", alt: { en: "Agarwood33new detail", ar: "تفصيل" } },
            { image: "/images/imported/agarwood33new/amber-143.jpg", alt: { en: "Agarwood33new detail", ar: "تفصيل" } },
            { image: "/images/imported/agarwood33new/amber-144.jpg", alt: { en: "Agarwood33new detail", ar: "تفصيل" } },
            { image: "/images/imported/agarwood33new/amber-145.jpg", alt: { en: "Agarwood33new detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "redwhiteglass",
    collection: "signature-tasbih",
    title: { en: "redwhiteglass", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/redwhiteglass/._amber-099.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "redwhiteglass hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/redwhiteglass/._size.jpg", alt: { en: "redwhiteglass detail", ar: "تفصيل" } },
            { image: "/images/imported/redwhiteglass/amber-097.jpg", alt: { en: "redwhiteglass detail", ar: "تفصيل" } },
            { image: "/images/imported/redwhiteglass/amber-098.jpg", alt: { en: "redwhiteglass detail", ar: "تفصيل" } },
            { image: "/images/imported/redwhiteglass/amber-099.jpg", alt: { en: "redwhiteglass detail", ar: "تفصيل" } },
            { image: "/images/imported/redwhiteglass/amber-100.jpg", alt: { en: "redwhiteglass detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "redresin",
    collection: "signature-tasbih",
    title: { en: "redresin", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/redresin/._size.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "redresin hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/redresin/amber-093.jpg", alt: { en: "redresin detail", ar: "تفصيل" } },
            { image: "/images/imported/redresin/amber-111.jpg", alt: { en: "redresin detail", ar: "تفصيل" } },
            { image: "/images/imported/redresin/amber-112.jpg", alt: { en: "redresin detail", ar: "تفصيل" } },
            { image: "/images/imported/redresin/amber-113.jpg", alt: { en: "redresin detail", ar: "تفصيل" } },
            { image: "/images/imported/redresin/amber-114.jpg", alt: { en: "redresin detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "redglass",
    collection: "signature-tasbih",
    title: { en: "redglass", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/redglass/._amber-106.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "redglass hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/redglass/._size.jpg", alt: { en: "redglass detail", ar: "تفصيل" } },
            { image: "/images/imported/redglass/amber-095.jpg", alt: { en: "redglass detail", ar: "تفصيل" } },
            { image: "/images/imported/redglass/amber-106.jpg", alt: { en: "redglass detail", ar: "تفصيل" } },
            { image: "/images/imported/redglass/amber-107.jpg", alt: { en: "redglass detail", ar: "تفصيل" } },
            { image: "/images/imported/redglass/amber-108.jpg", alt: { en: "redglass detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "greenresin",
    collection: "signature-tasbih",
    title: { en: "greenresin", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/greenresin/._size.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "greenresin hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/greenresin/amber-094.jpg", alt: { en: "greenresin detail", ar: "تفصيل" } },
            { image: "/images/imported/greenresin/amber-110.jpg", alt: { en: "greenresin detail", ar: "تفصيل" } },
            { image: "/images/imported/greenresin/amber-115.jpg", alt: { en: "greenresin detail", ar: "تفصيل" } },
            { image: "/images/imported/greenresin/amber-116.jpg", alt: { en: "greenresin detail", ar: "تفصيل" } },
            { image: "/images/imported/greenresin/amber-117.jpg", alt: { en: "greenresin detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "blueglass",
    collection: "signature-tasbih",
    title: { en: "blueglass", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/blueglass/._size.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "blueglass hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/blueglass/amber-096.jpg", alt: { en: "blueglass detail", ar: "تفصيل" } },
            { image: "/images/imported/blueglass/amber-102.jpg", alt: { en: "blueglass detail", ar: "تفصيل" } },
            { image: "/images/imported/blueglass/amber-103.jpg", alt: { en: "blueglass detail", ar: "تفصيل" } },
            { image: "/images/imported/blueglass/amber-104.jpg", alt: { en: "blueglass detail", ar: "تفصيل" } },
            { image: "/images/imported/blueglass/amber-105.jpg", alt: { en: "blueglass detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "oudcube",
    collection: "signature-tasbih",
    title: { en: "oudcube", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/oudcube/._amber-54.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "oudcube hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/oudcube/._amber-61.jpg", alt: { en: "oudcube detail", ar: "تفصيل" } },
            { image: "/images/imported/oudcube/._amber-75.jpg", alt: { en: "oudcube detail", ar: "تفصيل" } },
            { image: "/images/imported/oudcube/._main.jpg", alt: { en: "oudcube detail", ar: "تفصيل" } },
            { image: "/images/imported/oudcube/._size.jpg", alt: { en: "oudcube detail", ar: "تفصيل" } },
            { image: "/images/imported/oudcube/amber-54.jpg", alt: { en: "oudcube detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "blueredtiger33",
    collection: "signature-tasbih",
    title: { en: "blueredtiger33", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/blueredtiger33/._amber-68.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "blueredtiger33 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/blueredtiger33/._amber-69.jpg", alt: { en: "blueredtiger33 detail", ar: "تفصيل" } },
            { image: "/images/imported/blueredtiger33/._main.jpg", alt: { en: "blueredtiger33 detail", ar: "تفصيل" } },
            { image: "/images/imported/blueredtiger33/._size.jpg", alt: { en: "blueredtiger33 detail", ar: "تفصيل" } },
            { image: "/images/imported/blueredtiger33/amber-55.jpg", alt: { en: "blueredtiger33 detail", ar: "تفصيل" } },
            { image: "/images/imported/blueredtiger33/amber-58.jpg", alt: { en: "blueredtiger33 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "ambercube33",
    collection: "signature-tasbih",
    title: { en: "ambercube33", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/ambercube33/._gen.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "ambercube33 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/ambercube33/._main.jpg", alt: { en: "ambercube33 detail", ar: "تفصيل" } },
            { image: "/images/imported/ambercube33/._size.jpg", alt: { en: "ambercube33 detail", ar: "تفصيل" } },
            { image: "/images/imported/ambercube33/amber-53.jpg", alt: { en: "ambercube33 detail", ar: "تفصيل" } },
            { image: "/images/imported/ambercube33/amber-60.jpg", alt: { en: "ambercube33 detail", ar: "تفصيل" } },
            { image: "/images/imported/ambercube33/amber-63.jpg", alt: { en: "ambercube33 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "amberart33",
    collection: "signature-tasbih",
    title: { en: "amberart33", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/amberart33/._genuine.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "amberart33 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/amberart33/._main.jpg", alt: { en: "amberart33 detail", ar: "تفصيل" } },
            { image: "/images/imported/amberart33/._size.jpg", alt: { en: "amberart33 detail", ar: "تفصيل" } },
            { image: "/images/imported/amberart33/amber-56.jpg", alt: { en: "amberart33 detail", ar: "تفصيل" } },
            { image: "/images/imported/amberart33/amber-57.jpg", alt: { en: "amberart33 detail", ar: "تفصيل" } },
            { image: "/images/imported/amberart33/amber-59.jpg", alt: { en: "amberart33 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "grayglass33",
    collection: "signature-tasbih",
    title: { en: "grayglass33", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/grayglass33/._size.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "grayglass33 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/grayglass33/amber-22.jpg", alt: { en: "grayglass33 detail", ar: "تفصيل" } },
            { image: "/images/imported/grayglass33/amber-26.jpg", alt: { en: "grayglass33 detail", ar: "تفصيل" } },
            { image: "/images/imported/grayglass33/amber-27.jpg", alt: { en: "grayglass33 detail", ar: "تفصيل" } },
            { image: "/images/imported/grayglass33/amber-34.jpg", alt: { en: "grayglass33 detail", ar: "تفصيل" } },
            { image: "/images/imported/grayglass33/amber-35.jpg", alt: { en: "grayglass33 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "bluelight99",
    collection: "signature-tasbih",
    title: { en: "bluelight99", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/bluelight99/._com.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "bluelight99 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/bluelight99/._main.jpg", alt: { en: "bluelight99 detail", ar: "تفصيل" } },
            { image: "/images/imported/bluelight99/._size.jpg", alt: { en: "bluelight99 detail", ar: "تفصيل" } },
            { image: "/images/imported/bluelight99/amber-20.jpg", alt: { en: "bluelight99 detail", ar: "تفصيل" } },
            { image: "/images/imported/bluelight99/amber-21.jpg", alt: { en: "bluelight99 detail", ar: "تفصيل" } },
            { image: "/images/imported/bluelight99/amber-24.jpg", alt: { en: "bluelight99 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "bluelight33",
    collection: "signature-tasbih",
    title: { en: "bluelight33", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/bluelight33/._com.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "bluelight33 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/bluelight33/._main.jpg", alt: { en: "bluelight33 detail", ar: "تفصيل" } },
            { image: "/images/imported/bluelight33/._size.jpg", alt: { en: "bluelight33 detail", ar: "تفصيل" } },
            { image: "/images/imported/bluelight33/amber-19.jpg", alt: { en: "bluelight33 detail", ar: "تفصيل" } },
            { image: "/images/imported/bluelight33/amber-23.jpg", alt: { en: "bluelight33 detail", ar: "تفصيل" } },
            { image: "/images/imported/bluelight33/amber-25.jpg", alt: { en: "bluelight33 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "lumigreen",
    collection: "signature-tasbih",
    title: { en: "lumigreen", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/lumigreen/_DSC1329.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "lumigreen hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/lumigreen/_DSC1332.jpg", alt: { en: "lumigreen detail", ar: "تفصيل" } },
            { image: "/images/imported/lumigreen/_DSC1352.jpg", alt: { en: "lumigreen detail", ar: "تفصيل" } },
            { image: "/images/imported/lumigreen/_DSC1355.jpg", alt: { en: "lumigreen detail", ar: "تفصيل" } },
            { image: "/images/imported/lumigreen/_DSC1360-Enhanced-NR.jpg", alt: { en: "lumigreen detail", ar: "تفصيل" } },
            { image: "/images/imported/lumigreen/_DSC1369.jpg", alt: { en: "lumigreen detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "lumicolor",
    collection: "signature-tasbih",
    title: { en: "lumicolor", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/lumicolor/.__DSC1384.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "lumicolor hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/lumicolor/_DSC1327.jpg", alt: { en: "lumicolor detail", ar: "تفصيل" } },
            { image: "/images/imported/lumicolor/_DSC1334.jpg", alt: { en: "lumicolor detail", ar: "تفصيل" } },
            { image: "/images/imported/lumicolor/_DSC1350.jpg", alt: { en: "lumicolor detail", ar: "تفصيل" } },
            { image: "/images/imported/lumicolor/_DSC1361.jpg", alt: { en: "lumicolor detail", ar: "تفصيل" } },
            { image: "/images/imported/lumicolor/_DSC1368.jpg", alt: { en: "lumicolor detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "imitateredamber",
    collection: "signature-tasbih",
    title: { en: "imitateredamber", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/imitateredamber/_DSC1418.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "imitateredamber hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/imitateredamber/_DSC1425.jpg", alt: { en: "imitateredamber detail", ar: "تفصيل" } },
            { image: "/images/imported/imitateredamber/_DSC1430.jpg", alt: { en: "imitateredamber detail", ar: "تفصيل" } },
            { image: "/images/imported/imitateredamber/_DSC1437.jpg", alt: { en: "imitateredamber detail", ar: "تفصيل" } },
            { image: "/images/imported/imitateredamber/_DSC1444.jpg", alt: { en: "imitateredamber detail", ar: "تفصيل" } },
            { image: "/images/imported/imitateredamber/size.jpg", alt: { en: "imitateredamber detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "imamber99",
    collection: "signature-tasbih",
    title: { en: "imamber99", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/imamber99/_DSC1422.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "imamber99 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/imamber99/_DSC1423.jpg", alt: { en: "imamber99 detail", ar: "تفصيل" } },
            { image: "/images/imported/imamber99/_DSC1431.jpg", alt: { en: "imamber99 detail", ar: "تفصيل" } },
            { image: "/images/imported/imamber99/_DSC1436.jpg", alt: { en: "imamber99 detail", ar: "تفصيل" } },
            { image: "/images/imported/imamber99/_DSC1440.jpg", alt: { en: "imamber99 detail", ar: "تفصيل" } },
            { image: "/images/imported/imamber99/size.jpg", alt: { en: "imamber99 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "colorchangedrop",
    collection: "signature-tasbih",
    title: { en: "colorchangedrop", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/colorchangedrop/C0019T01.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "colorchangedrop hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/colorchangedrop/DSC01404-Enhanced-NR.jpg", alt: { en: "colorchangedrop detail", ar: "تفصيل" } },
            { image: "/images/imported/colorchangedrop/_DSC1326.jpg", alt: { en: "colorchangedrop detail", ar: "تفصيل" } },
            { image: "/images/imported/colorchangedrop/_DSC1335.jpg", alt: { en: "colorchangedrop detail", ar: "تفصيل" } },
            { image: "/images/imported/colorchangedrop/_DSC1343.jpg", alt: { en: "colorchangedrop detail", ar: "تفصيل" } },
            { image: "/images/imported/colorchangedrop/_DSC1344.jpg", alt: { en: "colorchangedrop detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "colorchangecube",
    collection: "signature-tasbih",
    title: { en: "colorchangecube", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/colorchangecube/C0020T01.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "colorchangecube hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/colorchangecube/DSC01400.jpg", alt: { en: "colorchangecube detail", ar: "تفصيل" } },
            { image: "/images/imported/colorchangecube/_DSC1321.jpg", alt: { en: "colorchangecube detail", ar: "تفصيل" } },
            { image: "/images/imported/colorchangecube/_DSC1337.jpg", alt: { en: "colorchangecube detail", ar: "تفصيل" } },
            { image: "/images/imported/colorchangecube/_DSC1345.jpg", alt: { en: "colorchangecube detail", ar: "تفصيل" } },
            { image: "/images/imported/colorchangecube/_DSC1363-Enhanced-NR.jpg", alt: { en: "colorchangecube detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "argwoodselect",
    collection: "signature-tasbih",
    title: { en: "argwoodselect", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/argwoodselect/_DSC1421.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "argwoodselect hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/argwoodselect/_DSC1424.jpg", alt: { en: "argwoodselect detail", ar: "تفصيل" } },
            { image: "/images/imported/argwoodselect/_DSC1432.jpg", alt: { en: "argwoodselect detail", ar: "تفصيل" } },
            { image: "/images/imported/argwoodselect/_DSC1433.jpg", alt: { en: "argwoodselect detail", ar: "تفصيل" } },
            { image: "/images/imported/argwoodselect/_DSC1443.jpg", alt: { en: "argwoodselect detail", ar: "تفصيل" } },
            { image: "/images/imported/argwoodselect/main.jpg", alt: { en: "argwoodselect detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "tigereye",
    collection: "signature-tasbih",
    title: { en: "tigereye", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/tigereye/amber-11.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "tigereye hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/tigereye/amber-12.jpg", alt: { en: "tigereye detail", ar: "تفصيل" } },
            { image: "/images/imported/tigereye/amber-13.jpg", alt: { en: "tigereye detail", ar: "تفصيل" } },
            { image: "/images/imported/tigereye/amber-14.jpg", alt: { en: "tigereye detail", ar: "تفصيل" } },
            { image: "/images/imported/tigereye/size.jpg", alt: { en: "tigereye detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "ambers",
    collection: "signature-tasbih",
    title: { en: "ambers", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/ambers/amber-05.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "ambers hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/ambers/amber-06.jpg", alt: { en: "ambers detail", ar: "تفصيل" } },
            { image: "/images/imported/ambers/amber-07.jpg", alt: { en: "ambers detail", ar: "تفصيل" } },
            { image: "/images/imported/ambers/amber-08.jpg", alt: { en: "ambers detail", ar: "تفصيل" } },
            { image: "/images/imported/ambers/size.jpg", alt: { en: "ambers detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "amberl",
    collection: "signature-tasbih",
    title: { en: "amberl", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/amberl/amber-04.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "amberl hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/amberl/amber-09.jpg", alt: { en: "amberl detail", ar: "تفصيل" } },
            { image: "/images/imported/amberl/amber-10.jpg", alt: { en: "amberl detail", ar: "تفصيل" } },
            { image: "/images/imported/amberl/size.jpg", alt: { en: "amberl detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "yellow",
    collection: "signature-tasbih",
    title: { en: "yellow", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/yellow/red-26.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "yellow hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/yellow/red-27.jpg", alt: { en: "yellow detail", ar: "تفصيل" } },
            { image: "/images/imported/yellow/red-28.jpg", alt: { en: "yellow detail", ar: "تفصيل" } },
            { image: "/images/imported/yellow/red-29.jpg", alt: { en: "yellow detail", ar: "تفصيل" } },
            { image: "/images/imported/yellow/red-30.jpg", alt: { en: "yellow detail", ar: "تفصيل" } },
            { image: "/images/imported/yellow/red-35.jpg", alt: { en: "yellow detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "red",
    collection: "signature-tasbih",
    title: { en: "red", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/red/C0008T01.JPG",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "red hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/red/C0009T01.JPG", alt: { en: "red detail", ar: "تفصيل" } },
            { image: "/images/imported/red/C0010T01.JPG", alt: { en: "red detail", ar: "تفصيل" } },
            { image: "/images/imported/red/C0011T01.JPG", alt: { en: "red detail", ar: "تفصيل" } },
            { image: "/images/imported/red/red-1.jpg", alt: { en: "red detail", ar: "تفصيل" } },
            { image: "/images/imported/red/red-2.jpg", alt: { en: "red detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "purple",
    collection: "signature-tasbih",
    title: { en: "purple", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/purple/red-19.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "purple hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/purple/red-20.jpg", alt: { en: "purple detail", ar: "تفصيل" } },
            { image: "/images/imported/purple/red-21.jpg", alt: { en: "purple detail", ar: "تفصيل" } },
            { image: "/images/imported/purple/red-22.jpg", alt: { en: "purple detail", ar: "تفصيل" } },
            { image: "/images/imported/purple/red-23.jpg", alt: { en: "purple detail", ar: "تفصيل" } },
            { image: "/images/imported/purple/red-24.jpg", alt: { en: "purple detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "green",
    collection: "signature-tasbih",
    title: { en: "green", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/green/diff.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "green hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/green/red-07.jpg", alt: { en: "green detail", ar: "تفصيل" } },
            { image: "/images/imported/green/red-08.jpg", alt: { en: "green detail", ar: "تفصيل" } },
            { image: "/images/imported/green/red-09.jpg", alt: { en: "green detail", ar: "تفصيل" } },
            { image: "/images/imported/green/red-10.jpg", alt: { en: "green detail", ar: "تفصيل" } },
            { image: "/images/imported/green/red-11.jpg", alt: { en: "green detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "blue",
    collection: "signature-tasbih",
    title: { en: "blue", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/blue/red-13.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "blue hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/blue/red-14.jpg", alt: { en: "blue detail", ar: "تفصيل" } },
            { image: "/images/imported/blue/red-15.jpg", alt: { en: "blue detail", ar: "تفصيل" } },
            { image: "/images/imported/blue/red-16.jpg", alt: { en: "blue detail", ar: "تفصيل" } },
            { image: "/images/imported/blue/red-17.jpg", alt: { en: "blue detail", ar: "تفصيل" } },
            { image: "/images/imported/blue/red-18.jpg", alt: { en: "blue detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "11",
    collection: "signature-tasbih",
    title: { en: "黑曜石 11", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/11/new-04.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "黑曜石 11 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/11/new-05.jpg", alt: { en: "黑曜石 11 detail", ar: "تفصيل" } },
            { image: "/images/imported/11/new-51.jpg", alt: { en: "黑曜石 11 detail", ar: "تفصيل" } },
            { image: "/images/imported/11/ram-65.jpg", alt: { en: "黑曜石 11 detail", ar: "تفصيل" } },
            { image: "/images/imported/11/ram-66.jpg", alt: { en: "黑曜石 11 detail", ar: "تفصيل" } },
            { image: "/images/imported/11/size.jpg", alt: { en: "黑曜石 11 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "33",
    collection: "signature-tasbih",
    title: { en: "仿孔雀石 33", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/33/new-03.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "仿孔雀石 33 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/33/new-31.jpg", alt: { en: "仿孔雀石 33 detail", ar: "تفصيل" } },
            { image: "/images/imported/33/new-32.jpg", alt: { en: "仿孔雀石 33 detail", ar: "تفصيل" } },
            { image: "/images/imported/33/new-41.jpg", alt: { en: "仿孔雀石 33 detail", ar: "تفصيل" } },
            { image: "/images/imported/33/new-49.jpg", alt: { en: "仿孔雀石 33 detail", ar: "تفصيل" } },
            { image: "/images/imported/33/new-50.jpg", alt: { en: "仿孔雀石 33 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "whiteagate33-s",
    collection: "signature-tasbih",
    title: { en: "whiteagate33-s", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/whiteagate33-s/ram-23.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "whiteagate33-s hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/whiteagate33-s/ram-24.jpg", alt: { en: "whiteagate33-s detail", ar: "تفصيل" } },
            { image: "/images/imported/whiteagate33-s/ram-30.jpg", alt: { en: "whiteagate33-s detail", ar: "تفصيل" } },
            { image: "/images/imported/whiteagate33-s/ram-31.jpg", alt: { en: "whiteagate33-s detail", ar: "تفصيل" } },
            { image: "/images/imported/whiteagate33-s/ram-32.jpg", alt: { en: "whiteagate33-s detail", ar: "تفصيل" } },
            { image: "/images/imported/whiteagate33-s/ram-35.jpg", alt: { en: "whiteagate33-s detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "whiteagate33",
    collection: "signature-tasbih",
    title: { en: "whiteagate33", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/whiteagate33/ram-22.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "whiteagate33 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/whiteagate33/ram-26.jpg", alt: { en: "whiteagate33 detail", ar: "تفصيل" } },
            { image: "/images/imported/whiteagate33/ram-37.jpg", alt: { en: "whiteagate33 detail", ar: "تفصيل" } },
            { image: "/images/imported/whiteagate33/ram-41.jpg", alt: { en: "whiteagate33 detail", ar: "تفصيل" } },
            { image: "/images/imported/whiteagate33/ram-42.jpg", alt: { en: "whiteagate33 detail", ar: "تفصيل" } },
            { image: "/images/imported/whiteagate33/ram-43.jpg", alt: { en: "whiteagate33 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "greenagate99",
    collection: "signature-tasbih",
    title: { en: "greenagate99", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/greenagate99/ram-01.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "greenagate99 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/greenagate99/ram-02.jpg", alt: { en: "greenagate99 detail", ar: "تفصيل" } },
            { image: "/images/imported/greenagate99/ram-08.jpg", alt: { en: "greenagate99 detail", ar: "تفصيل" } },
            { image: "/images/imported/greenagate99/ram-09.jpg", alt: { en: "greenagate99 detail", ar: "تفصيل" } },
            { image: "/images/imported/greenagate99/ram-10.jpg", alt: { en: "greenagate99 detail", ar: "تفصيل" } },
            { image: "/images/imported/greenagate99/ram-14.jpg", alt: { en: "greenagate99 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "glass-smoke",
    collection: "signature-tasbih",
    title: { en: "glass-smoke", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/glass-smoke/main.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "glass-smoke hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/glass-smoke/ram-03.jpg", alt: { en: "glass-smoke detail", ar: "تفصيل" } },
            { image: "/images/imported/glass-smoke/ram-04.jpg", alt: { en: "glass-smoke detail", ar: "تفصيل" } },
            { image: "/images/imported/glass-smoke/ram-13.jpg", alt: { en: "glass-smoke detail", ar: "تفصيل" } },
            { image: "/images/imported/glass-smoke/ram-20.jpg", alt: { en: "glass-smoke detail", ar: "تفصيل" } },
            { image: "/images/imported/glass-smoke/ram-21.jpg", alt: { en: "glass-smoke detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "glass-champon",
    collection: "signature-tasbih",
    title: { en: "glass-champon", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/glass-champon/main.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "glass-champon hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/glass-champon/ram-05.jpg", alt: { en: "glass-champon detail", ar: "تفصيل" } },
            { image: "/images/imported/glass-champon/ram-06.jpg", alt: { en: "glass-champon detail", ar: "تفصيل" } },
            { image: "/images/imported/glass-champon/ram-07.jpg", alt: { en: "glass-champon detail", ar: "تفصيل" } },
            { image: "/images/imported/glass-champon/ram-11.jpg", alt: { en: "glass-champon detail", ar: "تفصيل" } },
            { image: "/images/imported/glass-champon/ram-12.jpg", alt: { en: "glass-champon detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "blackagate33-s",
    collection: "signature-tasbih",
    title: { en: "blackagate33-s", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/blackagate33-s/main.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "blackagate33-s hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/blackagate33-s/ram-16.jpg", alt: { en: "blackagate33-s detail", ar: "تفصيل" } },
            { image: "/images/imported/blackagate33-s/ram-17.jpg", alt: { en: "blackagate33-s detail", ar: "تفصيل" } },
            { image: "/images/imported/blackagate33-s/ram-28.jpg", alt: { en: "blackagate33-s detail", ar: "تفصيل" } },
            { image: "/images/imported/blackagate33-s/ram-33.jpg", alt: { en: "blackagate33-s detail", ar: "تفصيل" } },
            { image: "/images/imported/blackagate33-s/ram-34.jpg", alt: { en: "blackagate33-s detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "onxy",
    collection: "signature-tasbih",
    title: { en: "onxy", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/onxy/new-10.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "onxy hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/onxy/new-11.jpg", alt: { en: "onxy detail", ar: "تفصيل" } },
            { image: "/images/imported/onxy/new-12.jpg", alt: { en: "onxy detail", ar: "تفصيل" } },
            { image: "/images/imported/onxy/new-13.jpg", alt: { en: "onxy detail", ar: "تفصيل" } },
            { image: "/images/imported/onxy/size.jpg", alt: { en: "onxy detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "lumnousglass99",
    collection: "signature-tasbih",
    title: { en: "lumnousglass99", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/lumnousglass99/com.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "lumnousglass99 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/lumnousglass99/new-02.jpg", alt: { en: "lumnousglass99 detail", ar: "تفصيل" } },
            { image: "/images/imported/lumnousglass99/new-03.jpg", alt: { en: "lumnousglass99 detail", ar: "تفصيل" } },
            { image: "/images/imported/lumnousglass99/new-04.jpg", alt: { en: "lumnousglass99 detail", ar: "تفصيل" } },
            { image: "/images/imported/lumnousglass99/new-05.jpg", alt: { en: "lumnousglass99 detail", ar: "تفصيل" } },
            { image: "/images/imported/lumnousglass99/new-06.jpg", alt: { en: "lumnousglass99 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "lum99blue",
    collection: "signature-tasbih",
    title: { en: "lum99blue", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/lum99blue/glow.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "lum99blue hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/lum99blue/lum99-1.jpg", alt: { en: "lum99blue detail", ar: "تفصيل" } },
            { image: "/images/imported/lum99blue/lum99-2.jpg", alt: { en: "lum99blue detail", ar: "تفصيل" } },
            { image: "/images/imported/lum99blue/lum99-3.jpg", alt: { en: "lum99blue detail", ar: "تفصيل" } },
            { image: "/images/imported/lum99blue/lum99-4.jpg", alt: { en: "lum99blue detail", ar: "تفصيل" } },
            { image: "/images/imported/lum99blue/lum99-5.jpg", alt: { en: "lum99blue detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "kuka99",
    collection: "signature-tasbih",
    title: { en: "kuka99", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/kuka99/lum99-10.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "kuka99 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/kuka99/lum99-11.jpg", alt: { en: "kuka99 detail", ar: "تفصيل" } },
            { image: "/images/imported/kuka99/new-01.jpg", alt: { en: "kuka99 detail", ar: "تفصيل" } },
            { image: "/images/imported/kuka99/new-14.jpg", alt: { en: "kuka99 detail", ar: "تفصيل" } },
            { image: "/images/imported/kuka99/new-15.jpg", alt: { en: "kuka99 detail", ar: "تفصيل" } },
            { image: "/images/imported/kuka99/new-16.jpg", alt: { en: "kuka99 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "agate-tasbih",
    collection: "signature-tasbih",
    title: { en: "Agate Tasbih", ar: "سبحة العقيق" },
    summary: { en: "A 33-bead Agate tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من العقيق بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/agate-tasbih/C0001T01.JPG",
    material: { en: "Agate", ar: "العقيق" },
    tags: { en: ["Agate", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0627\u0644\u0639\u0642\u064a\u0642", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted agate tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من العقيق بمظهر متطور." },
    detailBody: { en: "This agate tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من العقيق بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "Agate Tasbih hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/agate-tasbih/C0002T01.JPG", alt: { en: "Agate Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/agate-tasbih/C0003T01.JPG", alt: { en: "Agate Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/agate-tasbih/C0004T01.JPG", alt: { en: "Agate Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/agate-tasbih/C0005T01.JPG", alt: { en: "Agate Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/agate-tasbih/C0006T01.JPG", alt: { en: "Agate Tasbih detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "العقيق" } },
    ],
  },
  {
    slug: "99whitepine",
    collection: "signature-tasbih",
    title: { en: "99whitepine", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/99whitepine/main.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "99whitepine hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/99whitepine/main2.jpg", alt: { en: "99whitepine detail", ar: "تفصيل" } },
            { image: "/images/imported/99whitepine/newwood-01.jpg", alt: { en: "99whitepine detail", ar: "تفصيل" } },
            { image: "/images/imported/99whitepine/newwood-02.jpg", alt: { en: "99whitepine detail", ar: "تفصيل" } },
            { image: "/images/imported/99whitepine/newwood-05.jpg", alt: { en: "99whitepine detail", ar: "تفصيل" } },
            { image: "/images/imported/99whitepine/newwood-27.jpg", alt: { en: "99whitepine detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "99blackrosewood",
    collection: "signature-tasbih",
    title: { en: "99blackrosewood", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/99blackrosewood/main.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "99blackrosewood hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/99blackrosewood/newwood-03.jpg", alt: { en: "99blackrosewood detail", ar: "تفصيل" } },
            { image: "/images/imported/99blackrosewood/newwood-04.jpg", alt: { en: "99blackrosewood detail", ar: "تفصيل" } },
            { image: "/images/imported/99blackrosewood/newwood-06.jpg", alt: { en: "99blackrosewood detail", ar: "تفصيل" } },
            { image: "/images/imported/99blackrosewood/newwood-29.jpg", alt: { en: "99blackrosewood detail", ar: "تفصيل" } },
            { image: "/images/imported/99blackrosewood/newwood-36.jpg", alt: { en: "99blackrosewood detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "33wood",
    collection: "signature-tasbih",
    title: { en: "33wood", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/33wood/blackmain.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "33wood hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/33wood/bloodmain.jpg", alt: { en: "33wood detail", ar: "تفصيل" } },
            { image: "/images/imported/33wood/goldenmain.jpg", alt: { en: "33wood detail", ar: "تفصيل" } },
            { image: "/images/imported/33wood/greensandalmain.jpg", alt: { en: "33wood detail", ar: "تفصيل" } },
            { image: "/images/imported/33wood/newwood-07.jpg", alt: { en: "33wood detail", ar: "تفصيل" } },
            { image: "/images/imported/33wood/newwood-08.jpg", alt: { en: "33wood detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "33whitepine",
    collection: "signature-tasbih",
    title: { en: "33whitepine", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/33whitepine/main.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "33whitepine hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/33whitepine/newwood-27.jpg", alt: { en: "33whitepine detail", ar: "تفصيل" } },
            { image: "/images/imported/33whitepine/newwood-28.jpg", alt: { en: "33whitepine detail", ar: "تفصيل" } },
            { image: "/images/imported/33whitepine/newwood-44.jpg", alt: { en: "33whitepine detail", ar: "تفصيل" } },
            { image: "/images/imported/33whitepine/newwood-50.jpg", alt: { en: "33whitepine detail", ar: "تفصيل" } },
            { image: "/images/imported/33whitepine/newwood-74.jpg", alt: { en: "33whitepine detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "yellowamber",
    collection: "signature-tasbih",
    title: { en: "yellowamber", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/yellowamber/1111.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "yellowamber hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/yellowamber/925.jpg", alt: { en: "yellowamber detail", ar: "تفصيل" } },
            { image: "/images/imported/yellowamber/main-2.jpg", alt: { en: "yellowamber detail", ar: "تفصيل" } },
            { image: "/images/imported/yellowamber/main.jpg", alt: { en: "yellowamber detail", ar: "تفصيل" } },
            { image: "/images/imported/yellowamber/new-07.jpg", alt: { en: "yellowamber detail", ar: "تفصيل" } },
            { image: "/images/imported/yellowamber/new-10.jpg", alt: { en: "yellowamber detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "roundargwood",
    collection: "signature-tasbih",
    title: { en: "roundargwood", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/roundargwood/new-05.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "roundargwood hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/roundargwood/new-06.jpg", alt: { en: "roundargwood detail", ar: "تفصيل" } },
            { image: "/images/imported/roundargwood/new-17.jpg", alt: { en: "roundargwood detail", ar: "تفصيل" } },
            { image: "/images/imported/roundargwood/new-22.jpg", alt: { en: "roundargwood detail", ar: "تفصيل" } },
            { image: "/images/imported/roundargwood/new-25.jpg", alt: { en: "roundargwood detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "redamber",
    collection: "signature-tasbih",
    title: { en: "redamber", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/redamber/main.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "redamber hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/redamber/new-08.jpg", alt: { en: "redamber detail", ar: "تفصيل" } },
            { image: "/images/imported/redamber/new-09.jpg", alt: { en: "redamber detail", ar: "تفصيل" } },
            { image: "/images/imported/redamber/new-16.jpg", alt: { en: "redamber detail", ar: "تفصيل" } },
            { image: "/images/imported/redamber/new-18.jpg", alt: { en: "redamber detail", ar: "تفصيل" } },
            { image: "/images/imported/redamber/new-21.jpg", alt: { en: "redamber detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "greenwood",
    collection: "signature-tasbih",
    title: { en: "greenwood", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/greenwood/main.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "greenwood hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/greenwood/new-01.jpg", alt: { en: "greenwood detail", ar: "تفصيل" } },
            { image: "/images/imported/greenwood/new-02.jpg", alt: { en: "greenwood detail", ar: "تفصيل" } },
            { image: "/images/imported/greenwood/new-13.jpg", alt: { en: "greenwood detail", ar: "تفصيل" } },
            { image: "/images/imported/greenwood/new-26.jpg", alt: { en: "greenwood detail", ar: "تفصيل" } },
            { image: "/images/imported/greenwood/new-28.jpg", alt: { en: "greenwood detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "barrowargwood",
    collection: "signature-tasbih",
    title: { en: "barrowargwood", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/barrowargwood/main-Turkish.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "barrowargwood hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/barrowargwood/main.jpg", alt: { en: "barrowargwood detail", ar: "تفصيل" } },
            { image: "/images/imported/barrowargwood/mian-arbic.jpg", alt: { en: "barrowargwood detail", ar: "تفصيل" } },
            { image: "/images/imported/barrowargwood/new-03.jpg", alt: { en: "barrowargwood detail", ar: "تفصيل" } },
            { image: "/images/imported/barrowargwood/new-04.jpg", alt: { en: "barrowargwood detail", ar: "تفصيل" } },
            { image: "/images/imported/barrowargwood/new-14.jpg", alt: { en: "barrowargwood detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "agrwood33",
    collection: "signature-tasbih",
    title: { en: "agrwood33", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/agrwood33/ambertest-1.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "agrwood33 hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/agrwood33/main.jpg", alt: { en: "agrwood33 detail", ar: "تفصيل" } },
            { image: "/images/imported/agrwood33/shellnew-03.jpg", alt: { en: "agrwood33 detail", ar: "تفصيل" } },
            { image: "/images/imported/agrwood33/shellnew-04.jpg", alt: { en: "agrwood33 detail", ar: "تفصيل" } },
            { image: "/images/imported/agrwood33/shellnew-09.jpg", alt: { en: "agrwood33 detail", ar: "تفصيل" } },
            { image: "/images/imported/agrwood33/shellnew-10.jpg", alt: { en: "agrwood33 detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "99shellbrown",
    collection: "signature-tasbih",
    title: { en: "99shellbrown", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/99shellbrown/ambertest-7.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "99shellbrown hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/99shellbrown/main.jpg", alt: { en: "99shellbrown detail", ar: "تفصيل" } },
            { image: "/images/imported/99shellbrown/newwood-58.jpg", alt: { en: "99shellbrown detail", ar: "تفصيل" } },
            { image: "/images/imported/99shellbrown/newwood-59.jpg", alt: { en: "99shellbrown detail", ar: "تفصيل" } },
            { image: "/images/imported/99shellbrown/shellnew-01.jpg", alt: { en: "99shellbrown detail", ar: "تفصيل" } },
            { image: "/images/imported/99shellbrown/shellnew-02.jpg", alt: { en: "99shellbrown detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "99shellgolden",
    collection: "signature-tasbih",
    title: { en: "99shellGolden", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/99shellgolden/ambertest-2.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "99shellGolden hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/99shellgolden/main.jpg", alt: { en: "99shellGolden detail", ar: "تفصيل" } },
            { image: "/images/imported/99shellgolden/shellnew-07.jpg", alt: { en: "99shellGolden detail", ar: "تفصيل" } },
            { image: "/images/imported/99shellgolden/shellnew-08.jpg", alt: { en: "99shellGolden detail", ar: "تفصيل" } },
            { image: "/images/imported/99shellgolden/shellnew-13.jpg", alt: { en: "99shellGolden detail", ar: "تفصيل" } },
            { image: "/images/imported/99shellgolden/shellnew-17.jpg", alt: { en: "99shellGolden detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "33shellbar",
    collection: "signature-tasbih",
    title: { en: "33shellbar", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/33shellbar/ambertest-8.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "33shellbar hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/33shellbar/main.jpg", alt: { en: "33shellbar detail", ar: "تفصيل" } },
            { image: "/images/imported/33shellbar/shellnew-05.jpg", alt: { en: "33shellbar detail", ar: "تفصيل" } },
            { image: "/images/imported/33shellbar/shellnew-06.jpg", alt: { en: "33shellbar detail", ar: "تفصيل" } },
            { image: "/images/imported/33shellbar/shellnew-14.jpg", alt: { en: "33shellbar detail", ar: "تفصيل" } },
            { image: "/images/imported/33shellbar/shellnew-15.jpg", alt: { en: "33shellbar detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
    ],
  },
  {
    slug: "tiger-eye-tasbih",
    collection: "signature-tasbih",
    title: { en: "Tiger Eye Tasbih", ar: "سبحة عين النمر" },
    summary: { en: "A 33-bead Tiger Eye tasbih with premium finish. Perfect for daily dhikr and spiritual practice.", ar: "سبحة من 33 حبة من عين النمر بتشطيب فاخر. مثالية للذكر اليومي والممارسة الروحية." },
    image: "/images/imported/tiger-eye-tasbih/handcraft.jpg",
    material: { en: "Tiger Eye", ar: "عين النمر" },
    tags: { en: ["Tiger Eye", "33 Beads", "Prayer Beads", "Giftable"], ar: ["\u0639\u064a\u0646 \u0627\u0644\u0646\u0645\u0631", "33 \u062d\u0628\u0629", "\u0633\u0628\u062d\u0629 \u0635\u0644\u0627\u0629", "\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0647\u062f\u0627\u064a\u0627"] },
    detailIntro: { en: "A beautifully crafted tiger eye tasbih with a sophisticated appearance.", ar: "مسبحة مصنوعة بشكل جميل من عين النمر بمظهر متطور." },
    detailBody: { en: "This tiger eye tasbih features high-quality beads with a polished finish. The 33-bead format is ideal for daily dhikr. Suitable for boutiques, gift shops, and spiritual retailers seeking premium prayer beads.", ar: "تتميز هذه المسبحة من عين النمر بحبات عالية الجودة بتشطيب لامع. صيغة 33 حبة مثالية للذكر اليومي. مناسبة للبوتيكات ومتاجر الهدايا والبيع بالتجزئة الروحية التي تبحث عن سبحات صلاة فاخرة." },
    idealFor: { en: "Boutiques, gift shops, spiritual retailers, Ramadan gifting", ar: "البوتيكات، متاجر الهدايا، تجار التجزئة الروحيين، هدايا رمضان" },
    heroAlt: { en: "Tiger Eye Tasbih hero", ar: "الصورة الرئيسية" },
    gallery: [
            { image: "/images/imported/tiger-eye-tasbih/lum.jpg", alt: { en: "Tiger Eye Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/tiger-eye-tasbih/size.jpg", alt: { en: "Tiger Eye Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/tiger-eye-tasbih/tasbihglass-01.jpg", alt: { en: "Tiger Eye Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/tiger-eye-tasbih/tasbihglass-02.jpg", alt: { en: "Tiger Eye Tasbih detail", ar: "تفصيل" } },
            { image: "/images/imported/tiger-eye-tasbih/tasbihglass-03.jpg", alt: { en: "Tiger Eye Tasbih detail", ar: "تفصيل" } }
    ],
    specs: [
      { label: { en: "Bead count", ar: "عدد الحبات" }, value: { en: "33 beads", ar: "33 حبة" } },
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger Eye", ar: "عين النمر" } },
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
