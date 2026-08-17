import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/src/lib/i18n";

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ result?: string | string[] }> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "zh") notFound();
  const search = await searchParams;
  const confirmed = search.result === "confirmed";
  const ar = locale === "ar";
  return <main className="noor-container py-12" dir={ar ? "rtl" : undefined}>
    <section className="noor-panel mx-auto max-w-xl rounded-[1.75rem] p-8">
      <h1 className="noor-title text-3xl">{confirmed ? (ar ? "تم تأكيد اشتراكك" : "Subscription confirmed") : (ar ? "تعذر تأكيد الاشتراك" : "We could not confirm this link")}</h1>
      <p className="mt-4 text-muted">{confirmed
        ? (ar ? "ستصلك الآن عروض TranquilBeads والمنتجات الجديدة من حين لآخر. يمكنك إلغاء الاشتراك في أي وقت." : "You can now receive occasional TranquilBeads offers and new-product updates. You can unsubscribe at any time.")
        : (ar ? "قد يكون الرابط منتهي الصلاحية أو مستخدماً بالفعل. يمكنك إدخال بريدك مرة أخرى في صفحة المتجر لطلب رابط جديد." : "The link may have expired or already been used. Enter your email again on the shop page to request a new link.")}</p>
      <Link className="mt-6 inline-block text-accent-deep underline" href={`/${locale}/shop`}>{ar ? "العودة إلى المتجر" : "Return to the shop"}</Link>
    </section>
  </main>;
}
