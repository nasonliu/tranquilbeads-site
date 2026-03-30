import { NextResponse } from "next/server";

import { syncOutreachReplies } from "@/scripts/sync-outreach-replies";
import { maybeForwardInboundEmailReply } from "@/src/lib/email-inbound-forwarding";
import {
  assertOutreachWebhookAuthorized,
  parseEmailWebhookRequest,
} from "@/src/lib/outreach-webhooks";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    assertOutreachWebhookAuthorized(request, {
      rawBody,
      resendSigningSecret: process.env.OUTREACH_RESEND_WEBHOOK_SECRET,
    });
    const reply = await parseEmailWebhookRequest(rawBody, {
      resendApiKey: process.env.OUTREACH_RESEND_API_KEY,
      fetchImpl: fetch,
    });
    const result = await syncOutreachReplies({
      replies: [reply],
      persist: true,
    });
    await maybeForwardInboundEmailReply({
      reply,
      env: process.env,
      fetchImpl: fetch,
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
