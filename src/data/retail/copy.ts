import type { Locale } from "@/src/lib/i18n";

export function getRetailCopy(locale: Locale) {
  return locale === "ar"
    ? {
        eyebrow: "متجر التجزئة", title: "كتالوج التجزئة قيد الإعداد", description: "نُكمل حاليًا التحقق من المنتجات والأسعار وخيارات التنفيذ قبل فتح الطلبات المباشرة.", unavailable: "الشراء المباشر غير متاح حاليًا.", cart: "السلة", checkout: "الدفع عبر PayPal", add: "أضف إلى السلة", emptyCart: "سلتك فارغة.",
      }
    : {
        eyebrow: "Retail shop", title: "Retail catalog in preparation", description: "We are verifying direct-retail products, pricing, and fulfilment before opening orders.", unavailable: "Direct checkout is not available yet.", cart: "Cart", checkout: "Pay with PayPal", add: "Add to cart", emptyCart: "Your cart is empty.",
      };
}
