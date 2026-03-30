import { NextResponse } from "next/server";

import { syncOutreachReplies } from "@/scripts/sync-outreach-replies";
import {
  assertOutreachWebhookAuthorized,
  parseWhatsAppWebhookRequest,
} from "@/src/lib/outreach-webhooks";

export async function POST(request: Request) {
  try {
    assertOutreachWebhookAuthorized(request);
    const reply = await parseWhatsAppWebhookRequest(request);
    const result = await syncOutreachReplies({
      replies: [reply],
      persist: true,
    });

    return NextResponse.json({
      ok: true,
      handoffItems: result.handoffItems.length,
      totalTasks: result.store.tasks.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    const status = /unauthorized/i.test(message) ? 401 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
