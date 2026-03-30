import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/src/lib/i18n";

export function generateStaticParams() {
  return [
    { locale: "en", slug: "how-to-identify-real-amber-tasbih" },
    { locale: "ar", slug: "how-to-identify-real-amber-tasbih" },
    { locale: "en", slug: "kuka-wood-tasbih-authenticity-guide" },
    { locale: "ar", slug: "kuka-wood-tasbih-authenticity-guide" },
  ];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const titles: Record<string, Record<string, string>> = {
    "how-to-identify-real-amber-tasbih": {
      en: "How to Identify Real Amber Tasbih vs Fake | TranquilBeads",
      ar: "كيفية التعرف على السبح الكهرماني الحقيقي | ترانكويل بيدز",
    },
    "kuka-wood-tasbih-authenticity-guide": {
      en: "Kuka Wood Tasbih Quality Guide | TranquilBeads",
      ar: "دليل جودة سبحان خشب الكوكا | ترانكويل بيدز",
    },
  };

  const descriptions: Record<string, Record<string, string>> = {
    "how-to-identify-real-amber-tasbih": {
      en: "5 tests wholesale buyers can do in 2 minutes to verify amber authenticity before placing bulk orders.",
      ar: "5 اختبارات يمكن لمشتري الجملة إجراؤها في دقيقتين للتحقق من أصالة الكهرمان.",
    },
    "kuka-wood-tasbih-authenticity-guide": {
      en: "Three key checks for kuka wood quality: grain pattern, weight, and scent. Essential reading before bulk orders.",
      ar: "ثلاثة فحوصات رئيسية لجودة خشب الكوكا: نمط الحبوب والوزن والرائحة. قراءة أساسية قبل الطلبات بالجملة.",
    },
  };

  return {
    title: titles[slug]?.[locale],
    description: descriptions[slug]?.[locale],
    alternates: {
      canonical: `https://www.tranquilbeads.com/${locale}/blog/${slug}`,
    },
    openGraph: {
      title: titles[slug]?.[locale],
      description: descriptions[slug]?.[locale],
      siteName: "TranquilBeads",
    },
    twitter: {
      card: "summary_large_image",
      title: titles[slug]?.[locale],
      description: descriptions[slug]?.[locale],
    },
  };
}

const amberGuideEN = (
  <article className="space-y-8">
    <div className="rounded-2xl border border-amber-700/20 bg-amber-50/50 p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-700">Key takeaway</p>
      <p className="mt-2 text-sm text-amber-900"><strong>5 tests in 2 minutes.</strong> Any buyer can do these without special tools.</p>
    </div>
    <div><h2>Why Amber Authenticity Matters for Wholesale</h2><p>Baltic amber tasbih commands 3–5× the price of resin imitations. At MOQ 100 pieces, a single batch of fake amber means losing $500–2,000 on inventory you cannot sell. Real amber is fossilized tree resin — not stone, not glass.</p></div>
    <div><h2>Test 1: Saltwater Float</h2><p>Mix 3 tablespoons of salt into a glass of water. Stir until fully dissolved. Drop the tasbih bead in. <strong>Real amber floats</strong> (density 1.0–1.1 g/cm³). <strong>Fake (resin, glass) sinks</strong> (density 1.2–1.4 g/cm³). This test takes 30 seconds.</p></div>
    <div><h2>Test 2: The Hot Needle</h2><p>Hold a needle tip over a lighter flame for 10 seconds, then touch it briefly to an inconspicuous spot on one bead. <strong>Real amber:</strong> faint piney resin smell. <strong>Resin fake:</strong> smells like burnt plastic, leaves a sticky mark.</p></div>
    <div><h2>Test 3: UV Light Check (365nm)</h2><p>Use a standard UV torchlight (365nm). In a dark room, shine it on the beads. <strong>Real Baltic amber:</strong> bright blue-white to green fluorescence. <strong>Resin imitation:</strong> little to no reaction, dull grey-brown.</p></div>
    <div><h2>Test 4: Visual Inclusion Inspection</h2><p>Hold the bead up to strong light. Use a 10× loupe or a phone camera at maximum zoom. <strong>Real amber inclusions:</strong> trapped insects, plant fragments, air bubbles with irregular shapes. If every bead looks perfectly flawless, be suspicious.</p></div>
    <div><h2>Test 5: Static Charge</h2><p>Rub the amber bead vigorously with wool or cotton for 30 seconds. Then hold it near small pieces of paper. <strong>Real amber:</strong> develops static charge and attracts small paper fragments. <strong>Glass or stone:</strong> does not.</p></div>
    <div><h2>Red Flags to Watch For</h2><ul><li>Price too low — if it's 40% below market, it's probably fake</li><li>Supplier cannot provide origin documentation or processing certificates</li><li>Amber beads are uniformly identical — natural amber varies</li><li>Supplier resists small sample orders before bulk</li></ul></div>
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6"><p className="text-sm font-semibold text-accent-deep">Ready to source authentic amber tasbih?</p><p className="mt-1 text-sm text-muted">Contact us via WhatsApp for current pricing, sample availability, and certificate options.</p></div>
  </article>
);

