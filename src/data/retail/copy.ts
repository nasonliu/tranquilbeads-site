import type { Locale } from "@/src/lib/i18n";

export function getRetailCopy(locale: Locale) {
  return locale === "ar"
    ? {
        eyebrow: "متجر التجزئة", title: "متجر التجزئة", description: "تسوّق بأمان مع السعر والشحن والضريبة المؤكدة قبل الدفع.", unavailable: "الشراء المباشر غير متاح حاليًا.", cart: "السلة", checkout: "الدفع عبر PayPal", add: "أضف إلى السلة", emptyCart: "سلتك فارغة.", quote: "تأكيد السعر", subtotal: "المجموع الفرعي", shipping: "الشحن", tax: "الضريبة", total: "الإجمالي", address: "عنوان التسليم", terms: "أوافق على شروط البيع", termsLink: "شروط البيع", remove: "إزالة", decrease: "خفض الكمية", increase: "زيادة الكمية", orderReceived: "تم استلام طلبك.", checkoutExpired: "انتهت صلاحية سلة الدفع. يرجى المحاولة مرة أخرى.", paymentFailed: "تعذر إتمام الدفع.", checkoutFailed: "تعذر بدء الدفع.", required: "أكمل عنوان التسليم ووافق على الشروط للمتابعة.", orderDetails: "عرض تأكيد الطلب",
      }
    : {
        eyebrow: "Retail shop", title: "Retail shop", description: "Shop with confirmed pricing, shipping, and tax before you pay.", unavailable: "Direct checkout is not available yet.", cart: "Cart", checkout: "Pay with PayPal", add: "Add to cart", emptyCart: "Your cart is empty.", quote: "Confirm price", subtotal: "Subtotal", shipping: "Shipping", tax: "Tax", total: "Total", address: "Delivery address", terms: "I accept the terms of sale", termsLink: "Terms of sale", remove: "Remove", decrease: "Decrease quantity", increase: "Increase quantity", orderReceived: "Order received.", checkoutExpired: "Checkout expired. Please try again.", paymentFailed: "Payment could not be completed.", checkoutFailed: "Checkout could not start.", required: "Complete the delivery address and accept the terms to continue.", orderDetails: "View order confirmation",
      };
}
