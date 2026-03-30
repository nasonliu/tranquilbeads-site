import { notFound } from "next/navigation";

import { blogPosts } from "@/src/data/buyers-guide";
import { isLocale, locales } from "@/src/lib/i18n";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    blogPosts.map((post) => ({ locale, slug: post.slug })),
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: post.title[locale],
    description: post.description[locale],
    alternates: {
      canonical: `https://www.tranquilbeads.com/${locale}/blog/${slug}`,
    },
    openGraph: {
      title: post.title[locale],
      description: post.description[locale],
      siteName: "TranquilBeads",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title[locale],
      description: post.description[locale],
    },
  };
}

function AmberGuideEN() {
  return (
    <article className="space-y-8">
      <div className="rounded-2xl border border-accent/20 bg-amber-50/50 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-700">Key takeaway</p>
        <p className="mt-2 text-sm text-amber-900">
          <strong>5 tests in 2 minutes.</strong> Any buyer can do these without special tools.
          If a supplier resists, that itself is a signal.
        </p>
      </div>

      <div>
        <h2>Why Amber Authenticity Matters for Wholesale</h2>
        <p>
          Baltic amber tasbih commands 3–5× the price of resin imitations. At MOQ 100 pieces,
          a single batch of fake amber means losing $500–2,000 on inventory you cannot sell.
          Worse: a retailer who receives fake amber from you will never reorder.
        </p>
        <p>
          Real amber is fossilized tree resin — not stone, not glass. It has distinctive
          properties that make authentication possible even without lab equipment.
        </p>
      </div>

      <div>
        <h2>Test 1: The Saltwater Float</h2>
        <p>
          Mix 3 tablespoons of salt into a glass of water. Stir until fully dissolved.
          Drop the tasbih bead in.
        </p>
        <ul>
          <li><strong>Real amber floats</strong> — density 1.0–1.1 g/cm³</li>
          <li><strong>Fake (resin, glass) sinks</strong> — density 1.2–1.4 g/cm³</li>
        </ul>
        <p>
          This test takes 30 seconds. It eliminates most cheap imitations immediately.
          Note: this test only works for loose beads — do not submerge a strung tasbih.
        </p>
      </div>

      <div>
        <h2>Test 2: The Hot Needle</h2>
        <p>
          Hold a needle tip over a lighter flame for 10 seconds, then touch it briefly
          to an inconspicuous spot on one bead.
        </p>
        <ul>
          <li><strong>Real amber:</strong> gives off a faint piney resin smell, slight mark wipes off</li>
          <li><strong>Resin fake:</strong> smells like burnt plastic, leaves a sticky mark</li>
          <li><strong>Glass:</strong> no reaction, no smell</li>
        </ul>
        <p>
          Always do this on an inconspicuous area. This test is decisive for resin composites.
        </p>
      </div>

      <div>
        <h2>Test 3: UV Light Check</h2>
        <p>
          Use a standard UV torchlight (365nm). In a dark room, shine it on the beads.
        </p>
        <ul>
          <li><strong>Real Baltic amber:</strong> shows bright blue-white to green fluorescence</li>
          <li><strong>Dominican amber:</strong> greenish-yellow fluorescence</li>
          <li><strong>Resin imitation:</strong> little to no reaction, dull grey-brown</li>
          <li><strong>Glass:</strong> no fluorescence</li>
        </ul>
        <p>
          A 365nm UV torch costs under $10 and fits in a buyer's pocket. Every professional
          tasbih buyer should carry one.
        </p>
      </div>

      <div>
        <h2>Test 4: Visual Inclusion Inspection</h2>
        <p>
          Hold the bead up to strong light (sunlight or a bright LED). Use a 10× loupe
          or a phone camera at maximum zoom.
        </p>
        <ul>
          <li><strong>Real amber inclusions:</strong> trapped insects, plant fragments, air bubbles with irregular shapes. Under magnification these look three-dimensional.</li>
          <li><strong>Pressed/reconstructed amber:</strong> visible "flow" lines, flattened inclusions, unnatural layering</li>
          <li><strong>Resin: </strong>usually too clean — real amber almost always has some natural inclusion</li>
        </ul>
        <p>
          If every single bead on a strand looks suspiciously perfect and inclusion-free,
          be suspicious. Real amber is rarely flawless.
        </p>
      </div>

      <div>
        <h2>Test 5: Static Charge</h2>
        <p>
          Rub the amber bead vigorously with a piece of wool or cotton clothing for 30 seconds.
          Then hold it near small pieces of paper or a plastic straw.
        </p>
        <ul>
          <li><strong>Real amber:</strong> develops static charge, attracts small paper fragments</li>
          <li><strong>Glass or stone:</strong> does not develop static charge</li>
        </ul>
        <p>
          This is the classical "amber attracts paper" test. It's not definitive alone
          but works well as a supplementary check.
        </p>
      </div>

      <div>
        <h2>Red Flags to Watch For</h2>
        <ul>
          <li>Price too low to be credible — if it's 40% below market, it's probably fake</li>
          <li>Supplier cannot provide origin documentation or processing certificates</li>
          <li>Amber beads are uniformly identical — natural amber varies</li>
          <li>No heterogeneity under UV light</li>
          <li>Supplier resists small sample orders before bulk — a reputable seller always allows sampling</li>
        </ul>
      </div>

      <div>
        <h2>What TranquilBeads Provides</h2>
        <p>
          Every amber tasbih batch from TranquilBeads ships with <strong>QC photos</strong> before
          dispatch. Amber and coral items come with <strong>jewelry certificates</strong> upon
          request — covering origin and material authenticity.
        </p>
        <p>
          We support <strong>private label packaging</strong> so you can present authentic
          certificates under your own brand. MOQ starts at 100 pieces.
        </p>
      </div>

      <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6">
        <p className="text-sm font-semibold text-accent-deep">Ready to source authentic amber tasbih?</p>
        <p className="mt-1 text-sm text-muted">
          Contact us via WhatsApp for current pricing, sample availability, and certificate options.
        </p>
      </div>
    </article>
  );
}

