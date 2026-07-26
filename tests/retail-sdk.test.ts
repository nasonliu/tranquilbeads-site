import { afterEach, describe, expect, it } from "vitest";

import { loadRetailPaypalSdk } from "@/src/components/retail-shop";

afterEach(() => { document.body.replaceChildren(); delete window.paypal; });

describe("retail PayPal SDK loader", () => {
  it("removes a failed script and permits a fresh retry", async () => {
    const first = loadRetailPaypalSdk("retry-client", "USD");
    const failed = document.querySelector("script")!;
    failed.dispatchEvent(new Event("error"));
    await expect(first).rejects.toThrow("paypal_sdk_failed");
    expect(document.querySelector("script")).toBeNull();
    const second = loadRetailPaypalSdk("retry-client", "USD");
    const replacement = document.querySelector("script")!;
    expect(replacement).not.toBe(failed);
    replacement.dispatchEvent(new Event("load"));
    await expect(second).resolves.toBeUndefined();
  });
});
