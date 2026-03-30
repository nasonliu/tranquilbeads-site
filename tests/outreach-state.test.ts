import { describe, expect, it } from "vitest";

import {
  assertCanTransitionTaskStatus,
  canTransitionTaskStatus,
} from "@/src/lib/outreach-state";
import type { OutreachTaskStatus } from "@/src/lib/outreach-types";

describe("outreach task state transitions", () => {
  it("allows expected automatic transitions", () => {
    expect(canTransitionTaskStatus("draft", "queued", "automatic")).toBe(true);
    expect(canTransitionTaskStatus("queued", "sent", "automatic")).toBe(true);
    expect(canTransitionTaskStatus("sent", "replied", "automatic")).toBe(true);
    expect(
      canTransitionTaskStatus("replied", "needs_human_followup", "automatic"),
    ).toBe(true);
  });

  it("allows expected human transitions", () => {
    expect(
      canTransitionTaskStatus("needs_human_followup", "closed", "human"),
    ).toBe(true);
    expect(canTransitionTaskStatus("failed", "queued", "human")).toBe(true);
    expect(canTransitionTaskStatus("sent", "closed", "human")).toBe(true);
  });

  it("rejects automatic second-touch style transitions", () => {
    const invalidAutomaticTransitions: Array<[OutreachTaskStatus, OutreachTaskStatus]> = [
      ["sent", "queued"],
      ["replied", "sent"],
      ["needs_human_followup", "sent"],
      ["failed", "sent"],
    ];

    for (const [from, to] of invalidAutomaticTransitions) {
      expect(canTransitionTaskStatus(from, to, "automatic")).toBe(false);
      expect(() => assertCanTransitionTaskStatus(from, to, "automatic")).toThrow(
        /cannot automatically transition/i,
      );
    }
  });
});
