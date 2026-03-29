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
      value: "100",
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
    heroImage: "/images/real-products/natural-kuka-wood/hero.jpeg",
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
    heroImage: "/images/real-products/baltic-amber/hero.jpeg",
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
    image: "/images/imported/natural-kuka-wood-tasbih/1774763467336-kuka_1.jpg",
    material: { en: "Natural kuka wood", ar: "Natural kuka wood" },
    tags: {
      en: ["Natural material", "Gift box", "Daily dhikr", "signature-tasbih"],
      ar: ["خامة طبيعية", "علبة هدية", "للذكر اليومي", "signature-tasbih"],
    },
    detailIntro: {
      en: "One of the cleanest commercial tasbih directions in the current assortment, with natural wood character and a steady 33-bead format.",
      ar: "واحدة من أكثر اتجاهات التسابيح التجارية توازنًا في التشكيلة الحالية، مع حضور الخشب الطبيعي وصيغة 33 حبة الواضحة.",
    },
    detailBody: {
      en: "Selected from your current goods list, this item translates well to B2B because it is easy to understand on shelf: natural material story, modest profile, and gifting-ready packaging without looking over-designed.",
      ar: "تم اختيار هذه القطعة من قائمة بضائعك الحالية لأنها مناسبة جدًا لعرض B2B: قصة خامة طبيعية واضحة، مظهر متوازن، وتغليف هدايا جاهز دون مبالغة بصرية.",
    },
    idealFor: { en: "Built for boutiques, Ramadan gifting, and museum-style retail.", ar: "مناسبة للبوتيكات وهدايا رمضان ومتاجر التجزئة ذات الطابع الثقافي." },
    heroAlt: { en: "Natural Kuka Wood Tasbih hero", ar: "الصورة الرئيسية لسبحة كوكا خشبية طبيعية" },
    gallery: [
      { image: "/images/imported/natural-kuka-wood-tasbih/1774763478141-250902-114.jpg", alt: { en: "Natural Kuka Wood Tasbih detail 1", ar: "سبحة كوكا خشبية طبيعية تفصيل 1" } },
      { image: "/images/imported/natural-kuka-wood-tasbih/1774763485727-size_1.jpg", alt: { en: "Natural Kuka Wood Tasbih detail 2", ar: "سبحة كوكا خشبية طبيعية تفصيل 2" } },
      { image: "/images/imported/natural-kuka-wood-tasbih/1774763510775-250902-101.jpg", alt: { en: "Natural Kuka Wood Tasbih detail 3", ar: "سبحة كوكا خشبية طبيعية تفصيل 3" } },
      { image: "/images/imported/natural-kuka-wood-tasbih/1774763525685-250902-40.jpg", alt: { en: "Natural Kuka Wood Tasbih detail 4", ar: "سبحة كوكا خشبية طبيعية تفصيل 4" } },
      { image: "/images/imported/natural-kuka-wood-tasbih/1774763538977-kuka.jpg", alt: { en: "Natural Kuka Wood Tasbih detail 5", ar: "سبحة كوكا خشبية طبيعية تفصيل 5" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Natural kuka wood", ar: "Natural kuka wood" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
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
    material: { en: "Natural hematite stone", ar: "Natural hematite stone" },
    tags: {
      en: ["Metallic accents", "Executive gifting", "Premium presence", "signature-tasbih"],
      ar: ["لمسات معدنية", "هدايا راقية", "حضور فاخر", "signature-tasbih"],
    },
    detailIntro: {
      en: "This one reads immediately as premium, which makes it strong for higher-ticket gifting edits and more formal retail shelves.",
      ar: "تظهر هذه القطعة بطابع فاخر مباشر، ما يجعلها قوية للهدايا الأعلى قيمة ولرفوف البيع الأكثر رسمية.",
    },
    detailBody: {
      en: "From your downloaded product list, this SKU has one of the clearest luxury signals: stone body, metallic rhythm, medallion focal point, and gift-box positioning that works well for Ramadan and Eid programs.",
      ar: "من قائمتك الحالية، يحمل هذا المنتج أوضح إشارات الفخامة: جسم حجري، إيقاع معدني، نقطة تركيز عبر المدالية، وتموضع مناسب لصناديق الهدايا في رمضان والعيد.",
    },
    idealFor: { en: "Ideal for executive gifting, premium Ramadan edits, and boutique display walls.", ar: "مناسب للهدايا التنفيذية وتحريرات رمضان الفاخرة وجدران العرض الراقية." },
    heroAlt: { en: "Golden Hematite Medallion Tasbih hero", ar: "الصورة الرئيسية لسبحة هيماتيت ذهبية بمدالية" },
    gallery: [
      { image: "/images/real-products/golden-hematite/detail-1.jpeg", alt: { en: "Golden Hematite Medallion Tasbih detail 1", ar: "سبحة هيماتيت ذهبية بمدالية تفصيل 1" } },
      { image: "/images/real-products/golden-hematite/detail-2.jpeg", alt: { en: "Golden Hematite Medallion Tasbih detail 2", ar: "سبحة هيماتيت ذهبية بمدالية تفصيل 2" } },
      { image: "/images/real-products/golden-hematite/detail-3.jpeg", alt: { en: "Golden Hematite Medallion Tasbih detail 3", ar: "سبحة هيماتيت ذهبية بمدالية تفصيل 3" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Natural hematite stone", ar: "Natural hematite stone" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
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
    material: { en: "Artisan resin", ar: "Artisan resin" },
    tags: {
      en: ["Younger retail", "Multicolor finish", "Accessible gifting", "signature-tasbih"],
      ar: ["تجزئة شبابية", "تشطيب متعدد الألوان", "هدية سهلة الاختيار", "signature-tasbih"],
    },
    detailIntro: {
      en: "This piece broadens the line beyond classic wood and stone, giving the assortment a younger and more playful entry point.",
      ar: "توسع هذه القطعة التشكيلة إلى ما بعد الخشب والحجر الكلاسيكيين، وتمنحها نقطة دخول أكثر شبابًا وخفة.",
    },
    detailBody: {
      en: "Selected from the current list because it adds visual range, this SKU is useful when you want the website to show that TranquilBeads can serve both classic Islamic gifting and more design-forward retail channels.",
      ar: "تم اختيارها من قائمتك الحالية لأنها توسع المدى البصري للتشكيلة، وتوضح أن TranquilBeads قادر على خدمة الهدايا الإسلامية الكلاسيكية وقنوات التجزئة الأكثر حداثة في الوقت نفسه.",
    },
    idealFor: { en: "Best for younger gifting audiences, concept stores, and mixed-material shelves.", ar: "أنسب للهدايا الموجهة لجمهور أصغر سنًا، ولمتاجر المفهوم، ورفوف العرض متعددة الخامات." },
    heroAlt: { en: "Lacquer Art 33-Bead Tasbih hero", ar: "الصورة الرئيسية لسبحة 33 حبة بتقنية لاكير فنية" },
    gallery: [
      { image: "/images/real-products/lacquer-art/detail-1.jpeg", alt: { en: "Lacquer Art 33-Bead Tasbih detail 1", ar: "سبحة 33 حبة بتقنية لاكير فنية تفصيل 1" } },
      { image: "/images/real-products/lacquer-art/detail-2.jpeg", alt: { en: "Lacquer Art 33-Bead Tasbih detail 2", ar: "سبحة 33 حبة بتقنية لاكير فنية تفصيل 2" } },
      { image: "/images/real-products/lacquer-art/detail-3.jpeg", alt: { en: "Lacquer Art 33-Bead Tasbih detail 3", ar: "سبحة 33 حبة بتقنية لاكير فنية تفصيل 3" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Artisan resin", ar: "Artisan resin" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
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
    material: { en: "Amber-look bead set with gift box", ar: "Amber-look bead set with gift box" },
    tags: {
      en: ["Seasonal gifting", "Presentation box", "Higher gift value", "gift-sets"],
      ar: ["هدايا موسمية", "صندوق عرض", "قيمة هدية أعلى", "gift-sets"],
    },
    detailIntro: {
      en: "This is the kind of item that helps the site feel more commercial for B2B buyers because the gifting use case is instantly clear.",
      ar: "هذا النوع من المنتجات يجعل الموقع أكثر إقناعًا لمشتري B2B لأن استخدامه كهدية واضح ومباشر منذ النظرة الأولى.",
    },
    detailBody: {
      en: "Pulled from your current goods list, the amber direction works well as a campaign product: strong color story, emotional gifting signal, and better perceived value than a plain single-item card.",
      ar: "تم سحب هذا الاتجاه من قائمتك الحالية، وهو يعمل جيدًا كمنتج حملات: لون قوي، إشارة هدية واضحة، وقيمة مدركة أعلى من عرض المنتج المفرد.",
    },
    idealFor: { en: "Great for Ramadan drops, Eid gifting, and premium souvenir counters.", ar: "ممتاز لإطلاقات رمضان، وهدايا العيد، ونقاط بيع التذكارات الراقية." },
    heroAlt: { en: "Baltic Amber Gift Set hero", ar: "الصورة الرئيسية لمجموعة هدية من الكهرمان البلطيقي" },
    gallery: [
      { image: "/images/real-products/baltic-amber/detail-1.jpeg", alt: { en: "Baltic Amber Gift Set detail 1", ar: "مجموعة هدية من الكهرمان البلطيقي تفصيل 1" } },
      { image: "/images/real-products/baltic-amber/detail-2.jpeg", alt: { en: "Baltic Amber Gift Set detail 2", ar: "مجموعة هدية من الكهرمان البلطيقي تفصيل 2" } },
      { image: "/images/real-products/baltic-amber/detail-3.jpeg", alt: { en: "Baltic Amber Gift Set detail 3", ar: "مجموعة هدية من الكهرمان البلطيقي تفصيل 3" } },
      { image: "/images/imported/baltic-amber-gift-set/1774773259235-0417-291.jpg", alt: { en: "Baltic Amber Gift Set detail 4", ar: "مجموعة هدية من الكهرمان البلطيقي تفصيل 4" } },
      { image: "/images/imported/baltic-amber-gift-set/1774764939986-factory-packaging.jpg", alt: { en: "Baltic Amber Gift Set detail 5", ar: "مجموعة هدية من الكهرمان البلطيقي تفصيل 5" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Amber-look bead set with gift box", ar: "Amber-look bead set with gift box" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "gift-sets", ar: "gift-sets" } },
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
    image: "/images/imported/terahertz-road-safety-pendant/1774767451596-0722-18.jpg",
    material: { en: "Terahertz stone look", ar: "Terahertz stone look" },
    tags: {
      en: ["Car charm", "Travel blessing", "Impulse gift", "cultural-accents"],
      ar: ["إكسسوار سيارة", "دعاء سفر", "هدية سريعة", "cultural-accents"],
    },
    detailIntro: {
      en: "This is a useful supporting product for the website because it shows your assortment can expand beyond hand-held tasbih into Islamic lifestyle accessories.",
      ar: "هذه قطعة داعمة مهمة للموقع لأنها تُظهر أن تشكيلتك تتجاوز التسابيح اليدوية إلى إكسسوارات أسلوب حياة إسلامي.",
    },
    detailBody: {
      en: "Chosen from the spreadsheet because it has a strong ecommerce hook, this pendant can work well for add-on counters, souvenir edits, and car-related gifting moments such as new drivers or travel blessings.",
      ar: "تم اختيارها من الجدول لأنها تحمل فكرة بيع واضحة، ويمكن أن تعمل جيدًا في نقاط الإضافة، وتشكيلات التذكارات، وهدايا السائقين الجدد أو دعوات السفر.",
    },
    idealFor: { en: "Best for souvenir counters, car accessory edits, and entry-price gifting.", ar: "أنسب لرفوف التذكارات، وتشكيلات إكسسوارات السيارة، والهدايا ضمن المدخل السعري." },
    heroAlt: { en: "Terahertz Road Safety Pendant hero", ar: "الصورة الرئيسية لمعلقة تيراهيرتز للسيارة والسلامة" },
    gallery: [
      { image: "/images/imported/terahertz-road-safety-pendant/1774767478701-main2.jpg", alt: { en: "Terahertz Road Safety Pendant detail 1", ar: "معلقة تيراهيرتز للسيارة والسلامة تفصيل 1" } },
      { image: "/images/imported/terahertz-road-safety-pendant/1774767523410-0722-19.jpg", alt: { en: "Terahertz Road Safety Pendant detail 2", ar: "معلقة تيراهيرتز للسيارة والسلامة تفصيل 2" } },
      { image: "/images/imported/terahertz-road-safety-pendant/1774767592915-0722-23.jpg", alt: { en: "Terahertz Road Safety Pendant detail 3", ar: "معلقة تيراهيرتز للسيارة والسلامة تفصيل 3" } },
      { image: "/images/imported/terahertz-road-safety-pendant/1774767560905-pendanteffect3.jpg", alt: { en: "Terahertz Road Safety Pendant detail 4", ar: "معلقة تيراهيرتز للسيارة والسلامة تفصيل 4" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Terahertz stone look", ar: "Terahertz stone look" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "cultural-accents", ar: "cultural-accents" } },
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
    material: { en: "Silver Sheen Obsidian (volcanic glass) with silver accents", ar: "Silver Sheen Obsidian (volcanic glass) with silver accents" },
    tags: {
      en: ["Obsidian", "Volcanic Glass", "Silver Accents", "33 Beads", "signature-tasbih"],
      ar: ["Obsidian", "زجاج بركاني", "لمسات فضية", "33 حبة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A sophisticated obsidian tasbih featuring volcanic glass beads with a natural metallic sheen, accented by silver spacers and crystal details.",
      ar: "سبحة Obsidian أنيقة تتميز بحبات من الزجاج البركاني مع بريق معدني طبيعي، ومزينة بفواصل فضية وتفاصيل كريستالية.",
    },
    detailBody: {
      en: "Silver Sheen Obsidian is prized for its deep black body and subtle silver reflections. This 33-bead format is ideal for daily dhikr and makes a strong statement on retail shelves. Suitable for distributors, boutique retailers, and premium gifting programs.",
      ar: "يُقدَّر Obsidian فضي اللمعان لونه الأسود العميق وانعكاساته الفضية الخفيفة. هذه الصيغة من 33 حبة مثالية للذكر اليومي وتُحدث أثرًا قويًا على رفوف التجزئة. مناسبة للموزعين ومتاجر البوتيك وبرامج الهدايا الفاخرة.",
    },
    idealFor: { en: "Boutiques, executive gifting, Ramadan and Eid programs, museum shops", ar: "البوتيكات، الهدايا التنفيذية، برامج رمضان والعيد، متاجر المتاحف" },
    heroAlt: { en: "Silver Sheen Obsidian Tasbih hero", ar: "الصورة الرئيسية لسبحة Obsidian فضية اللمعان" },
    gallery: [
      { image: "/images/imported/silver-sheen-obsidian/tasbih-12.jpg", alt: { en: "Silver Sheen Obsidian Tasbih detail 1", ar: "سبحة Obsidian فضية اللمعان تفصيل 1" } },
      { image: "/images/imported/silver-sheen-obsidian/tasbih-22.jpg", alt: { en: "Silver Sheen Obsidian Tasbih detail 2", ar: "سبحة Obsidian فضية اللمعان تفصيل 2" } },
      { image: "/images/imported/silver-sheen-obsidian/tasbih-23.jpg", alt: { en: "Silver Sheen Obsidian Tasbih detail 3", ar: "سبحة Obsidian فضية اللمعان تفصيل 3" } },
      { image: "/images/imported/silver-sheen-obsidian/tasbih-24.jpg", alt: { en: "Silver Sheen Obsidian Tasbih detail 4", ar: "سبحة Obsidian فضية اللمعان تفصيل 4" } },
      { image: "/images/imported/silver-sheen-obsidian/tasbih-40.jpg", alt: { en: "Silver Sheen Obsidian Tasbih detail 5", ar: "سبحة Obsidian فضية اللمعان تفصيل 5" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Silver Sheen Obsidian (volcanic glass) with silver accents", ar: "Silver Sheen Obsidian (volcanic glass) with silver accents" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
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
    material: { en: "Blue Tiger's Eye (Hawk's Eye) with gold-plated brass accents", ar: "Blue Tiger's Eye (Hawk's Eye) with gold-plated brass accents" },
    tags: {
      en: ["Tiger's Eye", "Blue", "Gold Accents", "33 Beads", "Chatoyant", "signature-tasbih"],
      ar: ["عين النمر", "أزرق", "لمسات ذهبية", "33 حبة", "متغير اللون", "signature-tasbih"],
    },
    detailIntro: {
      en: "Blue Tiger's Eye is a member of the quartz family known for its distinctive chatoyant effect — a silky blue band that shimmers as light hits the stone at different angles.",
      ar: "عين النمر الزرقاء هي عضو في عائلة الكوارتز معروفة بتأثيرها المتغير المميز — شريط حريري أزرق يتلألأ مع تغير زاوية الضوء على الحجر.",
    },
    detailBody: {
      en: "This tasbih features perfectly round, highly polished Blue Tiger's Eye beads with two decorative gold-plated spacers. The deep navy base with royal blue flashes creates a sophisticated dark palette perfect for modern retail displays. Ideal for boutiques, gift programs, and collectors seeking unusual gemstone tasbih.",
      ar: "تتميز هذه المسبحة بحبات عين النمر الزرقاء المستديرة عالية التلميع مع فاصلين مزخرفين من النحاس المطلي بالذهب. القاعدة البحرية الداكنة مع ومضات باللون الأزرق الملكي تخلق لوحة ألوان متطورة مثالية لرفوف التجزئة الحديثة. مناسبة للبوتيكات وبرامج الهدايا والهواة الذين يبحثون عن تسابيح الأحجار الكريمة غير العادية.",
    },
    idealFor: { en: "Boutiques, gemstone collectors, premium gifting, cultural retail", ar: "البوتيكات، هواة الأحجار الكريمة، الهدايا الفاخرة، متاجر الثقافة" },
    heroAlt: { en: "Blue Tiger's Eye Tasbih hero", ar: "الصورة الرئيسية لسبحة عين النمر الزرقاء" },
    gallery: [
      { image: "/images/imported/blue-tigers-eye/tasbih-05.jpg", alt: { en: "Blue Tiger's Eye Tasbih detail 1", ar: "سبحة عين النمر الزرقاء تفصيل 1" } },
      { image: "/images/imported/blue-tigers-eye/tasbih-10.jpg", alt: { en: "Blue Tiger's Eye Tasbih detail 2", ar: "سبحة عين النمر الزرقاء تفصيل 2" } },
      { image: "/images/imported/blue-tigers-eye/tasbih-11.jpg", alt: { en: "Blue Tiger's Eye Tasbih detail 3", ar: "سبحة عين النمر الزرقاء تفصيل 3" } },
      { image: "/images/imported/blue-tigers-eye/tasbih-25.jpg", alt: { en: "Blue Tiger's Eye Tasbih detail 4", ar: "سبحة عين النمر الزرقاء تفصيل 4" } },
      { image: "/images/imported/blue-tigers-eye/tasbih-26.jpg", alt: { en: "Blue Tiger's Eye Tasbih detail 5", ar: "سبحة عين النمر الزرقاء تفصيل 5" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Blue Tiger's Eye (Hawk's Eye) with gold-plated brass accents", ar: "Blue Tiger's Eye (Hawk's Eye) with gold-plated brass accents" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "pearl-tasbih",
    collection: "signature-tasbih",
    title: { en: "Pearl Tasbih", ar: "سبحة لؤلؤية" },
    summary: {
      en: "Pearl Tasbih — premium quality for wholesale.",
      ar: "سبحة لؤلؤية — جودة عالية للجملة.",
    },
    image: "/images/imported/pearl-tasbih/size.jpg",
    material: { en: "Pearl", ar: "Pearl" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium pearl tasbih for modern retail.",
      ar: "تسبيحة لؤلؤية فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This pearl tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Pearl Tasbih hero", ar: "الصورة الرئيسية لسبحة لؤلؤية" },
    gallery: [
      { image: "/images/imported/pearl-tasbih/size.jpg", alt: { en: "Pearl Tasbih detail 1", ar: "سبحة لؤلؤية تفصيل 1" } },
      { image: "/images/imported/pearl-tasbih/tasbih-45.jpg", alt: { en: "Pearl Tasbih detail 2", ar: "سبحة لؤلؤية تفصيل 2" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Pearl", ar: "Pearl" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "obsidian-tasbih",
    collection: "signature-tasbih",
    title: { en: "Obsidian Tasbih", ar: "سبحة سبج" },
    summary: {
      en: "Obsidian Tasbih — premium quality for wholesale.",
      ar: "سبحة سبج — جودة عالية للجملة.",
    },
    image: "/images/imported/obsidian-tasbih/size.jpg",
    material: { en: "Obsidian", ar: "Obsidian" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium obsidian tasbih for modern retail.",
      ar: "تسبيحة سبج فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This obsidian tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Obsidian Tasbih hero", ar: "الصورة الرئيسية لسبحة سبج" },
    gallery: [
      { image: "/images/imported/obsidian-tasbih/size.jpg", alt: { en: "Obsidian Tasbih detail 1", ar: "سبحة سبج تفصيل 1" } },
      { image: "/images/imported/obsidian-tasbih/tasbih-03.jpg", alt: { en: "Obsidian Tasbih detail 2", ar: "سبحة سبج تفصيل 2" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Obsidian", ar: "Obsidian" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "resin-tasbih",
    collection: "signature-tasbih",
    title: { en: "Resin Tasbih", ar: "سبحة راتنج" },
    summary: {
      en: "Resin Tasbih — premium quality for wholesale.",
      ar: "سبحة راتنج — جودة عالية للجملة.",
    },
    image: "/images/imported/resin-tasbih/resin-01.jpg",
    material: { en: "Resin", ar: "Resin" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium resin tasbih for modern retail.",
      ar: "تسبيحة راتنج فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This resin tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Resin Tasbih hero", ar: "الصورة الرئيسية لسبحة راتنج" },
    gallery: [
      { image: "/images/imported/resin-tasbih/resin-01.jpg", alt: { en: "Resin Tasbih detail 1", ar: "سبحة راتنج تفصيل 1" } },
      { image: "/images/imported/resin-tasbih/resin-02.jpg", alt: { en: "Resin Tasbih detail 2", ar: "سبحة راتنج تفصيل 2" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Resin", ar: "Resin" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "crystal-tasbih",
    collection: "signature-tasbih",
    title: { en: "Crystal Tasbih", ar: "سبحة كريستال" },
    summary: {
      en: "Crystal Tasbih — premium quality for wholesale.",
      ar: "سبحة كريستال — جودة عالية للجملة.",
    },
    image: "/images/imported/crystal-tasbih/size.jpg",
    material: { en: "Crystal", ar: "Crystal" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium crystal tasbih for modern retail.",
      ar: "تسبيحة كريستال فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This crystal tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Crystal Tasbih hero", ar: "الصورة الرئيسية لسبحة كريستال" },
    gallery: [
      { image: "/images/imported/crystal-tasbih/size.jpg", alt: { en: "Crystal Tasbih detail 1", ar: "سبحة كريستال تفصيل 1" } },
      { image: "/images/imported/crystal-tasbih/tasbih-16.jpg", alt: { en: "Crystal Tasbih detail 2", ar: "سبحة كريستال تفصيل 2" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Crystal", ar: "Crystal" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "kechainrose",
    collection: "signature-tasbih",
    title: { en: "Kechain Rose Tasbih", ar: "سبحة روز كيتشين" },
    summary: {
      en: "Kechain Rose Tasbih — premium quality for wholesale.",
      ar: "سبحة روز كيتشين — جودة عالية للجملة.",
    },
    image: "/images/imported/kechainrose/phone.jpg",
    material: { en: "Rose Crystal", ar: "Rose Crystal" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium rose crystal tasbih for modern retail.",
      ar: "تسبيحة كريستال روز فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This rose crystal tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Kechain Rose Tasbih hero", ar: "الصورة الرئيسية لسبحة روز كيتشين" },
    gallery: [
      { image: "/images/imported/kechainrose/phone.jpg", alt: { en: "Kechain Rose Tasbih detail 1", ar: "سبحة روز كيتشين تفصيل 1" } },
      { image: "/images/imported/kechainrose/rose-01.jpg", alt: { en: "Kechain Rose Tasbih detail 2", ar: "سبحة روز كيتشين تفصيل 2" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Rose Crystal", ar: "Rose Crystal" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "pocket",
    collection: "signature-tasbih",
    title: { en: "Pocket Tiger Eye Tasbih", ar: "سبحة عين النمر للجيب" },
    summary: {
      en: "Pocket Tiger Eye Tasbih — premium quality for wholesale.",
      ar: "سبحة عين النمر للجيب — جودة عالية للجملة.",
    },
    image: "/images/imported/pocket/size.jpg",
    material: { en: "Mixed Material", ar: "Mixed Material" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium mixed material tasbih for modern retail.",
      ar: "تسبيحة خامات مختلطة فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This mixed material tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Pocket Tiger Eye Tasbih hero", ar: "الصورة الرئيسية لسبحة عين النمر للجيب" },
    gallery: [
      { image: "/images/imported/pocket/size.jpg", alt: { en: "Pocket Tiger Eye Tasbih detail 1", ar: "سبحة عين النمر للجيب تفصيل 1" } },
      { image: "/images/imported/pocket/tasbih-060.jpg", alt: { en: "Pocket Tiger Eye Tasbih detail 2", ar: "سبحة عين النمر للجيب تفصيل 2" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Mixed Material", ar: "Mixed Material" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "99-pla",
    collection: "signature-tasbih",
    title: { en: "99-Bead Plastic Tasbih", ar: "سبحة 99 حبة بلاستيك" },
    summary: {
      en: "99-Bead Plastic Tasbih — premium quality for wholesale.",
      ar: "سبحة 99 حبة بلاستيك — جودة عالية للجملة.",
    },
    image: "/images/imported/99-pla/size.jpg",
    material: { en: "Mixed Material", ar: "Mixed Material" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium plastic tasbih for modern retail.",
      ar: "تسبيحة بلاستيكية فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This plastic tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "99-Bead Plastic Tasbih hero", ar: "الصورة الرئيسية لسبحة 99 حبة بلاستيك" },
    gallery: [
      { image: "/images/imported/99-pla/size.jpg", alt: { en: "99-Bead Plastic Tasbih detail 1", ar: "سبحة 99 حبة بلاستيك تفصيل 1" } },
      { image: "/images/imported/99-pla/tasbih-053.jpg", alt: { en: "99-Bead Plastic Tasbih detail 2", ar: "سبحة 99 حبة بلاستيك تفصيل 2" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Mixed Material", ar: "Mixed Material" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "zebra",
    collection: "signature-tasbih",
    title: { en: "Zebra Agate Tasbih", ar: "سبحة عين النمر المخططة" },
    summary: {
      en: "Zebra Agate Tasbih — premium quality for wholesale.",
      ar: "سبحة عين النمر المخططة — جودة عالية للجملة.",
    },
    image: "/images/imported/zebra/main.jpg",
    material: { en: "Agate", ar: "Agate" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium zebra agate tasbih for modern retail.",
      ar: "تسبيحة عقيق مخطط فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This zebra agate tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Zebra Agate Tasbih hero", ar: "الصورة الرئيسية لسبحة عين النمر المخططة" },
    gallery: [
      { image: "/images/imported/zebra/main.jpg", alt: { en: "Zebra Agate Tasbih detail 1", ar: "سبحة عين النمر المخططة تفصيل 1" } },
      { image: "/images/imported/zebra/size.jpg", alt: { en: "Zebra Agate Tasbih detail 2", ar: "سبحة عين النمر المخططة تفصيل 2" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "Agate" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "watergrass",
    collection: "signature-tasbih",
    title: { en: "Water Grass Agate Tasbih", ar: "سبحة عقيق العشب المائي" },
    summary: {
      en: "Water Grass Agate Tasbih — premium quality for wholesale.",
      ar: "سبحة عقيق العشب المائي — جودة عالية للجملة.",
    },
    image: "/images/imported/watergrass/main.jpg",
    material: { en: "Agate", ar: "Agate" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium water grass agate tasbih for modern retail.",
      ar: "تسبيحة عقيق العشب المائي فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This water grass agate tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Water Grass Agate Tasbih hero", ar: "الصورة الرئيسية لسبحة عقيق العشب المائي" },
    gallery: [
      { image: "/images/imported/watergrass/main.jpg", alt: { en: "Water Grass Agate Tasbih detail 1", ar: "سبحة عقيق العشب المائي تفصيل 1" } },
      { image: "/images/imported/watergrass/size.jpg", alt: { en: "Water Grass Agate Tasbih detail 2", ar: "سبحة عقيق العشب المائي تفصيل 2" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "Agate" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "orangeagate",
    collection: "signature-tasbih",
    title: { en: "Orange Agate Tasbih", ar: "سبحة عقيق برتقالي" },
    summary: {
      en: "Orange Agate Tasbih — premium quality for wholesale.",
      ar: "سبحة عقيق برتقالي — جودة عالية للجملة.",
    },
    image: "/images/imported/orangeagate/main.jpg",
    material: { en: "Agate", ar: "Agate" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium orange agate tasbih for modern retail.",
      ar: "تسبيحة عقيق برتقالي فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This orange agate tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Orange Agate Tasbih hero", ar: "الصورة الرئيسية لسبحة عقيق برتقالي" },
    gallery: [
      { image: "/images/imported/orangeagate/main.jpg", alt: { en: "Orange Agate Tasbih detail 1", ar: "سبحة عقيق برتقالي تفصيل 1" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "Agate" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "bluetiger",
    collection: "signature-tasbih",
    title: { en: "Blue Tiger Tasbih", ar: "سبحة عين النمر الزرقاء" },
    summary: {
      en: "Blue Tiger Tasbih — premium quality for wholesale.",
      ar: "سبحة عين النمر الزرقاء — جودة عالية للجملة.",
    },
    image: "/images/imported/bluetiger/main.jpg",
    material: { en: "Tiger's Eye", ar: "Tiger's Eye" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium blue tiger tasbih for modern retail.",
      ar: "تسبيحة عين النمر الزرقاء فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This blue tiger tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Blue Tiger Tasbih hero", ar: "الصورة الرئيسية لسبحة عين النمر الزرقاء" },
    gallery: [
      { image: "/images/imported/bluetiger/main.jpg", alt: { en: "Blue Tiger Tasbih detail 1", ar: "سبحة عين النمر الزرقاء تفصيل 1" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Tiger's Eye", ar: "Tiger's Eye" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "blackagate",
    collection: "signature-tasbih",
    title: { en: "Black Agate Tasbih", ar: "سبحة عقيق أسود" },
    summary: {
      en: "Black Agate Tasbih — premium quality for wholesale.",
      ar: "سبحة عقيق أسود — جودة عالية للجملة.",
    },
    image: "/images/imported/blackagate/main.jpg",
    material: { en: "Agate", ar: "Agate" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium black agate tasbih for modern retail.",
      ar: "تسبيحة عقيق أسود فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This black agate tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Black Agate Tasbih hero", ar: "الصورة الرئيسية لسبحة عقيق أسود" },
    gallery: [
      { image: "/images/imported/blackagate/main.jpg", alt: { en: "Black Agate Tasbih detail 1", ar: "سبحة عقيق أسود تفصيل 1" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "Agate" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "oud2",
    collection: "signature-tasbih",
    title: { en: "Oud Tasbih", ar: "سبحة عود" },
    summary: {
      en: "Oud Tasbih — premium quality for wholesale.",
      ar: "سبحة عود — جودة عالية للجملة.",
    },
    image: "/images/imported/oud2/1774769941536-car-157.jpg",
    material: { en: "Oud", ar: "Oud" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium oud tasbih for modern retail.",
      ar: "تسبيحة عود فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This oud tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Oud Tasbih hero", ar: "الصورة الرئيسية لسبحة عود" },
    gallery: [
      { image: "/images/imported/oud2/1774769948804-car-262.jpg", alt: { en: "Oud Tasbih detail 1", ar: "سبحة عود تفصيل 1" } },
      { image: "/images/imported/oud2/1774769955292-car-198.jpg", alt: { en: "Oud Tasbih detail 2", ar: "سبحة عود تفصيل 2" } },
      { image: "/images/imported/oud2/1774769960917-car-125.jpg", alt: { en: "Oud Tasbih detail 3", ar: "سبحة عود تفصيل 3" } },
      { image: "/images/imported/oud2/1774769971442-car-276.jpg", alt: { en: "Oud Tasbih detail 4", ar: "سبحة عود تفصيل 4" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Oud", ar: "Oud" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "shoushan",
    collection: "signature-tasbih",
    title: { en: "Shoushan Stone Tasbih", ar: "سبحة حجر شوهان" },
    summary: {
      en: "Shoushan Stone Tasbih — premium quality for wholesale.",
      ar: "سبحة حجر شوهان — جودة عالية للجملة.",
    },
    image: "/images/imported/shoushan/1774771521929-_dsc4065.jpg",
    material: { en: "Stone", ar: "Stone" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium shoushan stone tasbih for modern retail.",
      ar: "تسبيحة حجر شوهان فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This shoushan stone tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Shoushan Stone Tasbih hero", ar: "الصورة الرئيسية لسبحة حجر شوهان" },
    gallery: [
      { image: "/images/imported/shoushan/1774771529131-_dsc4063.jpg", alt: { en: "Shoushan Stone Tasbih detail 1", ar: "سبحة حجر شوهان تفصيل 1" } },
      { image: "/images/imported/shoushan/1774771544468-_dsc4068.jpg", alt: { en: "Shoushan Stone Tasbih detail 2", ar: "سبحة حجر شوهان تفصيل 2" } },
      { image: "/images/imported/shoushan/1774771551582-_dsc4067.jpg", alt: { en: "Shoushan Stone Tasbih detail 3", ar: "سبحة حجر شوهان تفصيل 3" } },
      { image: "/images/imported/shoushan/1774771564395-_dsc4069.jpg", alt: { en: "Shoushan Stone Tasbih detail 4", ar: "سبحة حجر شوهان تفصيل 4" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Stone", ar: "Stone" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "redwhiteglass",
    collection: "signature-tasbih",
    title: { en: "Red White Glass Tasbih", ar: "سبحة زجاج أحمر أبيض" },
    summary: {
      en: "Red White Glass Tasbih — premium quality for wholesale.",
      ar: "سبحة زجاج أحمر أبيض — جودة عالية للجملة.",
    },
    image: "/images/imported/redwhiteglass/1774777247449-amber-106.jpg",
    material: { en: "Glass", ar: "Glass" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium red white glass tasbih for modern retail.",
      ar: "تسبيحة زجاج أحمر أبيض فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This red white glass tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Red White Glass Tasbih hero", ar: "الصورة الرئيسية لسبحة زجاج أحمر أبيض" },
    gallery: [
      { image: "/images/imported/redwhiteglass/1774777270703-amber-097.jpg", alt: { en: "Red White Glass Tasbih detail 1", ar: "سبحة زجاج أحمر أبيض تفصيل 1" } },
      { image: "/images/imported/redwhiteglass/1774777294243-amber-100.jpg", alt: { en: "Red White Glass Tasbih detail 2", ar: "سبحة زجاج أحمر أبيض تفصيل 2" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Glass", ar: "Glass" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "ambercube33",
    collection: "signature-tasbih",
    title: { en: "Amber Cube 33-Bead Tasbih", ar: "سبحة مكعب كهرماني 33 حبة" },
    summary: {
      en: "Amber Cube 33-Bead Tasbih — premium quality for wholesale.",
      ar: "سبحة مكعب كهرماني 33 حبة — جودة عالية للجملة.",
    },
    image: "/images/imported/ambercube33/1774778835476-main.jpg",
    material: { en: "Amber-look", ar: "Amber-look" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium amber cube tasbih for modern retail.",
      ar: "تسبيحة مكعب كهرماني فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This amber cube tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Amber Cube 33-Bead Tasbih hero", ar: "الصورة الرئيسية لسبحة مكعب كهرماني 33 حبة" },
    gallery: [
      { image: "/images/imported/ambercube33/1774778835527-amber-53.jpg", alt: { en: "Amber Cube 33-Bead Tasbih detail 1", ar: "سبحة مكعب كهرماني 33 حبة تفصيل 1" } },
      { image: "/images/imported/ambercube33/1774778835611-amber-63.jpg", alt: { en: "Amber Cube 33-Bead Tasbih detail 2", ar: "سبحة مكعب كهرماني 33 حبة تفصيل 2" } },
      { image: "/images/imported/ambercube33/1774778835641-amber-84.jpg", alt: { en: "Amber Cube 33-Bead Tasbih detail 3", ar: "سبحة مكعب كهرماني 33 حبة تفصيل 3" } },
      { image: "/images/imported/ambercube33/1774778835671-gen.jpg", alt: { en: "Amber Cube 33-Bead Tasbih detail 4", ar: "سبحة مكعب كهرماني 33 حبة تفصيل 4" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Amber-look", ar: "Amber-look" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "colorchangecube",
    collection: "signature-tasbih",
    title: { en: "Color Change Cube Tasbih", ar: "سبحة مكعب متغير اللون" },
    summary: {
      en: "Color Change Cube Tasbih — premium quality for wholesale.",
      ar: "سبحة مكعب متغير اللون — جودة عالية للجملة.",
    },
    image: "/images/imported/colorchangecube/main.jpg",
    material: { en: "Glass", ar: "Glass" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium color change cube tasbih for modern retail.",
      ar: "تسبيحة مكعب متغير اللون فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This color change cube tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Color Change Cube Tasbih hero", ar: "الصورة الرئيسية لسبحة مكعب متغير اللون" },
    gallery: [
      { image: "/images/imported/colorchangecube/main.jpg", alt: { en: "Color Change Cube Tasbih detail 1", ar: "سبحة مكعب متغير اللون تفصيل 1" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Glass", ar: "Glass" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "whiteagate33-s",
    collection: "signature-tasbih",
    title: { en: "White Agate 33-Bead Tasbih", ar: "سبحة عقيق أبيض 33 حبة" },
    summary: {
      en: "White Agate 33-Bead Tasbih — premium quality for wholesale.",
      ar: "سبحة عقيق أبيض 33 حبة — جودة عالية للجملة.",
    },
    image: "/images/imported/whiteagate33-s/main.jpg",
    material: { en: "Agate", ar: "Agate" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium white agate tasbih for modern retail.",
      ar: "تسبيحة عقيق أبيض فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This white agate tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "White Agate 33-Bead Tasbih hero", ar: "الصورة الرئيسية لسبحة عقيق أبيض 33 حبة" },
    gallery: [
      { image: "/images/imported/whiteagate33-s/main.jpg", alt: { en: "White Agate 33-Bead Tasbih detail 1", ar: "سبحة عقيق أبيض 33 حبة تفصيل 1" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "Agate" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "greenagate99",
    collection: "signature-tasbih",
    title: { en: "Green Agate 99-Bead Tasbih", ar: "سبحة عقيق أخضر 99 حبة" },
    summary: {
      en: "Green Agate 99-Bead Tasbih — premium quality for wholesale.",
      ar: "سبحة عقيق أخضر 99 حبة — جودة عالية للجملة.",
    },
    image: "/images/imported/greenagate99/main.jpg",
    material: { en: "Agate", ar: "Agate" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium green agate tasbih for modern retail.",
      ar: "تسبيحة عقيق أخضر فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This green agate tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Green Agate 99-Bead Tasbih hero", ar: "الصورة الرئيسية لسبحة عقيق أخضر 99 حبة" },
    gallery: [
      { image: "/images/imported/greenagate99/main.jpg", alt: { en: "Green Agate 99-Bead Tasbih detail 1", ar: "سبحة عقيق أخضر 99 حبة تفصيل 1" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Agate", ar: "Agate" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "glass-smoke",
    collection: "signature-tasbih",
    title: { en: "Smoke Glass Tasbih", ar: "سبحة زجاج مدخن" },
    summary: {
      en: "Smoke Glass Tasbih — premium quality for wholesale.",
      ar: "سبحة زجاج مدخن — جودة عالية للجملة.",
    },
    image: "/images/imported/glass-smoke/main.jpg",
    material: { en: "Glass", ar: "Glass" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium smoke glass tasbih for modern retail.",
      ar: "تسبيحة زجاج مدخن فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This smoke glass tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Smoke Glass Tasbih hero", ar: "الصورة الرئيسية لسبحة زجاج مدخن" },
    gallery: [
      { image: "/images/imported/glass-smoke/main.jpg", alt: { en: "Smoke Glass Tasbih detail 1", ar: "سبحة زجاج مدخن تفصيل 1" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Glass", ar: "Glass" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "glass-champon",
    collection: "signature-tasbih",
    title: { en: "Champon Glass Tasbih", ar: "سبحة زجاج شامبون" },
    summary: {
      en: "Champon Glass Tasbih — premium quality for wholesale.",
      ar: "سبحة زجاج شامبون — جودة عالية للجملة.",
    },
    image: "/images/imported/glass-champon/main.jpg",
    material: { en: "Glass", ar: "Glass" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium champon glass tasbih for modern retail.",
      ar: "تسبيحة زجاج شامبون فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This champon glass tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Champon Glass Tasbih hero", ar: "الصورة الرئيسية لسبحة زجاج شامبون" },
    gallery: [
      { image: "/images/imported/glass-champon/main.jpg", alt: { en: "Champon Glass Tasbih detail 1", ar: "سبحة زجاج شامبون تفصيل 1" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Glass", ar: "Glass" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "lumnousglass99",
    collection: "signature-tasbih",
    title: { en: "Luminous Glass 99-Bead Tasbih", ar: "سبحة زجاج متوهج 99 حبة" },
    summary: {
      en: "Luminous Glass 99-Bead Tasbih — premium quality for wholesale.",
      ar: "سبحة زجاج متوهج 99 حبة — جودة عالية للجملة.",
    },
    image: "/images/imported/lumnousglass99/1774776988642-0417-291.jpg",
    material: { en: "Glass", ar: "Glass" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium luminous glass tasbih for modern retail.",
      ar: "تسبيحة زجاج متوهج فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This luminous glass tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Luminous Glass 99-Bead Tasbih hero", ar: "الصورة الرئيسية لسبحة زجاج متوهج 99 حبة" },
    gallery: [
      { image: "/images/imported/lumnousglass99/main.jpg", alt: { en: "Luminous Glass 99-Bead Tasbih detail 1", ar: "سبحة زجاج متوهج 99 حبة تفصيل 1" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Glass", ar: "Glass" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "99blackrosewood",
    collection: "signature-tasbih",
    title: { en: "99-Bead Black Rosewood Tasbih", ar: "سبحة خشب الورد الأسود 99 حبة" },
    summary: {
      en: "99-Bead Black Rosewood Tasbih — premium quality for wholesale.",
      ar: "سبحة خشب الورد الأسود 99 حبة — جودة عالية للجملة.",
    },
    image: "/images/imported/99blackrosewood/main.jpg",
    material: { en: "Wood", ar: "Wood" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium black rosewood tasbih for modern retail.",
      ar: "تسبيحة خشب الورد الأسود فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This black rosewood tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "99-Bead Black Rosewood Tasbih hero", ar: "الصورة الرئيسية لسبحة خشب الورد الأسود 99 حبة" },
    gallery: [
      { image: "/images/imported/99blackrosewood/main.jpg", alt: { en: "99-Bead Black Rosewood Tasbih detail 1", ar: "سبحة خشب الورد الأسود 99 حبة تفصيل 1" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Wood", ar: "Wood" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
    ],
  },
  {
    slug: "33shellbar",
    collection: "signature-tasbih",
    title: { en: "Shell Bar 33-Bead Tasbih", ar: "بار شل 33-خرزة تسبيح" },
    summary: {
      en: "Shell Bar 33-Bead Tasbih — premium quality for wholesale.",
      ar: "سبحة بار شل 33-خرزة — جودة عالية للجملة.",
    },
    image: "/images/imported/33shellbar/ambertest-8.jpg",
    material: { en: "Shell", ar: "Shell" },
    tags: {
      en: ["Wholesale", "signature-tasbih"],
      ar: ["جملة", "signature-tasbih"],
    },
    detailIntro: {
      en: "A premium shell bar tasbih for modern retail.",
      ar: "تسبيحة بار صدفي فاخرة للتجزئة العصرية.",
    },
    detailBody: {
      en: "This shell bar tasbih offers exceptional quality and craftsmanship, ideal for boutiques and cultural retailers.",
      ar: "توفر هذه التسبيحة جودة وحرفية استثنائية، مثالية للبوتيكات وتجار التجزئة الثقافيين.",
    },
    idealFor: { en: "Boutiques, museum shops, and premium gifting.", ar: "البوتيكات ومتاجر المتاحف والهدايا الفاخرة." },
    heroAlt: { en: "Shell Bar 33-Bead Tasbih hero", ar: "الصورة الرئيسية لبار شل 33-خرزة تسبيح" },
    gallery: [
      { image: "/images/imported/33shellbar/ambertest-8.jpg", alt: { en: "Shell Bar 33-Bead Tasbih detail 1", ar: "بار شل 33-خرزة تسبيح تفصيل 1" } },
      { image: "/images/imported/33shellbar/main.jpg", alt: { en: "Shell Bar 33-Bead Tasbih detail 2", ar: "بار شل 33-خرزة تسبيح تفصيل 2" } },
    ],
    specs: [
      { label: { en: "Material", ar: "الخامة" }, value: { en: "Shell", ar: "Shell" } },
      { label: { en: "Collection", ar: "المجموعة" }, value: { en: "signature-tasbih", ar: "signature-tasbih" } },
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
              "MOQ starts from 100 pieces across tasbih-focused assortments.",
              "Private label sleeves, insert cards, and bilingual packaging available.",
              "Average lead time from approval to dispatch is 21 days.",
            ]
          : [
              "موك يبدأ من 100 قطعة ضمن تشكيلات تركز على التسابيح.",
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
