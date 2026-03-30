import type { Metadata } from "next";

import "./globals.css";

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
