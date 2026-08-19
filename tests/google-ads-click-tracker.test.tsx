"use client";

import { readFileSync } from "node:fs";
import path from "node:path";

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleAdsClickTracker } from "@/src/components/google-ads-click-tracker";
import { coordinateGoogleAdsClick } from "@/src/lib/google-ads-click-tracking";

vi.mock("@/src/lib/google-ads-click-tracking", () => ({
  coordinateGoogleAdsClick: vi.fn(),
}));

const coordinateClick = vi.mocked(coordinateGoogleAdsClick);

describe("GoogleAdsClickTracker", () => {
  beforeEach(() => {
    coordinateClick.mockReset();
    coordinateClick.mockReturnValue(true);
    window.history.replaceState({}, "", "/en/contact?source=test");
    window.gtag = vi.fn();
    delete window.dataLayer;
  });

  afterEach(() => {
    delete window.gtag;
    delete window.dataLayer;
    vi.restoreAllMocks();
  });

  it("adapts nested primary and keyboard clicks to the pure coordinator", () => {
    render(
      <>
        <GoogleAdsClickTracker />
        <a href="https://wa.me/447840890109?text=private" target="_blank">
          <span data-testid="nested-target">WhatsApp</span>
        </a>
      </>,
    );

    const nestedTarget = screen.getByTestId("nested-target");
    fireEvent.click(nestedTarget, {
      button: 0,
      detail: 1,
      metaKey: true,
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
    });
    fireEvent.click(nestedTarget, { button: 0, detail: 0 });

    expect(coordinateClick).toHaveBeenCalledTimes(2);
    const [pointerClick, pointerDependencies] = coordinateClick.mock.calls[0];
    expect(pointerClick).toMatchObject({
      button: 0,
      detail: 1,
      metaKey: true,
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      defaultPrevented: false,
    });
    expect(pointerClick.findClosestAnchor()).toEqual({
      href: "https://wa.me/447840890109?text=private",
      target: "_blank",
    });
    expect(pointerDependencies).toMatchObject({
      baseUrl: "http://localhost:3000/en/contact?source=test",
      pagePath: "/en/contact",
      gtag: window.gtag,
      pushDiagnostic: expect.any(Function),
      navigate: expect.any(Function),
      setTimer: expect.any(Function),
      clearTimer: expect.any(Function),
    });

    const [keyboardClick] = coordinateClick.mock.calls[1];
    expect(keyboardClick).toMatchObject({ button: 0, detail: 0 });
  });

  it("initializes dataLayer inside the diagnostic adapter", () => {
    render(
      <>
        <GoogleAdsClickTracker />
        <a href="#whatsapp">WhatsApp</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "WhatsApp" }));
    expect(window.dataLayer).toBeUndefined();

    const dependencies = coordinateClick.mock.calls[0][1];
    const diagnostic = {
      event: "whatsapp_contact_click" as const,
      page_path: "/en/contact",
      destination_protocol: "https:",
      destination_host: "wa.me",
    };
    dependencies.pushDiagnostic(diagnostic);

    expect(window.dataLayer).toEqual([diagnostic]);
  });

  it("omits non-function gtag values from the coordinator dependencies", () => {
    Object.defineProperty(window, "gtag", {
      configurable: true,
      writable: true,
      value: "not-a-function",
    });
    render(
      <>
        <GoogleAdsClickTracker />
        <a href="#whatsapp">WhatsApp</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "WhatsApp" }));

    expect(coordinateClick.mock.calls[0][1].gtag).toBeUndefined();
  });

  it("omits a missing gtag from the coordinator dependencies", () => {
    delete window.gtag;
    render(
      <>
        <GoogleAdsClickTracker />
        <a href="#whatsapp">WhatsApp</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "WhatsApp" }));

    expect(coordinateClick.mock.calls[0][1].gtag).toBeUndefined();
  });

  it("maps navigation and timer dependencies to the same window", () => {
    const callback = vi.fn();
    const setTimeout = vi.spyOn(window, "setTimeout");
    const clearTimeout = vi.spyOn(window, "clearTimeout");
    const open = vi.spyOn(window, "open");
    render(
      <>
        <GoogleAdsClickTracker />
        <a href="#whatsapp">WhatsApp</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "WhatsApp" }));
    const dependencies = coordinateClick.mock.calls[0][1];

    const timerHandle = dependencies.setTimer(callback, 1200);
    dependencies.clearTimer(timerHandle);
    dependencies.navigate("#tracked");

    expect(setTimeout).toHaveBeenCalledWith(callback, 1200);
    expect(setTimeout).toHaveReturnedWith(timerHandle);
    expect(clearTimeout).toHaveBeenCalledWith(timerHandle);
    expect(window.location.href).toBe(
      "http://localhost:3000/en/contact?source=test#tracked",
    );
    expect(open).not.toHaveBeenCalled();
  });

  it("prevents default only when the coordinator requests interception", () => {
    render(
      <>
        <GoogleAdsClickTracker />
        <a href="#whatsapp">WhatsApp</a>
      </>,
    );
    const anchor = screen.getByRole("link", { name: "WhatsApp" });

    coordinateClick.mockReturnValueOnce(false).mockReturnValueOnce(true);
    const nativeClick = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    const nativePreventDefault = vi.spyOn(nativeClick, "preventDefault");
    anchor.dispatchEvent(nativeClick);

    const interceptedClick = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    const interceptedPreventDefault = vi.spyOn(interceptedClick, "preventDefault");
    anchor.dispatchEvent(interceptedClick);

    expect(nativePreventDefault).not.toHaveBeenCalled();
    expect(interceptedPreventDefault).toHaveBeenCalledOnce();
  });

  it("observes target-handler prevention without preventing again", () => {
    coordinateClick.mockReturnValue(false);
    render(
      <>
        <GoogleAdsClickTracker />
        <a
          href="https://wa.me/447840890109"
          onClick={(event) => event.preventDefault()}
        >
          WhatsApp
        </a>
      </>,
    );
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    const preventDefault = vi.spyOn(event, "preventDefault");

    screen.getByRole("link", { name: "WhatsApp" }).dispatchEvent(event);

    expect(coordinateClick.mock.calls[0][0].defaultPrevented).toBe(true);
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it("ignores click events whose target is not an Element", () => {
    render(<GoogleAdsClickTracker />);

    document.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(coordinateClick).not.toHaveBeenCalled();
  });

  it("installs one bubble listener and removes it on unmount", () => {
    const addEventListener = vi.spyOn(document, "addEventListener");
    const removeEventListener = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<GoogleAdsClickTracker />);
    const clickRegistrations = addEventListener.mock.calls.filter(
      ([type]) => type === "click",
    );
    const clickRegistration = clickRegistrations[0];

    expect(clickRegistrations).toHaveLength(1);
    expect(clickRegistration).toBeDefined();
    expect(clickRegistration?.[2]).toBe(false);
    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "click",
      clickRegistration?.[1],
      false,
    );

    document.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(coordinateClick).not.toHaveBeenCalled();
  });
});

describe("root Google Ads integration", () => {
  it("keeps the legacy direct tag disabled when the production GTM container owns global tracking", () => {
    const layoutSource = readFileSync(path.join(process.cwd(), "app/layout.tsx"), "utf8");

    expect(layoutSource).toContain("@next/third-parties/google");
    expect(layoutSource).toContain("GoogleTagManager");
    expect(layoutSource).toContain('process.env.NEXT_PUBLIC_GTM_ID || "GTM-M9JCZKFC"');
    expect(layoutSource.match(/<GoogleTagManager gtmId=\{gtmId\}\s*\/>/g)).toHaveLength(1);
    expect(layoutSource).not.toContain("<GoogleAdsClickTracker />");
    expect(layoutSource).not.toContain("googleAdsInitScript");
    expect(layoutSource).not.toContain("googletagmanager.com/gtm.js");
    expect(layoutSource).not.toContain("outboundRetailConversionScript");
    expect(layoutSource).not.toContain("document.addEventListener");
    expect(layoutSource).not.toContain("gtag/js?id=");
  });
});
