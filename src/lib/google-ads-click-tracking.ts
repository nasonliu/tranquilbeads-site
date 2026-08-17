export type TrackedDestination = "amazon" | "noon" | "whatsapp";

export type ClickAnchor = {
  href: string;
  target?: string | null;
};

export type ClickDescriptor = {
  button: number;
  detail: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  findClosestAnchor: () => ClickAnchor | null;
};

type RetailConversionConfig = {
  send_to: string;
  value: 1;
  currency: "USD";
};

type WhatsAppConversionConfig = {
  send_to: string;
};

export const googleAdsConversionConfig = {
  amazon: {
    send_to: "AW-18288748181/XzgJCIKpiMkcEJXN4JBE",
    value: 1,
    currency: "USD",
  },
  noon: {
    send_to: "AW-18288748181/U4LbCIWpiMkcEJXN4JBE",
    value: 1,
    currency: "USD",
  },
  whatsapp: {
    send_to: "AW-18288748181/20lzCNadhckcEJXN4JBE",
  },
} as const satisfies Record<
  TrackedDestination,
  RetailConversionConfig | WhatsAppConversionConfig
>;

export type GoogleAdsConversionParameters =
  | RetailConversionConfig
  | WhatsAppConversionConfig
  | (RetailConversionConfig & {
      event_timeout: 1000;
      event_callback: () => void;
    })
  | (WhatsAppConversionConfig & {
      event_timeout: 1000;
      event_callback: () => void;
    });

export type GoogleAdsGtag = (
  command: "event",
  eventName: "conversion",
  parameters: GoogleAdsConversionParameters,
) => void;

export type GoogleAdsDiagnostic =
  | {
      event: "retail_outbound_click";
      retail_platform: "amazon" | "noon";
      retail_url: string;
    }
  | {
      event: "whatsapp_contact_click";
      page_path: string;
      destination_protocol: string;
      destination_host: string;
    };

export type GoogleAdsClickDependencies = {
  baseUrl: string;
  pagePath: string;
  gtag?: GoogleAdsGtag;
  pushDiagnostic: (diagnostic: GoogleAdsDiagnostic) => void;
  navigate: (href: string) => void;
  setTimer: (callback: () => void, delay: number) => unknown;
  clearTimer: (handle: unknown) => void;
};

function isHostOrSubdomain(hostname: string, rootHostname: string): boolean {
  return hostname === rootHostname || hostname.endsWith(`.${rootHostname}`);
}

const OFFICIAL_AMAZON_STOREFRONT_ROOTS = [
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

function isOfficialAmazonStorefront(hostname: string): boolean {
  return OFFICIAL_AMAZON_STOREFRONT_ROOTS.some((rootHostname) =>
    isHostOrSubdomain(hostname, rootHostname),
  );
}

function parseUrl(href: string, baseUrl: string): URL | null {
  try {
    return new URL(href, baseUrl);
  } catch {
    return null;
  }
}

function classifyUrl(url: URL): TrackedDestination | null {
  const protocol = url.protocol.toLowerCase();
  const hostname = url.hostname.toLowerCase();

  if (protocol === "whatsapp:") {
    return "whatsapp";
  }

  if (protocol !== "http:" && protocol !== "https:") {
    return null;
  }

  if (
    isHostOrSubdomain(hostname, "whatsapp.com") ||
    isHostOrSubdomain(hostname, "wa.me")
  ) {
    return "whatsapp";
  }

  if (isHostOrSubdomain(hostname, "noon.com")) {
    return "noon";
  }

  if (
    isHostOrSubdomain(hostname, "amzn.to") ||
    isOfficialAmazonStorefront(hostname)
  ) {
    return "amazon";
  }

  return null;
}

export function classifyOutboundDestination(
  href: string,
  baseUrl: string,
): TrackedDestination | null {
  const url = parseUrl(href, baseUrl);
  return url ? classifyUrl(url) : null;
}

function buildDiagnostic(
  destination: TrackedDestination,
  url: URL,
  pagePath: string,
): GoogleAdsDiagnostic {
  if (destination === "whatsapp") {
    return {
      event: "whatsapp_contact_click",
      page_path: pagePath,
      destination_protocol: url.protocol,
      destination_host: url.hostname,
    };
  }

  return {
    event: "retail_outbound_click",
    retail_platform: destination,
    retail_url: url.href,
  };
}

function hasAlternateNavigationIntent(click: ClickDescriptor, anchor: ClickAnchor): boolean {
  const target = anchor.target?.trim().toLowerCase() ?? "";
  return (
    click.defaultPrevented ||
    click.metaKey ||
    click.ctrlKey ||
    click.shiftKey ||
    click.altKey ||
    (target !== "" && target !== "_self")
  );
}

export function coordinateGoogleAdsClick(
  click: ClickDescriptor,
  dependencies: GoogleAdsClickDependencies,
): boolean {
  if (click.button !== 0) {
    return false;
  }

  const anchor = click.findClosestAnchor();
  if (!anchor) {
    return false;
  }

  const url = parseUrl(anchor.href, dependencies.baseUrl);
  const destination = url ? classifyUrl(url) : null;
  if (!url || !destination) {
    return false;
  }
  const validatedHref = url.href;

  try {
    dependencies.pushDiagnostic(buildDiagnostic(destination, url, dependencies.pagePath));
  } catch {
    // Diagnostics are supplementary and must never affect the outbound click.
  }

  if (typeof dependencies.gtag !== "function") {
    return false;
  }

  const conversion = googleAdsConversionConfig[destination];
  if (hasAlternateNavigationIntent(click, anchor)) {
    try {
      dependencies.gtag("event", "conversion", conversion);
    } catch {
      return false;
    }
    return false;
  }

  let fallbackHandle: unknown;
  let fallbackArmed = true;
  let callbackRequested = false;
  let gtagReturnedSuccessfully = false;
  let navigationStarted = false;

  const navigateOnce = (clearFallback: boolean) => {
    if (!fallbackArmed || navigationStarted) {
      return;
    }
    fallbackArmed = false;
    navigationStarted = true;

    if (clearFallback) {
      try {
        dependencies.clearTimer(fallbackHandle);
      } catch {
        // A timer cleanup failure must not strand the visitor on the page.
      }
    }

    dependencies.navigate(validatedHref);
  };

  try {
    fallbackHandle = dependencies.setTimer(() => navigateOnce(false), 1200);
  } catch {
    try {
      dependencies.gtag("event", "conversion", conversion);
    } catch {
      // The browser's default navigation remains available.
    }
    return false;
  }

  try {
    dependencies.gtag("event", "conversion", {
      ...conversion,
      event_timeout: 1000,
      event_callback: () => {
        callbackRequested = true;
        if (gtagReturnedSuccessfully) {
          navigateOnce(true);
        }
      },
    });
  } catch {
    fallbackArmed = false;
    try {
      dependencies.clearTimer(fallbackHandle);
    } catch {
      // The click is not intercepted, so native navigation remains available.
    }
    return false;
  }

  gtagReturnedSuccessfully = true;
  if (callbackRequested) {
    navigateOnce(true);
  }

  return true;
}
