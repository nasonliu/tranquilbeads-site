import type { OutreachTaskStatus } from "@/src/lib/outreach-types";

export type OutreachTransitionMode = "automatic" | "human";

const automaticTransitions: Record<OutreachTaskStatus, OutreachTaskStatus[]> = {
  draft: ["queued"],
  queued: ["sent", "failed"],
  sent: ["replied"],
  replied: ["needs_human_followup"],
  needs_human_followup: [],
  failed: [],
  closed: [],
};

const humanTransitions: Record<OutreachTaskStatus, OutreachTaskStatus[]> = {
  draft: [],
  queued: [],
  sent: ["closed"],
  replied: [],
  needs_human_followup: ["closed"],
  failed: ["queued"],
  closed: [],
};

export function canTransitionTaskStatus(
  from: OutreachTaskStatus,
  to: OutreachTaskStatus,
  mode: OutreachTransitionMode,
) {
  const transitions = mode === "automatic" ? automaticTransitions : humanTransitions;
  return transitions[from].includes(to);
}

export function assertCanTransitionTaskStatus(
  from: OutreachTaskStatus,
  to: OutreachTaskStatus,
  mode: OutreachTransitionMode,
) {
  if (!canTransitionTaskStatus(from, to, mode)) {
    const source = mode === "automatic" ? "automatically" : "manually";
    throw new Error(`Cannot ${source} transition outreach task status from ${from} to ${to}.`);
  }
}
