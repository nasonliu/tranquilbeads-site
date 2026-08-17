import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  classifyOutboundDestination,
  coordinateGoogleAdsClick,
  googleAdsConversionConfig,
  type ClickAnchor,
  type ClickDescriptor,
  type GoogleAdsClickDependencies,
  type GoogleAdsConversionParameters,
} from "@/src/lib/google-ads-click-tracking";

const baseUrl = "https://www.tranquilbeads.com/en/contact";
const officialAmazonStorefrontRoots = [
  "amazon.ae",
  "amazon.ca",
  "amazon.cn",
  "amazon.co.jp",
  "amazon.co.uk",
  "amazon.co.za",
  "amazon.com",
  "amazon.com.au",
  "amazon.com.be",
  "amazon.com.br",
  "amazon.com.mx",
  "amazon.com.tr",
  "amazon.de",
  "amazon.eg",
  "amazon.es",
  "amazon.fr",
  "amazon.ie",
  "amazon.in",
  "amazon.it",
  "amazon.nl",
  "amazon.pl",
  "amazon.sa",
  "amazon.se",
  "amazon.sg",
] as const;

function makeClick(
  anchor: ClickAnchor | null,
  overrides: Partial<Omit<ClickDescriptor, "findClosestAnchor">> = {},
): ClickDescriptor {
  return {
    button: 0,
    detail: 1,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    findClosestAnchor: () => anchor,
    ...overrides,
  };
}

function makeDependencies(overrides: Partial<GoogleAdsClickDependencies> = {}) {
  const scheduled: Array<{ callback: () => void; delay: number; handle: object }> = [];
  const gtag = vi.fn();
  const pushDiagnostic = vi.fn();
  const navigate = vi.fn();
  const clearTimer = vi.fn();
  const setTimer = vi.fn((callback: () => void, delay: number) => {
    const handle = {};
    scheduled.push({ callback, delay, handle });
    return handle;
  });

  return {
    dependencies: {
      baseUrl,
      pagePath: "/en/contact",
      gtag,
      pushDiagnostic,
      navigate,
      setTimer,
      clearTimer,
      ...overrides,
    } satisfies GoogleAdsClickDependencies,
    scheduled,
    gtag,
    pushDiagnostic,
    navigate,
    setTimer,
    clearTimer,
  };
}