const amberGuideAR = (
  <article className="space-y-8">
    <div className="rounded-2xl border border-amber-700/20 bg-amber-50/50 p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-700">النتيجة الأساسية</p>
      <p className="mt-2 text-sm text-amber-900"><strong>5 اختبارات في دقيقتين.</strong> يمكن لأي مشترٍ إجراؤها دون أدوات خاصة.</p>
    </div>
    <div><h2>لماذا يهم التحقق من أصالة الكهرمان للجملة</h2><p>تحظى السباح الكهرمانية البلطيقية بسعر أعلى 3 إلى 5 أضعاف من نظائرها الراتنجية. عند موك 100 قطعة، فإن دفعة واحدة من الكهرمان المزيف تعني خسارة 500 إلى 2000 دولار.</p></div>
    <div><h2>الاختبار 1: الطفو في الماء المالح</h2><p>اخلط 3 ملاعق كبيرة من الملح في كوب من الماء. حرّك حتى يذوب تمامًا. أسقط حبة السبح. <strong>الكهرمان الحقيقي يطفو</strong> (كثافة 1.0–1.1 غ/سم³). <strong>المزيف (راتنج، زجاج) يغرق</strong> (كثافة 1.2–1.4 غ/سم³).</p></div>
    <div><h2>الاختبار 2: الإبرة الساخنة</h2><p>أمسك رأس إبرة فوق لهب ولاعة لمدة 10 ثوانٍ، ثم المس بقمتها نقطة صغيرة غير ظاهرة. <strong>الكهرمان الحقيقي:</strong> رائحة راتنج صنوبرية خفيفة. <strong>الرانتج المزيف:</strong> رائحة بلاستيك محترق ويثير لزج.</p></div>
    <div><h2>الاختبار 3: فحص الضوء فوق البنفسجي (365 نانومتر)</h2><p>استخدم مصباح UV (365 نانومتر). في غرفة مظلمة، سلطه على الحبات. <strong>الكهرمان البلطيقي الحقيقي:</strong> فلورة زرقاء-بيضاء إلى خضراء.</p></div>
    <div><h2>الاختبار 4: فحص الشوائب البصرية</h2><p>ارفع الحبة نحو ضوء ساطع. استخدم عدسة مكبرة 10× أو كاميرا هاتف بأقصى تكبير. <strong>شوائب الكهرمان الحقيقي:</strong> حشرات محبوسة وشظايا نباتية وفقاعات هوائية بأشكال غير منتظمة.</p></div>
    <div><h2>الاختبار 5: الشحنة الساكنة</h2><p>افرك حبة الكهرمان بقوة بقطعة صوف لمدة 30 ثانية. ثم قرّبها من قطع صغيرة من الورق. <strong>الكهرمان الحقيقي:</strong> يولّد شحنة ساكنة ويجذب قطع الورق.</p></div>
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6"><p className="text-sm font-semibold text-accent-deep">جاهز لمصادر سبح كهرماني أصلي؟</p><p className="mt-1 text-sm text-muted">تواصل معنا عبر واتساب للحصول على الأسعار الحالية وتوفر العينات.</p></div>
  </article>
);

