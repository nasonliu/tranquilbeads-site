import type { Locale } from "@/src/lib/i18n";

export type RetailPolicyKey = "privacy" | "terms" | "shipping-returns";

type PolicySection = {
  heading: string;
  paragraphs: string[];
};

type RetailPolicy = {
  eyebrow: string;
  title: string;
  introduction: string;
  sections: PolicySection[];
};

const policies: Record<RetailPolicyKey, Record<Locale, RetailPolicy>> = {
  privacy: {
    en: {
      eyebrow: "Retail privacy notice",
      title: "Privacy policy",
      introduction: "This notice explains how TranquilBeads handles information submitted through the direct-retail shop.",
      sections: [
        {
          heading: "Information we use",
          paragraphs: [
            "When you place or prepare an order, we use the contact, order and delivery-address information you provide to quote the order, process it, arrange delivery, send order updates and provide customer support.",
            "We may also use order information to help prevent misuse, protect the shop and meet applicable record-keeping obligations.",
          ],
        },
        {
          heading: "Payments through PayPal",
          paragraphs: [
            "Card and PayPal payment processing is provided by PayPal as a third-party payment service. PayPal handles payment details under its own privacy terms; TranquilBeads does not need your full card details to fulfil the order.",
          ],
        },
        {
          heading: "Sharing and contact",
          paragraphs: [
            "We share only the information needed with service providers involved in payment, delivery or operating the shop. We do not sell personal information.",
            "For privacy questions or requests about your retail order information, contact sales@tranquilbeads.com.",
          ],
        },
      ],
    },
    ar: {
      eyebrow: "إشعار خصوصية التجزئة",
      title: "سياسة الخصوصية",
      introduction: "يوضح هذا الإشعار كيفية تعامل TranquilBeads مع المعلومات المقدمة عبر متجر التجزئة المباشر.",
      sections: [
        {
          heading: "المعلومات التي نستخدمها",
          paragraphs: [
            "عند تقديم طلب أو التحضير له، نستخدم معلومات الاتصال والطلب وعنوان التسليم التي تقدمها لتسعير الطلب ومعالجته وترتيب التوصيل وإرسال تحديثات الطلب وتقديم دعم العملاء.",
            "قد نستخدم معلومات الطلب أيضاً للمساعدة في منع إساءة الاستخدام وحماية المتجر والوفاء بالتزامات حفظ السجلات المعمول بها.",
          ],
        },
        {
          heading: "المدفوعات عبر PayPal",
          paragraphs: [
            "تتم معالجة مدفوعات البطاقات وPayPal بواسطة PayPal باعتباره خدمة دفع من طرف ثالث. يتعامل PayPal مع تفاصيل الدفع وفق شروط الخصوصية الخاصة به، ولا تحتاج TranquilBeads إلى بيانات بطاقتك الكاملة لتنفيذ الطلب.",
          ],
        },
        {
          heading: "المشاركة والتواصل",
          paragraphs: [
            "نشارك فقط المعلومات اللازمة مع مقدمي الخدمات المشاركين في الدفع أو التوصيل أو تشغيل المتجر. ولا نبيع المعلومات الشخصية.",
            "لاستفسارات الخصوصية أو طلبات تتعلق بمعلومات طلب التجزئة، تواصل مع sales@tranquilbeads.com.",
          ],
        },
      ],
    },
  },
  terms: {
    en: {
      eyebrow: "Retail terms",
      title: "Terms of sale",
      introduction: "These direct-retail terms apply to orders placed through the TranquilBeads retail shop. Version: 2026-07-28.",
      sections: [
        {
          heading: "Orders and payment",
          paragraphs: [
            "By placing an order, you confirm that the order and delivery information you submit is accurate. Payment is processed by PayPal, a third-party payment provider. A payment approval does not change the availability or delivery requirements shown for the order.",
            "The checkout shows the order total, including the applicable shipping charge and taxes, before you submit payment.",
          ],
        },
        {
          heading: "Delivery scope",
          paragraphs: [
            "The direct-retail shop accepts delivery only to countries currently configured in checkout. If a country is not offered at checkout, it is not available for that order.",
            "After dispatch, we provide tracking information when it is available from the delivery service.",
          ],
        },
        {
          heading: "Questions about an order",
          paragraphs: [
            "For an order, delivery or policy question, contact sales@tranquilbeads.com and include your order reference where available.",
          ],
        },
      ],
    },
    ar: {
      eyebrow: "شروط التجزئة",
      title: "شروط البيع",
      introduction: "تنطبق شروط التجزئة المباشرة هذه على الطلبات المقدمة عبر متجر TranquilBeads. الإصدار: 2026-07-28.",
      sections: [
        {
          heading: "الطلبات والدفع",
          paragraphs: [
            "عند تقديم الطلب، تؤكد أن معلومات الطلب والتسليم التي تقدمها صحيحة. تتم معالجة الدفع بواسطة PayPal، وهو مزود دفع من طرف ثالث. ولا يغيّر اعتماد الدفع من توفر المنتج أو متطلبات التسليم المعروضة للطلب.",
            "يعرض الدفع إجمالي الطلب، بما في ذلك رسوم الشحن والضرائب المطبقة، قبل تقديم الدفع.",
          ],
        },
        {
          heading: "نطاق التسليم",
          paragraphs: [
            "يقبل متجر التجزئة المباشر التسليم فقط إلى البلدان المهيأة حالياً في صفحة الدفع. إذا لم يظهر البلد في صفحة الدفع، فهو غير متاح لهذا الطلب.",
            "بعد الشحن، نقدم معلومات التتبع عند توفرها من خدمة التوصيل.",
          ],
        },
        {
          heading: "الاستفسار عن طلب",
          paragraphs: [
            "لأي سؤال عن طلب أو تسليم أو سياسة، تواصل مع sales@tranquilbeads.com وأضف مرجع طلبك إن كان متاحاً.",
          ],
        },
      ],
    },
  },
  "shipping-returns": {
    en: {
      eyebrow: "Retail delivery support",
      title: "Shipping, returns and refunds",
      introduction: "This page explains the delivery and after-sales process for direct-retail orders.",
      sections: [
        {
          heading: "Shipping and delivery",
          paragraphs: [
            "We ship only to the countries configured in checkout at the time of your order. Shipping charges and applicable taxes are shown in the order total before payment.",
            "Once an order is dispatched, tracking information is shared when it is available from the carrier.",
          ],
        },
        {
          heading: "Returns and refund requests",
          paragraphs: [
            "To request a return or refund review, contact sales@tranquilbeads.com with your order reference and a clear description of the issue. Requests are reviewed before any return or refund is approved.",
            "This policy does not promise a fixed return window, automatic approval or a guaranteed refund. Any outcome depends on the order details and the review.",
          ],
        },
      ],
    },
    ar: {
      eyebrow: "دعم تسليم التجزئة",
      title: "الشحن والإرجاع والاسترداد",
      introduction: "توضح هذه الصفحة عملية التسليم وخدمة ما بعد البيع لطلبات التجزئة المباشرة.",
      sections: [
        {
          heading: "الشحن والتسليم",
          paragraphs: [
            "نقوم بالشحن فقط إلى البلدان المهيأة في صفحة الدفع وقت تقديم طلبك. تظهر رسوم الشحن والضرائب المطبقة ضمن إجمالي الطلب قبل الدفع.",
            "بعد شحن الطلب، نشارك معلومات التتبع عند توفرها من شركة الشحن.",
          ],
        },
        {
          heading: "طلبات الإرجاع والاسترداد",
          paragraphs: [
            "لطلب مراجعة إرجاع أو استرداد، تواصل مع sales@tranquilbeads.com مع مرجع طلبك ووصف واضح للمشكلة. تتم مراجعة الطلبات قبل اعتماد أي إرجاع أو استرداد.",
            "لا تعد هذه السياسة بمدة إرجاع ثابتة أو موافقة تلقائية أو استرداد مضمون. وتعتمد النتيجة على تفاصيل الطلب والمراجعة.",
          ],
        },
      ],
    },
  },
};

export function getRetailPolicy(locale: Locale, key: RetailPolicyKey) {
  return policies[key][locale];
}

export const retailPolicyPaths: Record<RetailPolicyKey, string> = {
  privacy: "/privacy",
  terms: "/terms",
  "shipping-returns": "/shipping-returns",
};