describe("classifyOutboundDestination", () => {
  it.each(officialAmazonStorefrontRoots)(
    "classifies the official Amazon storefront root and subdomains for %s",
    (rootHostname) => {
      expect(classifyOutboundDestination(`https://${rootHostname}/dp/ABC`, baseUrl)).toBe(
        "amazon",
      );
      expect(
        classifyOutboundDestination(`https://shop.${rootHostname}/dp/ABC`, baseUrl),
      ).toBe("amazon");
    },
  );

  it.each(["https://amzn.to/3abc", "https://go.amzn.to/3abc"])(
    "classifies the Amazon short-link root and subdomains for %s",
    (href) => {
      expect(classifyOutboundDestination(href, baseUrl)).toBe("amazon");
    },
  );

  it.each([
    "https://noon.com/",
    "https://noon.com/uae-en/product/p",
    "https://www.noon.com/saudi-en/product/p",
    "https://shop.noon.com/uae-en/product/p",
    "https://help.noon.com/article",
    "https://noon.com/uae-en/help",
    "https://noon.com/egypt-en/product/p",
    "https://deep.shop.noon.com/product/help",
  ])(
    "classifies Noon roots and dot-delimited subdomains regardless of path for %s",
    (href) => {
      expect(classifyOutboundDestination(href, baseUrl)).toBe("noon");
    },
  );

  it.each([
    ["https://whatsapp.com/channel/example", "whatsapp"],
    ["https://api.whatsapp.com/send?phone=447840890109", "whatsapp"],
    ["https://wa.me/447840890109?text=private", "whatsapp"],
    ["https://go.wa.me/447840890109", "whatsapp"],
    ["whatsapp://send?phone=447840890109&text=private", "whatsapp"],
  ])("classifies %s as %s", (href, expected) => {
    expect(classifyOutboundDestination(href, baseUrl)).toBe(expected);
  });

  it.each([
    "https://fakeamazon.com/product",
    "https://amazon.example.com/product",
    "https://amazon.com.evil.example/product",
    "https://fakeamazon.co.za/product",
    "https://amazon.co.za.evil.example/product",
    "https://shop.amazon.example.com/product",
    "https://amazon.com.evil/product",
    "https://amazon.co.nz.evil/product",
    "https://amazon.store.co.nz/product",
    "https://amazon.example/product",
    "https://amazon.invalid/product",
    "https://amazon.sucks/product",
    "https://amazon.zip/product",
    "https://shop.amazon.foo/product",
    "https://amazon.co.nz/product",
    "https://shop.amazon.co.nz/product",
    "https://fakenoon.com/product",
    "https://noon.com.evil.example/product",
    "https://fakewhatsapp.com/send",
    "https://whatsapp.com.evil.example/send",
    "https://fakewa.me/send",
    "https://wa.me.evil.example/send",
    "https://example.com/?next=https://wa.me/447840890109",
    "mailto:sales@example.com",
    "javascript:alert(1)",
    "not a valid absolute url",
  ])("rejects untracked or lookalike URL %s", (href) => {
    expect(classifyOutboundDestination(href, baseUrl)).toBeNull();
  });

  it("resolves relative URLs against the supplied base URL", () => {
    expect(classifyOutboundDestination("/uae-en/product/p", "https://www.noon.com/store")).toBe(
      "noon",
    );
    expect(classifyOutboundDestination("/products/tasbih", baseUrl)).toBeNull();
  });

  it("returns null when href or base URL cannot be parsed", () => {
    expect(classifyOutboundDestination("/relative", "not a base URL")).toBeNull();
    expect(classifyOutboundDestination("http://[invalid", baseUrl)).toBeNull();
  });

  it("does not ship the public-suffix parser as a production dependency", () => {
    const packageManifest = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    const packageLock = JSON.parse(
      readFileSync(path.join(process.cwd(), "package-lock.json"), "utf8"),
    ) as {
      packages: Record<string, { dependencies?: Record<string, string>; dev?: boolean }>;
    };

    expect(packageManifest.dependencies).not.toHaveProperty("tldts");
    expect(packageLock.packages[""].dependencies).not.toHaveProperty("tldts");
    expect(packageLock.packages["node_modules/tldts"].dev).toBe(true);
    expect(packageLock.packages["node_modules/tldts-core"].dev).toBe(true);
  });
});

describe("googleAdsConversionConfig", () => {
  it("uses the approved retail conversion values", () => {
    expect(googleAdsConversionConfig.amazon).toEqual({
      send_to: "AW-18288748181/XzgJCIKpiMkcEJXN4JBE",
      value: 1,
      currency: "USD",
    });
    expect(googleAdsConversionConfig.noon).toEqual({
      send_to: "AW-18288748181/U4LbCIWpiMkcEJXN4JBE",
      value: 1,
      currency: "USD",
    });
  });

  it("does not invent a value or currency for WhatsApp", () => {
    expect(googleAdsConversionConfig.whatsapp).toEqual({
      send_to: "AW-18288748181/20lzCNadhckcEJXN4JBE",
    });
    expect(googleAdsConversionConfig.whatsapp).not.toHaveProperty("value");
    expect(googleAdsConversionConfig.whatsapp).not.toHaveProperty("currency");
  });
});

