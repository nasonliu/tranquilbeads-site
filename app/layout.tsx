import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.tranquilbeads.com",
  ),
  title: {
    default: "TranquilBeads | Wholesale Tasbih, Misbaha & Prayer Beads Supplier",
    template: "%s | TranquilBeads",
  },
  description:
    "Wholesale tasbih, misbaha, tasbeeh and prayer beads supplier for boutiques, distributors, museum shops, and Ramadan or Eid gifting programs. MOQ 100 pcs with private-label packaging.",
  keywords: [
    "wholesale tasbih",
    "tasbih supplier",
    "misbaha wholesale",
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
      "Premium tasbih, misbaha and Islamic prayer beads for wholesale buyers, distributors, and gifting partners.",
    type: "website",
    images: [
      {
        url: "/images/real-products/natural-kuka-wood/hero.jpeg",
        width: 1200,
        height: 900,
        alt: "Natural Kuka Wood Tasbih wholesale product photo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TranquilBeads",
    description:
      "Premium tasbih, misbaha and Islamic prayer beads for wholesale buyers and gifting partners.",
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
      style={
        {
          "--font-display": "\"Iowan Old Style\", \"Palatino Linotype\", \"Book Antiqua\", Georgia, serif",
          "--font-body": "\"Avenir Next\", Avenir, \"Segoe UI\", sans-serif",
          "--font-arabic": "\"Geeza Pro\", \"Noto Naskh Arabic\", \"Times New Roman\", serif",
        } as React.CSSProperties
      }
    >
      <body>{children}</body>
    </html>
  );
}
