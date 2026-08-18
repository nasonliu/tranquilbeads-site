import type { Metadata } from "next";
import { GoogleTagManager } from "@next/third-parties/google";

import "./globals.css";
import "./maison.css";

const gtmId = process.env.NEXT_PUBLIC_GTM_ID || "GTM-M9JCZKFC";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.tranquilbeads.com",
  ),
  title: {
    default: "TranquilBeads | Premium Tasbih, Misbaha & Prayer Beads",
    template: "%s | TranquilBeads",
  },
  description:
    "Shop premium tasbih, misbaha and prayer beads in amber, stone and kuka wood, chosen for daily reflection and meaningful gifting.",
  keywords: [
    "premium tasbih",
    "tasbih gift",
    "misbaha prayer beads",
    "tasbeeh prayer beads",
    "Islamic prayer beads",
    "33 beads tasbih",
    "99 beads tasbih",
    "gift box tasbih",
    "Ramadan gift for men",
    "Eid gift for men",
    "kuka wood tasbih",
    "aqeeq agate tasbih",
    "amber tasbih certificate",
    "tesbih tespih",
    "Gebetskette",
    "Kehribar Bernstein",
  ],
  openGraph: {
    title: "TranquilBeads",
    description:
      "Premium tasbih, misbaha and Islamic prayer beads for meaningful daily rituals and thoughtful gifting.",
    type: "website",
    images: [
      {
        url: "/images/real-products/natural-kuka-wood/hero.jpeg",
        width: 1200,
        height: 900,
        alt: "Natural Kuka wood tasbih in a gift box",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TranquilBeads",
    description:
      "Premium tasbih, misbaha and Islamic prayer beads for meaningful daily rituals and thoughtful gifting.",
    images: ["/images/real-products/natural-kuka-wood/hero.jpeg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      style={
        {
          "--font-display": "\"Iowan Old Style\", \"Palatino Linotype\", \"Book Antiqua\", Georgia, serif",
          "--font-body": "\"Avenir Next\", Avenir, \"Segoe UI\", sans-serif",
          "--font-arabic": "\"Geeza Pro\", \"Noto Naskh Arabic\", \"Times New Roman\", serif",
        } as React.CSSProperties
      }
    >
      <GoogleTagManager gtmId={gtmId} />
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