function AmberGuideAR() {
  return (
    <article className="space-y-8">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-50/50 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-700">النتيجة الأساسية</p>
        <p className="mt-2 text-sm text-amber-900">
          <strong>5 اختبارات في دقيقتين.</strong> يمكن لأي مشترٍ إجراؤها دون أدوات خاصة.
          إذا رفض المورد إجرائها، فهذا نفسه إشارة تحذيرية.
        </p>
      </div>

      <div>
        <h2>لماذا يهم التحقق من أصالة الكهرمان للجملة</h2>
        <p>
          تحظى السباح الكهرمانية البلطيقية بسعر أعلى 3 إلى 5 أضعاف من نظائرها الراتنجية.
          عند موك 100 قطعة، فإن دفعة واحدة من الكهرمان المزيف تعني خسارة 500 إلى 2000 دولار
          من المخزون الذي لا يمكن بيعه. الأسوأ: أن بائع التجزئة الذي receives كهرمان مزيف منك
          لن يطلب مرة أخرى أبدًا.
        </p>
        <p>
          الكهرمان الحقيقي هو راتنج شجري متحجّر — وليس حجرًا ولا زجاجًا. له خصائص مميزة
          تجعل التحقق ممكنًا حتى دون معدات معملية.
        </p>
      </div>

      <div>
        <h2>الاختبار 1: اختبار الطفو في الماء المالح</h2>
        <p>
          اخلط 3 ملاعق كبيرة من الملح في كوب من الماء. حرّك حتى يذوب تمامًا.
          أسقط حبة السبح.
        </p>
        <ul>
          <li><strong>الكهرمان الحقيقي يطفو</strong> — كثافة 1.0–1.1 غ/سم³</li>
          <li><strong>المزيف (راتنج، زجاج) يغرق</strong> — كثافة 1.2–1.4 غ/سم³</li>
        </ul>
        <p>
          هذا الاختبار يستغرق 30 ثانية. يزيل معظم التقليد الرخيص فورًا.
          ملاحظة: يعمل فقط على الحبات الفردية — لا تغمر السبح المربوط.
        </p>
      </div>

      <div>
        <h2>الاختبار 2: اختبار الإبرة الساخنة</h2>
        <p>
          أمسك رأس إبرة فوق لهب ولاعة لمدة 10 ثوانٍ، ثم المس بقمةها نقطة صغيرة غير ظاهرة على حبة واحدة.
        </p>
        <ul>
          <li><strong>الكهرمان الحقيقي:</strong> تفوح منه رائحة راتنج صنوبرية خفيفة، يمكن مسح الأثر الخفيف</li>
          <li><strong>الرانتج المزيف:</strong> رائحة بلاستيك محترق، يترك أثرًا لزجًا</li>
          <li><strong>الزجاج:</strong> لا تفاعل، لا رائحة</li>
        </ul>
        <p>نفّذ الاختبار دائمًا على منطقة غير ظاهرة. هذا الاختبار حاسم للراتنج المركب.</p>
      </div>

      <div>
        <h2>الاختبار 3: فحص الضوء فوق البنفسجي</h2>
        <p>
          استخدم مصباح UV (365 نانومتر). في غرفة مظلمة، سلطه على الحبات.
        </p>
        <ul>
          <li><strong>الكهرمان البلطيقي الحقيقي:</strong> يظهر فلورة زرقاء-بيضاء إلى خضراء</li>
          <li><strong>كهرمان الدومينيكان:</strong> فلورة صفراء-خضراء</li>
          <li><strong>تقليد الراتنج:</strong> تفاعل قليل أو معدوم، رمادي-بني باهت</li>
          <li><strong>الزجاج:</strong> لا فلورة</li>
        </ul>
        <p>
          مصباح UV بزاوية 365 نانومتر يكلف أقل من 10 دولارات ويناسب جيب المشتري.
        </p>
      </div>

      <div>
        <h2>الاختبار 4: فحص الشوائب البصرية</h2>
        <p>
          ارفع الحبة نحو ضوء ساطع (أشعة شمس أو LED). استخدم عدسة مكبرة 10× أو كاميرا هاتف بأقصى تكبير.
        </p>
        <ul>
          <li><strong>شوائب الكهرمان الحقيقي:</strong> حشرات محبوسة، شظايا نباتية، فقاعات هوائية بأشكال غير منتظمة. تبدو ثلاثية الأبعاد تحت التكبير.</li>
          <li><strong>الكهرمان المعاد تشكيله:</strong> خطوط تدفق مرئية، شوائب مسطحة، طبقات غير طبيعية</li>
          <li><strong>الرانتج:</strong> نظيف بشكل مريب — الكهرمان الحقيقي يحتوي دائمًا على شائبة طبيعية</li>
        </ul>
        <p>
          إذا بدت كل حبة على العقدة مثالية الشوائب بشكل مريب، كن حذرًا. الكهرمان الحقيقي نادرًا ما يكون flawless.
        </p>
      </div>

      <div>
        <h2>الاختبار 5: الشحنة الساكنة</h2>
        <p>
          افرك حبة الكهرمان بقوة بقطعة صوف أو قطن لمدة 30 ثانية.
          ثم قرّبها من قطع صغيرة من الورق أو مصاصة بلاستيكية.
        </p>
        <ul>
          <li><strong>الكهرمان الحقيقي:</strong> يولّد شحنة ساكنة ويجذب قطع الورق الصغيرة</li>
          <li><strong>الزجاج أو الحجر:</strong> لا يولّد شحنة ساكنة</li>
        </ul>
        <p>
          هذا هو الاختبار الكلاسيكي "الكهرمان يجذب الورق". ليس حاسمًا بمفرده لكنه يعمل بشكل جيد كاختبار تكميل.
        </p>
      </div>

      <div>
        <h2>علامات تحذيرية يجب الانتباه لها</h2>
        <ul>
          <li>السعر منخفض جدًا لدرجة لا تصدق — إذا كان أقل بنسبة 40% من السوق، فهو مزيف على الأرجح</li>
          <li>المورد لا يستطيع تقديم وثائق المنشأ أو شهادات المعالجة</li>
          <li>حبات الكهرمان متطابقة بشكل موحد — الكهرمان الطبيعي يتفاوت</li>
          <li>لا عدم تجانس تحت الضوء فوق البنفسجي</li>
          <li>المورد يرفض طلبات العينات الصغيرة قبل الجملة — البائع الموثوق يسمح دائمًا بالعينات</li>
        </ul>
      </div>

      <div>
        <h2>ما تقدمه ترانكويل بيدز</h2>
        <p>
          كل دفعة سبح كهرماني من ترانكويل بيدز تشحن مع <strong>صور فحص الجودة</strong> قبل الإرسال.
          عناصر الكهرمان والمرجان تأتي مع <strong>شهادات مجوهرات</strong> عند الطلب — تغطي المنشأ وأصالة المادة.
        </p>
        <p>
          ندعم <strong>تغليف العلامة الخاصة</strong> حتى تتمكن من تقديم شهادات أصلية تحت علامتك.
          الموك يبدأ من 100 قطعة.
        </p>
      </div>

      <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6">
        <p className="text-sm font-semibold text-accent-deep">جاهز لمصادر سبح كهرماني أصلي؟</p>
        <p className="mt-1 text-sm text-muted">
          تواصل معنا عبر واتساب للحصول على الأسعار الحالية وتوفر العينات وخيارات الشهادات.
        </p>
      </div>
    </article>
  );
}

