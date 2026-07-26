import type { WebhookProcessResult } from "./db";

export function webhookResponseStatus(result: WebhookProcessResult) {
  return result === "retry" ? 503 : 200;
}

export function classifyWebhookRow(status: string | undefined): WebhookProcessResult {
  if (status === "processed" || status === "ignored" || status === "rejected") return "duplicate";
  if (status === "ready") return "processed";
  return "retry";
}
