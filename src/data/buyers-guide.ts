export type BlogPost = {
  slug: string;
  title: Record<"en" | "ar", string>;
  description: Record<"en" | "ar", string>;
  publishedAt: string;
  readingTime: Record<"en" | "ar", string>;
  category: Record<"en" | "ar", string>;
  heroImage: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "how-to-identify-real-amber-tasbih",
    title: {
      en: "How to Identify Real Amber Tasbih vs Fake: A Practical Guide for Wholesale Buyers",
      ar: "كيفية التعرف على السبح الكهرماني الحقيقي مقابل المزيف: دليل عملي لمشتري الجملة",
    },
    description: {
      en: "Amber tasbih commands premium pricing — but fakes are everywhere. Learn the 5 tests wholesale buyers can do in 2 minutes to verify authenticity before placing bulk orders.",
      ar: "تحظى السباح الكهرمانية بسعر متميز — لكن المزيفات منتشرة في كل مكان. تعلم الاختبارات الخمسة التي يمكن لمشتري الجملة إجراؤها في دقيقتين للتحقق من الأصالة قبل طلبات بالجملة.",
    },
    publishedAt: "2026-03-30",
    readingTime: {
      en: "5 min read",
      ar: "5 دقائق للقراءة",
    },
    category: {
      en: "Buyer's Guide",
      ar: "دليل المشتري",
    },
    heroImage: "/images/blog/amber-identification-hero.jpg",
  },
  {
    slug: "kuka-wood-tasbih-authenticity-guide",
    title: {
      en: "Kuka Wood Tasbih: How to Verify Quality Before Bulk Purchase",
      ar: "سبحان خشب الكوكا: كيفية التحقق من الجودة قبل الشراء بالجملة",
    },
    description: {
      en: "Kuka wood tasbih is one of the most counterfeited prayer beads. This guide covers grain patterns, weight, scent, and surface finish — everything a professional buyer needs to check.",
      ar: "سبحان خشب الكوكا من أكثر السباح المقلدة. يغطي هذا الدليل أنماط الحبوب والوزن والرائحة وتشطيب السطح — كل ما يحتاج المشتري المحترف إلى التحقق منه.",
    },
    publishedAt: "2026-03-30",
    readingTime: {
      en: "6 min read",
      ar: "6 دقائق للقراءة",
    },
    category: {
      en: "Buyer's Guide",
      ar: "دليل المشتري",
    },
    heroImage: "/images/blog/kuka-wood-identification-hero.jpg",
  },
];