function KukaGuideEN() {
  return (
    <article className="space-y-8">
      <div className="rounded-2xl border border-green-700/20 bg-green-50/50 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-green-700">Key takeaway</p>
        <p className="mt-2 text-sm text-green-900">
          <strong>Three checks before bulk:</strong> grain consistency, weight手感, and scent.
          These take under 3 minutes and can save a full container of worthless stock.
        </p>
      </div>

      <div>
        <h2>Why Kuka Wood Quality Varies Wildly</h2>
        <p>
          Kuka wood (Adansonia digitata, baobab family) is a natural material.
          Density, color, and grain pattern vary by region, age of tree, and growing conditions.
          A "kuka tasbih" from one supplier can look completely different from another —
          and the price difference reflects real quality differences.
        </p>
        <p>
          The most common fraud is labeling <strong>普通木材</strong> (common wood) as kuka wood,
          or mixing kuka wood beads with cheaper alternatives on the same strand.
        </p>
      </div>

      <div>
        <h2>Check 1: Grain Pattern Under Light</h2>
        <p>
          Hold the bead under a bright LED or sunlight. Examine the wood grain with naked eye
          or 10× loupe.
        </p>
        <ul>
          <li><strong>Authentic kuka wood:</strong> distinctive interlocking grain with characteristic
            "cloud" patterns. Color ranges from cream to warm brown. Grain lines are irregular
            and organic — never perfectly straight.</li>
          <li><strong>Common wood substitute:</strong> straighter, more uniform grain lines.
            Often too light in color or too uniformly dark. The pattern repeats rather than flows.</li>
          <li><strong>Painted or dyed wood:</strong> surface color looks flat, no depth. When wet
            with a drop of water, the color may bleed slightly.</li>
        </ul>
      </div>

      <div>
        <h2>Check 2: Weight and Density</h2>
        <p>
          Weigh one bead on a precision scale (0.1g accuracy). Alternatively, compare by hand —
          the weight should feel substantial, not hollow.
        </p>
        <ul>
          <li><strong>Authentic dense kuka wood:</strong> one 12mm bead weighs approximately 1.2–1.8g
            depending on exact species and moisture content</li>
          <li><strong>Light softwood substitute:</strong> significantly lighter, feels almost
            weightless in the palm</li>
          <li><strong>Compressed sawdust board:</strong> very uniform weight (suspiciously so),
            may have a "processed" feel — smooth but without natural warmth</li>
        </ul>
        <p>
          If you have a reference authentic bead, the weight comparison is immediate and obvious.
          Always keep one authenticated sample in your buying kit.
        </p>
      </div>

      <div>
        <h2>Check 3: Scent Test</h2>
        <p>
          Kuka wood from the baobab family has a subtle but distinctive woody scent when rubbed
          warm with the palm. Do this for 20–30 seconds.
        </p>
        <ul>
          <li><strong>Authentic kuka wood:</strong> faint sweet woody scent, slightly reminiscent of
            dried fruit or mild vanilla. The scent should be subtle, not overpowering.</li>
          <li><strong>No scent at all:</strong> likely a heat-treated or heavily lacquered bead
            that has lost its natural oils</li>
          <li><strong>Chemical or lacquer smell:</strong> surface coating is covering the real material</li>
          <li><strong>Pine or cedar scent:</strong> different species — not kuka</li>
        </ul>
        <p>
          This test works best on raw, unfinished beads. Many mass-produced tasbih have surface
          lacquer that blocks the scent test — in that case, check an unfinished area near the hole.
        </p>
      </div>

      <div>
        <h2>Check 4: Surface Finish and Hole Quality</h2>
        <p>
          Examine the bead surface under light and check the drill hole.
        </p>
        <ul>
          <li><strong>Authentic kuka:</strong> natural matte to satin finish. Surface has slight
            natural imperfections. Hole entry is clean, not perfectly smooth — showing the wood
            was drilled rather than molded.</li>
          <li><strong>Molded substitute:</strong> too perfectly smooth. May show mold seam lines.
            Hole is perfectly circular with zero variation.</li>
          <li><strong>varnished wood:</strong> surface has a plastic-like sheen. When you scratch
            gently with a fingernail, the coating may chip.</li>
        </ul>
      </div>

      <div>
        <h2>Check 5: Water Absorption</h2>
        <p>
          Drip a small amount of water onto a bead (do not use on strung tasbih).
        </p>
        <ul>
          <li><strong>Authentic kuka wood:</strong> absorbs water slowly, darkens slightly where
            the drop sits. Natural wood porosity.</li>
          <li><strong>Resin or composite:</strong> water beads up and sits on the surface —
            no absorption at all</li>
          <li><strong>Lacquered/coated bead:</strong> no absorption due to surface seal</li>
        </ul>
      </div>

      <div>
        <h2>What Good Kuka Wood Tasbih Should Cost at Wholesale</h2>
        <p>
          Based on 1688.com price data (March 2026): authentic natural kuka wood tasbih
          (33-bead, with gift box) typically ranges from $1.20–$2.80 per piece at MOQ 100+.
          Anything significantly below $1.00 should trigger suspicion.
        </p>
        <p>
          Price alone is not a guarantee — but extreme low pricing is an almost certain indicator
          of material fraud.
        </p>
      </div>

      <div>
        <h2>Red Flags When Sourcing Kuka Wood Tasbih</h2>
        <ul>
          <li>Price too low for the material — if it's 30% below market, investigate</li>
          <li>Every bead looks identical — natural wood varies</li>
          <li>No scent from the wood at all</li>
          <li>Surface too smooth and uniform — processed rather than natural</li>
          <li>Supplier cannot provide small sample before bulk order</li>
          <li>Weight feels hollow or unusually light</li>
        </ul>
      </div>

      <div>
        <h2>What TranquilBeads Does Differently</h2>
        <p>
          Every strand of kuka wood tasbih from TranquilBeads is bead-selected for consistent
          grain and weight. <strong>QC photos are sent before dispatch</strong> — you see exactly
          what you're getting before payment. MOQ 100 pieces with private label support.
        </p>
      </div>

      <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6">
        <p className="text-sm font-semibold text-accent-deep">
          Need help verifying kuka wood quality on a specific batch?
        </p>
        <p className="mt-1 text-sm text-muted">
          Send us a photo via WhatsApp — we can give you a preliminary assessment before you order.
        </p>
      </div>
    </article>
  );
}

