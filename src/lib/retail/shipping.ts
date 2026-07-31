const YUNEXPRESS_TRACKING = /^YT[0-9A-Z-]{6,40}$/i;

/** Returns only known first-party carrier tracking destinations. */
export function retailTrackingUrl(carrier: string | null | undefined, trackingNumber: string | null | undefined) {
  const tracking = trackingNumber?.trim();
  if (!tracking) return null;
  const normalizedCarrier = carrier?.trim().toLowerCase() ?? "";
  if (normalizedCarrier.includes("yunexpress") || normalizedCarrier.includes("云途") || YUNEXPRESS_TRACKING.test(tracking)) {
    return "https://www.yuntrack.com/parcelTracking";
  }
  return null;
}
