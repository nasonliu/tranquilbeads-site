"use client";

import { useEffect } from "react";

import {
  coordinateGoogleAdsClick,
  type GoogleAdsGtag,
} from "@/src/lib/google-ads-click-tracking";

type GoogleAdsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: GoogleAdsGtag;
};

export function GoogleAdsClickTracker() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const googleAdsWindow = window as GoogleAdsWindow;

      const shouldPreventDefault = coordinateGoogleAdsClick(
        {
          button: event.button,
          detail: event.detail,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          defaultPrevented: event.defaultPrevented,
          findClosestAnchor: () => {
            const anchor = target.closest<HTMLAnchorElement>("a[href]");
            return anchor
              ? {
                  href: anchor.href,
                  target: anchor.getAttribute("target"),
                }
              : null;
          },
        },
        {
          baseUrl: window.location.href,
          pagePath: window.location.pathname,
          gtag: typeof googleAdsWindow.gtag === "function" ? googleAdsWindow.gtag : undefined,
          pushDiagnostic: (diagnostic) => {
            googleAdsWindow.dataLayer = googleAdsWindow.dataLayer || [];
            googleAdsWindow.dataLayer.push(diagnostic);
          },
          navigate: (href) => window.location.assign(href),
          setTimer: (callback, delay) => window.setTimeout(callback, delay),
          clearTimer: (handle) => window.clearTimeout(handle as number),
        },
      );

      if (shouldPreventDefault) {
        event.preventDefault();
      }
    };

    document.addEventListener("click", handleClick, false);
    return () => document.removeEventListener("click", handleClick, false);
  }, []);

  return null;
}