function KukaGuideAR() {
  return (
    <article className="space-y-8">
      <div className="rounded-2xl border border-green-700/20 bg-green-50/50 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-green-700">النتيجة الأساسية</p>
        <p className="mt-2 text-sm text-green-900">
          <strong>ثلاثة فحوصات قبل الجملة:</strong> انتظام الحبوب، الوزن، والرائحة.
          تستغرق أقل من 3 دقائق ويمكن أن توفر شحنة كاملة من مخزون عديم القيمة.
        </p>
      </div>

      <div>
        <h2>لماذا يتفاوت جودة خشب الكوكا بشكل كبير</h2>
        <p>
          خشب الكوكا (Adansonia digitata، عائلة الباوباب) مادة طبيعية.
          تتفاوت الكثافة واللون ونمط الحبوب حسب المنطقة وعمر الشجرة وظروف النمو.
          "سبحان كوكا" من مورد يمكن أن يبدو مختلفًا تمامًا عن الآخر —
          وفرق السعر يعكس اختلافات الجودة الحقيقية.
        </p>
        <p>
          الغش الأكثر شيوعًا هو تصنيف <strong>الخشب العادي</strong> كخشب كوكا،
          أو خلط حبات الكوكا البديلة الأرخص على نفس العقدة.
        </p>
      </div>

      <div>
        <h2>الفحص 1: نمط الحبوب تحت الضوء</h2>
        <p>
          أمسك الحبة تحت LED ساطع أو ضوء الشمس. افحص حبة الخشب بالعين المجردة أو عدسة مكبرة 10×.
        </p>
        <ul>
          <li><strong>خشب الكوكا الأصلي:</strong> حبوب مميزة متشابكة مع أنماط "السحب" المميزة.
            يتراوح اللون من الكريمي إلى البني الدافئ. خطوط الحبوب غير منتظمة وعضوية — never
            مستقيمة تمامًا.</li>
          <li><strong>بديل الخشب العادي:</strong> حبوب مستقيمة وأكثر انتظامًا. غالبًا فاتحة جدًا
            اللون أو داكنة بشكل موحد جدًا. النمط يتكرر بدلاً من أن يتدفق.</li>
          <li><strong>الخشب المطلي أو المصبوغ:</strong> لون السطح يبدو مسطحًا، بلا عمق.</li>
        </ul>
      </div>

      <div>
        <h2>الفحص 2: الوزن والكثافة</h2>
        <p>
          وزّن حبة واحدة على ميزان دقيق (دقة 0.1 غ). أو قارن باليد —
          يجب أن يشعر الوزن بالثقل، لا hollow.
        </p>
        <ul>
          <li><strong>خشب كوكا كثيف أصلي:</strong> حبة بقطر 12 ملم تزن تقريبًا 1.2–1.8 غ</li>
          <li><strong>بديل الخشب الخفيف:</strong> أخف بكثير، يشعر تقريبًا بخفة الوزن في الراحة</li>
          <li><strong>لوح نشارة مضغوط:</strong> وزن موحد بشكل مريب، قد يكون له إحساس "معالج"</li>
        </ul>
      </div>

      <div>
        <h2>الفحص 3: اختبار الرائحة</h2>
        <p>
          خشب الكوكا من عائلة الباوباب له رائحة خشبية خفيفة مميزة عند فركه دافئًا براحة اليد.
        </p>
        <ul>
          <li><strong>خشب كوكا أصلي:</strong> رائحة خشبية حلوة خفيفة، تشبه الفواكه المجففة قليلاً أو الفانيليا المعتدلة</li>
          <li><strong>لا رائحة على الإطلاق:</strong> على الأرجح حبة معالجة بالحرارة أو بكثرة</li>
          <li><strong>رائحة كيميائية أو ورنيش:</strong> الطلاء السطحي يغطي المادة الحقيقية</li>
        </ul>
      </div>

      <div>
        <h2>الفحص 4: تشطيب السطح وجودية الثقب</h2>
        <ul>
          <li><strong>كوكا الأصلي:</strong> تشطيب غير لامع طبيعي إلى ساتان. السطح يحتوي على عيوب طبيعية طفيفة.</li>
          <li><strong>بديل مصبوب:</strong> أملس جدًا بشكل مثالي. قد يظهر خطوط درزة القالب.</li>
          <li><strong>خشب مطلي:</strong> السطح له بريق شبيه بالبلاستيك.</li>
        </ul>
      </div>

      <div>
        <h2>علامات تحذيرية عند مصادر خشب الكوكا</h2>
        <ul>
          <li>السعر منخفض جدًا للمادة — إذا كان أقل بنسبة 30% من السوق، تحقق</li>
          <li>كل الحبات تبدو متطابقة — الخشب الطبيعي يتفاوت</li>
          <li>لا رائحة من الخشب على الإطلاق</li>
          <li>السطح أملس وموحد جدًا — processed وليس طبيعيًا</li>
          <li>المورد لا يستطيع تقديم عينة صغيرة قبل طلب الجملة</li>
        </ul>
      </div>

      <div>
        <h2>ما تفعله ترانكويل بيدز بشكل مختلف</h2>
        <p>
          كل عقدة من خشب الكوكا من ترانكويل بيدز يتم اختيارها لاتساق الحبوب والوزن.
          <strong>صور فحص الجودة ترسل قبل الإرسال</strong> — ترى بالضبط ما تحصل عليه قبل الدفع.
          موك 100 قطعة مع دعم العلامة الخاصة.
        </p>
      </div>

      <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6">
        <p className="text-sm font-semibold text-accent-deep">
          تحتاج مساعدة في التحقق من جودة خشب الكوكا في دفعة معينة؟
        </p>
        <p className="mt-1 text-sm text-muted">
          أرسل لنا صورة عبر واتساب — يمكننا إعطاءك تقييم أولي قبل أن تطلب.
        </p>
      </div>
    </article>
  );
}

