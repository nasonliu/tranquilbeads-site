import type { Metadata } from "next";
import { GoogleTagManager } from "@next/third-parties/google";
import Script from "next/script";

import "./globals.css";

const gtmId = process.env.NEXT_PUBLIC_GTM_ID || "GTM-M9JCZKFC";
const googleAdsId = "AW-18288748181";

const outboundRetailConversionScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${googleAdsId}');

(function () {
  var conversionLabels = {
    amazon: '${googleAdsId}/XzgJCIKpiMkcEJXN4JBE',
    noon: '${googleAdsId}/U4LbCIWpiMkcEJXN4JBE'
  };

  function detectRetailPlatform(url) {
    var hostname = url.hostname.toLowerCase();
    if (hostname === 'amzn.to' || /(^|\\.)amazon\\./.test(hostname)) {
      return 'amazon';
    }
    if (hostname === 'noon.com' || hostname.endsWith('.noon.com')) {
      return 'noon';
    }
    return null;
  }

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;

    var url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (error) {
      return;
    }

    var platform = detectRetailPlatform(url);
    if (!platform || typeof gtag !== 'function') return;

    window.dataLayer.push({
      event: 'retail_outbound_click',
      retail_platform: platform,
      retail_url: url.href
    });

    var sendTo = conversionLabels[platform];
    var opensElsewhere = link.target && link.target.toLowerCase() !== '_self';

    if (opensElsewhere || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      gtag('event', 'conversion', {
        send_to: sendTo,
        value: 1.0,
        currency: 'USD'
      });
      return;
    }

    event.preventDefault();
    var didNavigate = false;
    var navigate = function () {
      if (didNavigate) return;
      didNavigate = true;
      window.location.href = link.href;
    };

    gtag('event', 'conversion', {
      send_to: sendTo,
      value: 1.0,
      currency: 'USD',
      event_callback: navigate,
      event_timeout: 1000
    });
    window.setTimeout(navigate, 1200);
  }, true);
})();
`;

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
      <GoogleTagManager gtmId={gtmId} />
      <body>
        {children}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
          strategy="afterInteractive"
        />
        <Script
          id="google-ads-retail-outbound-conversions"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: outboundRetailConversionScript }}
        />
      </body>
    </html>
  );
}