const kukaGuideEN = (
  <article className="space-y-8">
    <div className="rounded-2xl border border-green-700/20 bg-green-50/50 p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-green-700">Key takeaway</p>
      <p className="mt-2 text-sm text-green-900"><strong>Three checks before bulk:</strong> grain consistency, weight, and scent. These take under 3 minutes and can save a full container of worthless stock.</p>
    </div>
    <div><h2>Why Kuka Wood Quality Varies</h2><p>Kuka wood (Adansonia digitata, baobab family) is a natural material. Density, color, and grain pattern vary by region, age of tree, and growing conditions. The most common fraud is labeling common wood as kuka wood.</p></div>
    <div><h2>Check 1: Grain Pattern Under Light</h2><p>Authentic kuka wood has distinctive interlocking grain with characteristic &quot;cloud&quot; patterns. Color ranges from cream to warm brown. Common wood substitute has straighter, more uniform grain lines. Painted or dyed wood has flat color with no depth.</p></div>
    <div><h2>Check 2: Weight and Density</h2><p>Weigh one bead on a precision scale. <strong>Authentic dense kuka wood:</strong> one 12mm bead weighs approximately 1.2–1.8g. <strong>Light softwood substitute:</strong> significantly lighter. <strong>Compressed sawdust board:</strong> very uniform weight with a &quot;processed&quot; feel.</p></div>
    <div><h2>Check 3: Scent Test</h2><p>Rub the bead warm with your palm for 20–30 seconds. <strong>Authentic kuka wood:</strong> faint sweet woody scent. <strong>No scent:</strong> likely heat-treated or heavily lacquered. <strong>Chemical smell:</strong> surface coating covering the real material.</p></div>
    <div><h2>Check 4: Surface Finish and Hole Quality</h2><p><strong>Authentic kuka:</strong> natural matte to satin finish with slight imperfections. <strong>Molded substitute:</strong> too perfectly smooth. <strong>Varnished wood:</strong> plastic-like sheen, coating may chip when scratched.</p></div>
    <div><h2>Check 5: Water Absorption</h2><p>Drip water onto a bead (not on strung tasbih). <strong>Authentic kuka wood:</strong> absorbs slowly, darkens slightly. <strong>Resin or composite:</strong> water beads up with no absorption. <strong>Lacquered bead:</strong> no absorption due to surface seal.</p></div>
    <div><h2>What Good Kuka Wood Tasbih Should Cost at Wholesale</h2><p>Based on 1688.com price data (March 2026): authentic natural kuka wood tasbih (33-bead, with gift box) typically ranges from $1.20–$2.80 per piece at MOQ 100+. Anything significantly below $1.00 should trigger suspicion.</p></div>
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6"><p className="text-sm font-semibold text-accent-deep">Need help verifying kuka wood quality on a specific batch?</p><p className="mt-1 text-sm text-muted">Send us a photo via WhatsApp — we can give you a preliminary assessment before you order.</p></div>
  </article>
);

