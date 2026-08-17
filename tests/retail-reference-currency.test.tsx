import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RetailReferenceCurrencyProvider, retailReferenceCurrencyStorageKey, useRetailReferenceCurrency } from "@/src/components/retail-reference-currency";
import {
  DEFAULT_REFERENCE_CURRENCY_SNAPSHOT,
  REFERENCE_RATE_SCALE,
  convertUsdMinorToReferenceMinor,
  formatCurrencyMinor,
  formatUsdReference,
  isReferenceCurrencySnapshot,
  type ReferenceCurrencySnapshot,
} from "@/src/lib/retail/reference-currency";

const snapshot: ReferenceCurrencySnapshot = {
  base: "USD",
  asOf: "2026-07-30T12:00:00.000Z",
  source: "test snapshot",
  version: "test-v1",
  rateMicros: { USD: REFERENCE_RATE_SCALE, AED: 3_672_500, SAR: 3_750_000, CNY: 7_250_000, EUR: 920_000, GBP: 790_000 },
};

afterEach(() => { window.localStorage.clear(); document.body.replaceChildren(); vi.unstubAllGlobals(); });

describe("retail reference currency", () => {
  it("uses fixed-point integer conversion and retains snapshot metadata", () => {
    expect(convertUsdMinorToReferenceMinor(100, "AED", snapshot)).toBe(367);
    expect(convertUsdMinorToReferenceMinor(1, "AED", snapshot)).toBe(4);
    expect(convertUsdMinorToReferenceMinor(-1, "AED", snapshot)).toBe(-4);
    expect(formatUsdReference(1234, "EUR", snapshot, "en")).toMatchObject({ currency: "EUR", minor: 1135, asOf: snapshot.asOf, source: "test snapshot", version: "test-v1" });
  });

  it("validates snapshots and falls back to USD-only conversion when no non-USD rate is supplied", () => {
    expect(isReferenceCurrencySnapshot(snapshot)).toBe(true);
    expect(isReferenceCurrencySnapshot({ ...snapshot, base: "EUR" })).toBe(false);
    expect(isReferenceCurrencySnapshot({ ...snapshot, rateMicros: { USD: 1 } })).toBe(false);
    expect(convertUsdMinorToReferenceMinor(1234, "AED", DEFAULT_REFERENCE_CURRENCY_SNAPSHOT)).toBeNull();
    expect(convertUsdMinorToReferenceMinor(1234, "USD", DEFAULT_REFERENCE_CURRENCY_SNAPSHOT)).toBe(1234);
  });

  it("formats currency with Intl without changing the underlying minor value", () => {
    expect(formatCurrencyMinor(1234, "USD", "en")).toContain("USD");
    expect(formatCurrencyMinor(1234, "USD", "en")).toContain("12.34");
    expect(formatCurrencyMinor(1234.5, "USD", "en")).toBe("—");
  });

  it("hydrates an allowlisted shared preference and persists only the selected currency", async () => {
    window.localStorage.setItem(retailReferenceCurrencyStorageKey, "AED");
    function Probe({ id }: { id: string }) {
      const value = useRetailReferenceCurrency();
      return <button type="button" onClick={() => value.setCurrency("GBP")}>{id}:{value.hydrated ? value.currency : "pending"}</button>;
    }
    render(<><RetailReferenceCurrencyProvider snapshot={snapshot}><Probe id="one" /></RetailReferenceCurrencyProvider><RetailReferenceCurrencyProvider snapshot={snapshot}><Probe id="two" /></RetailReferenceCurrencyProvider></>);
    expect(await screen.findByText("one:AED")).toBeInTheDocument();
    expect(screen.getByText("two:AED")).toBeInTheDocument();
    await act(async () => { screen.getByText("one:AED").click(); });
    expect(screen.getByText("one:GBP")).toBeInTheDocument();
    expect(screen.getByText("two:GBP")).toBeInTheDocument();
    expect(window.localStorage.getItem(retailReferenceCurrencyStorageKey)).toBe("GBP");
    expect(window.localStorage.length).toBe(1);
  });

  it("rejects malformed stored preferences after hydration", async () => {
    window.localStorage.setItem(retailReferenceCurrencyStorageKey, "JPY");
    function Probe() { const value = useRetailReferenceCurrency(); return <span>{value.hydrated ? value.currency : "pending"}</span>; }
    render(<RetailReferenceCurrencyProvider><Probe /></RetailReferenceCurrencyProvider>);
    expect(await screen.findByText("USD")).toBeInTheDocument();
  });

  it("refreshes display rates after render without blocking the initial provider", async () => {
    window.localStorage.setItem(retailReferenceCurrencyStorageKey, "AED");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, snapshot }), { status: 200 })));
    function Probe() { const value = useRetailReferenceCurrency(); return <span>{value.currency}:{value.snapshot.version}</span>; }
    render(<RetailReferenceCurrencyProvider refreshUrl="/api/retail/reference-currency"><Probe /></RetailReferenceCurrencyProvider>);
    expect(screen.getByText("AED:usd-only-v1")).toBeInTheDocument();
    expect(await screen.findByText("AED:test-v1")).toBeInTheDocument();
  });
});
