import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Manrope,
  Noto_Naskh_Arabic,
} from "next/font/google";

import "./globals.css";

const displayFont = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const arabicFont = Noto_Naskh_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://tranquilbeads.vercel.app",
  ),
  title: {
    default: "TranquilBeads | B2B Tasbih & Islamic Culture Products",
    template: "%s | TranquilBeads",
  },
  description:
    "Bilingual B2B showcase site for tasbih, Islamic gifts, and private-label culture products built for modern distributors.",
  openGraph: {
    title: "TranquilBeads",
    description:
      "Premium tasbih and Islamic culture products for wholesale buyers, distributors, and gifting partners.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TranquilBeads",
    description:
      "Premium tasbih and Islamic culture products for wholesale buyers and gifting partners.",
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
      className={`${displayFont.variable} ${bodyFont.variable} ${arabicFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