const kukaGuideAR = (
  <article className="space-y-8">
    <div className="rounded-2xl border border-green-700/20 bg-green-50/50 p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-green-700">النتيجة الأساسية</p>
      <p className="mt-2 text-sm text-green-900"><strong>ثلاثة فحوصات قبل الجملة:</strong> انتظام الحبوب والوزن والرائحة. تستغرق أقل من 3 دقائق.</p>
    </div>
    <div><h2>لماذا يتفاوت جودة خشب الكوكا</h2><p>خشب الكوكا مادة طبيعية. تتفاوت الكثافة واللون ونمط الحبوب حسب المنطقة وعمر الشجرة. الغش الأكثر شيوعًا هو تصنيف الخشب العادي كخشب كوكا.</p></div>
    <div><h2>الفحص 1: نمط الحبوب تحت الضوء</h2><p><strong>خشب الكوكا الأصلي:</strong> حبوب مميزة متشابكة مع أنماط &quot;السحب&quot; المميزة. البديل الخشبي العادي: حبوب مستقيمة وأكثر انتظامًا.</p></div>
    <div><h2>الفحص 2: الوزن والكثافة</h2><p><strong>خشب كوكا كثيف أصلي:</strong> حبة بقطر 12 ملم تزن تقريبًا 1.2–1.8 غ. البديل الخفيف: أخف بكثير.</p></div>
    <div><h2>الفحص 3: اختبار الرائحة</h2><p><strong>خشب كوكا أصلي:</strong> رائحة خشبية حلوة خفيفة. لا رائحة: حبة معالجة بالحرارة أو مطلي.</p></div>
    <div><h2>الفحص 4: تشطيب السطح وجودية الثقب</h2><p><strong>الكوكا الأصلي:</strong> تشطيب غير لامع طبيعي إلى ساتان مع عيوب طبيعية طفيفة. البديل المصبوب: أملس جدًا بشكل مريب.</p></div>
    <div><h2>الفحص 5: امتصاص الماء</h2><p><strong>الكوكا الأصلي:</strong> يمتص الماء ببطء ويغمق قليلاً. الراتنج أو المركب: الماء يتجمع على السطح.</p></div>
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6"><p className="text-sm font-semibold text-accent-deep">تحتاج مساعدة في التحقق من جودة خشب الكوكا؟</p><p className="mt-1 text-sm text-muted">أرسل لنا صورة عبر واتساب — يمكننا إعطاءك تقييم أولي قبل أن تطلب.</p></div>
  </article>
);

export default async function BlogArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const isAmber = slug === "how-to-identify-real-amber-tasbih";
  const title = isAmber
    ? (locale === "en" ? "How to Identify Real Amber Tasbih vs Fake" : "كيفية التعرف على السبح الكهرماني الحقيقي مقابل المزيف")
    : (locale === "en" ? "Kuka Wood Tasbih: How to Verify Quality" : "سبحان خشب الكوكا: كيفية التحقق من الجودة");

  return (
    <div className="noor-container py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3 text-xs text-muted">
          <span className="rounded-full bg-accent/10 px-3 py-1 text-accent-deep">
            {locale === "en" ? "Buyer's Guide" : "دليل المشتري"}
          </span>
          <span>{isAmber ? (locale === "en" ? "5 min read" : "5 دقائق") : (locale === "en" ? "6 min read" : "6 دقائق")}</span>
        </div>
        <h1 className="noor-title text-3xl md:text-4xl">{title}</h1>
        <div className="mt-8 h-px bg-border/50" />
        <div className="mt-8">
          {isAmber ? (locale === "en" ? amberGuideEN : amberGuideAR) : (locale === "en" ? kukaGuideEN : kukaGuideAR)}
        </div>
        <div className="mt-12 rounded-2xl border border-accent/20 bg-[linear-gradient(135deg,_rgba(255,248,235,0.8),_rgba(252,240,220,0.9))] p-6 text-center">
          <p className="text-sm text-muted">
            {locale === "en" ? "Looking for a reliable wholesale tasbih supplier? " : "تبحث عن مورد تسابيح موثوق بالجملة؟ "}
            <Link href="https://wa.me/8618929564545" className="font-semibold text-accent-deep underline" target="_blank" rel="noreferrer">
              {locale === "en" ? "Request Catalog" : "اطلب الكتالوج"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