export default async function BlogArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const copy = { hero: { primaryCta: locale === "en" ? "Request Catalog" : "اطلب الكتالوج" } };

  return (
    <div className="noor-container py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3 text-xs text-muted">
          <span className="rounded-full bg-accent/10 px-3 py-1 text-accent-deep">
            {post.category[locale]}
          </span>
          <span>{post.publishedAt}</span>
          <span>{post.readingTime[locale]}</span>
        </div>

        <h1 className="noor-title text-3xl md:text-4xl">{post.title[locale]}</h1>
        <p className="mt-4 text-lg text-muted">{post.description[locale]}</p>

        <div className="mt-8 h-px bg-border/50" />

        <div className="mt-8">
          {slug === "how-to-identify-real-amber-tasbih" &&
            (locale === "en" ? <AmberGuideEN /> : <AmberGuideAR />)}
          {slug === "kuka-wood-tasbih-authenticity-guide" &&
            (locale === "en" ? <KukaGuideEN /> : <KukaGuideAR />)}
        </div>

        <div className="mt-12 rounded-2xl border border-accent/20 bg-[linear-gradient(135deg,_rgba(255,248,235,0.8),_rgba(252,240,220,0.9))] p-6 text-center">
          <p className="text-sm text-muted">
            {locale === "en"
              ? "Looking for a reliable wholesale tasbih supplier? "
              : "تبحث عن مورد تسابيح موثوق بالجملة؟ "}
            <a
              href="https://wa.me/8618929564545"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-accent-deep underline"
            >
              {copy.hero.primaryCta}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