describe("coordinateGoogleAdsClick", () => {
  it("finds a tracked anchor through the injected closest-anchor resolver", () => {
    const { dependencies, gtag } = makeDependencies();
    const findClosestAnchor = vi.fn(() => ({
      href: "https://amzn.to/product",
      target: "_blank",
    }));

    const shouldIntercept = coordinateGoogleAdsClick(
      { ...makeClick(null), findClosestAnchor },
      dependencies,
    );

    expect(findClosestAnchor).toHaveBeenCalledOnce();
    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: "AW-18288748181/XzgJCIKpiMkcEJXN4JBE",
      value: 1,
      currency: "USD",
    });
    expect(shouldIntercept).toBe(false);
  });

  it.each([
    ["amazon", "https://www.amazon.ae/dp/ABC", {
      event: "retail_outbound_click",
      retail_platform: "amazon",
      retail_url: "https://www.amazon.ae/dp/ABC",
    }],
    ["noon", "https://www.noon.com/uae-en/product/p?o=123", {
      event: "retail_outbound_click",
      retail_platform: "noon",
      retail_url: "https://www.noon.com/uae-en/product/p?o=123",
    }],
  ])("pushes the exact %s retail diagnostic payload", (_platform, href, diagnostic) => {
    const { dependencies, pushDiagnostic } = makeDependencies();

    coordinateGoogleAdsClick(makeClick({ href, target: "_blank" }), dependencies);

    expect(pushDiagnostic).toHaveBeenCalledWith(diagnostic);
  });

  it("keeps WhatsApp diagnostics free of query, fragment, and prefilled message data", () => {
    const { dependencies, pushDiagnostic } = makeDependencies();
    const href =
      "https://api.whatsapp.com/send?phone=447840890109&text=private-message#private-fragment";

    coordinateGoogleAdsClick(makeClick({ href, target: "_blank" }), dependencies);

    expect(pushDiagnostic).toHaveBeenCalledWith({
      event: "whatsapp_contact_click",
      page_path: "/en/contact",
      destination_protocol: "https:",
      destination_host: "api.whatsapp.com",
    });
    const serialized = JSON.stringify(pushDiagnostic.mock.calls[0][0]);
    expect(serialized).not.toContain("phone");
    expect(serialized).not.toContain("private-message");
    expect(serialized).not.toContain("private-fragment");
  });

  it("reports only the parsed protocol and host for a whatsapp URI", () => {
    const { dependencies, pushDiagnostic } = makeDependencies();

    coordinateGoogleAdsClick(
      makeClick({ href: "whatsapp://send?text=private", target: "_blank" }),
      dependencies,
    );

    expect(pushDiagnostic).toHaveBeenCalledWith({
      event: "whatsapp_contact_click",
      page_path: "/en/contact",
      destination_protocol: "whatsapp:",
      destination_host: "send",
    });
    expect(JSON.stringify(pushDiagnostic.mock.calls[0][0])).not.toContain("private");
  });

  it("intercepts an ordinary same-tab click until callback navigation", () => {
    const { dependencies, gtag, setTimer, clearTimer, navigate, scheduled } =
      makeDependencies();
    const href = "https://wa.me/447840890109?text=hello";

    const shouldIntercept = coordinateGoogleAdsClick(makeClick({ href }), dependencies);

    expect(shouldIntercept).toBe(true);
    expect(setTimer).toHaveBeenCalledWith(expect.any(Function), 1200);
    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: "AW-18288748181/20lzCNadhckcEJXN4JBE",
      event_timeout: 1000,
      event_callback: expect.any(Function),
    });

    const conversionPayload = gtag.mock.calls[0][2];
    conversionPayload.event_callback();
    expect(clearTimer).toHaveBeenCalledWith(scheduled[0].handle);
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(href);

    scheduled[0].callback();
    conversionPayload.event_callback();
    expect(navigate).toHaveBeenCalledOnce();
  });

  it("uses the 1200ms fallback when the conversion callback does not arrive", () => {
    const { dependencies, navigate, scheduled } = makeDependencies();
    const href = "https://www.noon.com/uae-en/product/p";

    const shouldIntercept = coordinateGoogleAdsClick(makeClick({ href }), dependencies);
    scheduled[0].callback();

    expect(shouldIntercept).toBe(true);
    expect(scheduled[0].delay).toBe(1200);
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(href);
  });

  it.each(["callback", "fallback"] as const)(
    "navigates to the validated URL snapshot through the %s path",
    (navigationPath) => {
      const { dependencies, gtag, navigate, scheduled } = makeDependencies();
      const originalHref = "https://wa.me/447840890109?text=original";
      const anchor = { href: originalHref };

      const shouldIntercept = coordinateGoogleAdsClick(makeClick(anchor), dependencies);
      anchor.href = "https://evil.example/phishing";

      if (navigationPath === "callback") {
        gtag.mock.calls[0][2].event_callback();
      } else {
        scheduled[0].callback();
      }

      expect(shouldIntercept).toBe(true);
      expect(navigate).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledWith(originalHref);
    },
  );

  it("handles a synchronous gtag callback and disarms the fallback", () => {
    const gtag = vi.fn(
      (
        _command: "event",
        _eventName: "conversion",
        parameters: GoogleAdsConversionParameters,
      ) => {
        if ("event_callback" in parameters) {
          parameters.event_callback();
        }
      },
    );
    const { dependencies, navigate, scheduled } = makeDependencies({ gtag });

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109" }),
      dependencies,
    );

    expect(shouldIntercept).toBe(true);
    expect(navigate).toHaveBeenCalledOnce();
    scheduled[0].callback();
    expect(navigate).toHaveBeenCalledOnce();
  });

  it("does not honor a synchronous callback when gtag then throws", () => {
    const gtag = vi.fn(
      (
        _command: "event",
        _eventName: "conversion",
        parameters: GoogleAdsConversionParameters,
      ) => {
        if ("event_callback" in parameters) {
          parameters.event_callback();
        }
        throw new Error("gtag threw after callback");
      },
    );
    const { dependencies, navigate, scheduled } = makeDependencies({ gtag });

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109" }),
      dependencies,
    );

    expect(shouldIntercept).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    scheduled[0].callback();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("supports keyboard-generated click events", () => {
    const { dependencies, gtag } = makeDependencies();

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109" }, { detail: 0 }),
      dependencies,
    );

    expect(gtag).toHaveBeenCalledOnce();
    expect(shouldIntercept).toBe(true);
  });

  it("rejects a non-primary button even when detail is zero", () => {
    const { dependencies, gtag, pushDiagnostic, setTimer } = makeDependencies();

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109" }, { button: 1, detail: 0 }),
      dependencies,
    );

    expect(gtag).not.toHaveBeenCalled();
    expect(pushDiagnostic).not.toHaveBeenCalled();
    expect(setTimer).not.toHaveBeenCalled();
    expect(shouldIntercept).toBe(false);
  });

  it.each([
    ["new target", { target: "_blank" }, {}],
    ["named target", { target: "whatsapp-chat" }, {}],
    ["meta modifier", {}, { metaKey: true }],
    ["control modifier", {}, { ctrlKey: true }],
    ["shift modifier", {}, { shiftKey: true }],
    ["alt modifier", {}, { altKey: true }],
    ["already prevented", {}, { defaultPrevented: true }],
  ])("queues conversion without intercepting for %s", (_name, anchorOverrides, clickOverrides) => {
    const { dependencies, gtag, setTimer, navigate } = makeDependencies();

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick(
        { href: "https://wa.me/447840890109", ...anchorOverrides },
        clickOverrides,
      ),
      dependencies,
    );

    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: "AW-18288748181/20lzCNadhckcEJXN4JBE",
    });
    expect(setTimer).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(shouldIntercept).toBe(false);
  });

  it("treats an explicit _self target as same-tab navigation", () => {
    const { dependencies, gtag, setTimer } = makeDependencies();

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109", target: "_self" }),
      dependencies,
    );

    expect(gtag).toHaveBeenCalledWith(
      "event",
      "conversion",
      expect.objectContaining({ event_callback: expect.any(Function) }),
    );
    expect(setTimer).toHaveBeenCalledWith(expect.any(Function), 1200);
    expect(shouldIntercept).toBe(true);
  });

  it("never intercepts when gtag is missing", () => {
    const { dependencies, setTimer, navigate } = makeDependencies({ gtag: undefined });

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109" }),
      dependencies,
    );

    expect(setTimer).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(shouldIntercept).toBe(false);
  });

  it("clears its fallback and never intercepts when gtag throws", () => {
    const gtag = vi.fn(() => {
      throw new Error("gtag unavailable");
    });
    const { dependencies, setTimer, clearTimer, navigate, scheduled } = makeDependencies({ gtag });

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109" }),
      dependencies,
    );

    expect(setTimer).toHaveBeenCalledWith(expect.any(Function), 1200);
    expect(clearTimer).toHaveBeenCalledWith(scheduled[0].handle);
    expect(navigate).not.toHaveBeenCalled();
    expect(shouldIntercept).toBe(false);
  });

  it("disarms the fallback when both gtag and clearTimer throw", () => {
    const gtag = vi.fn(() => {
      throw new Error("gtag unavailable");
    });
    const clearTimer = vi.fn(() => {
      throw new Error("timer cleanup unavailable");
    });
    const { dependencies, navigate, scheduled } = makeDependencies({ gtag, clearTimer });

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109" }),
      dependencies,
    );
    scheduled[0].callback();

    expect(shouldIntercept).toBe(false);
    expect(clearTimer).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("queues a conversion without intercepting when setTimer throws", () => {
    const setTimer = vi.fn(() => {
      throw new Error("timer unavailable");
    });
    const gtag = vi.fn();
    const { dependencies, navigate } = makeDependencies({ setTimer, gtag });

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109" }),
      dependencies,
    );

    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: "AW-18288748181/20lzCNadhckcEJXN4JBE",
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(shouldIntercept).toBe(false);
  });

  it("does not throw or intercept when setTimer and gtag both throw", () => {
    const setTimer = vi.fn(() => {
      throw new Error("timer unavailable");
    });
    const gtag = vi.fn(() => {
      throw new Error("gtag unavailable");
    });
    const { dependencies, navigate } = makeDependencies({ setTimer, gtag });

    let shouldIntercept: boolean | undefined;
    expect(() => {
      shouldIntercept = coordinateGoogleAdsClick(
        makeClick({ href: "https://wa.me/447840890109" }),
        dependencies,
      );
    }).not.toThrow();
    expect(gtag).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    expect(shouldIntercept).toBe(false);
  });

  it("navigates once when clearTimer throws in a successful callback", () => {
    const clearTimer = vi.fn(() => {
      throw new Error("timer cleanup unavailable");
    });
    const { dependencies, gtag, navigate, scheduled } = makeDependencies({ clearTimer });

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109" }),
      dependencies,
    );
    const conversionPayload = gtag.mock.calls[0][2];

    expect(() => conversionPayload.event_callback()).not.toThrow();
    expect(shouldIntercept).toBe(true);
    expect(navigate).toHaveBeenCalledOnce();
    scheduled[0].callback();
    expect(navigate).toHaveBeenCalledOnce();
  });

  it("ignores a late conversion callback after fallback navigation", () => {
    const { dependencies, gtag, navigate, scheduled } = makeDependencies();

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109" }),
      dependencies,
    );
    const conversionPayload = gtag.mock.calls[0][2];
    scheduled[0].callback();
    conversionPayload.event_callback();

    expect(shouldIntercept).toBe(true);
    expect(navigate).toHaveBeenCalledOnce();
  });

  it("continues conversion coordination when diagnostic reporting throws", () => {
    const pushDiagnostic = vi.fn(() => {
      throw new Error("diagnostic storage unavailable");
    });
    const { dependencies, gtag } = makeDependencies({ pushDiagnostic });

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109", target: "_blank" }),
      dependencies,
    );

    expect(gtag).toHaveBeenCalledOnce();
    expect(shouldIntercept).toBe(false);
  });

  it("still intercepts same-tab navigation when diagnostic reporting throws", () => {
    const pushDiagnostic = vi.fn(() => {
      throw new Error("diagnostic storage unavailable");
    });
    const { dependencies, gtag, setTimer } = makeDependencies({ pushDiagnostic });

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109" }),
      dependencies,
    );

    expect(gtag).toHaveBeenCalledOnce();
    expect(setTimer).toHaveBeenCalledWith(expect.any(Function), 1200);
    expect(shouldIntercept).toBe(true);
  });

  it("does nothing for non-primary pointer clicks", () => {
    const { dependencies, gtag, pushDiagnostic, setTimer } = makeDependencies();

    const shouldIntercept = coordinateGoogleAdsClick(
      makeClick({ href: "https://wa.me/447840890109" }, { button: 1, detail: 1 }),
      dependencies,
    );

    expect(gtag).not.toHaveBeenCalled();
    expect(pushDiagnostic).not.toHaveBeenCalled();
    expect(setTimer).not.toHaveBeenCalled();
    expect(shouldIntercept).toBe(false);
  });

  it("does nothing when no tracked anchor is found", () => {
    const { dependencies, gtag, pushDiagnostic, setTimer } = makeDependencies();

    expect(coordinateGoogleAdsClick(makeClick(null), dependencies)).toBe(false);
    expect(
      coordinateGoogleAdsClick(makeClick({ href: "https://example.com" }), dependencies),
    ).toBe(false);
    expect(gtag).not.toHaveBeenCalled();
    expect(pushDiagnostic).not.toHaveBeenCalled();
    expect(setTimer).not.toHaveBeenCalled();
  });
});
