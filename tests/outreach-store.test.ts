import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import type {
  OutreachCampaign,
  OutreachEvent,
  OutreachLead,
  OutreachStore,
  SuppressionEntry,
  OutreachTask,
  OutreachTemplate,
} from "@/src/lib/outreach-types";
import {
  createEmptyOutreachStore,
  readOutreachStore,
  writeOutreachStore,
} from "@/src/lib/outreach-store";

async function createOutreachFixture() {
  const dir = await mkdtemp(join(tmpdir(), "tranquilbeads-outreach-"));
  const store: OutreachStore = {
    leads: [],
    campaigns: [],
    tasks: [],
    events: [],
    templates: [],
    suppressions: [],
  };

  await writeFile(join(dir, "leads.json"), JSON.stringify(store.leads, null, 2), "utf8");
  await writeFile(join(dir, "campaigns.json"), JSON.stringify(store.campaigns, null, 2), "utf8");
  await writeFile(join(dir, "tasks.json"), JSON.stringify(store.tasks, null, 2), "utf8");
  await writeFile(join(dir, "events.json"), JSON.stringify(store.events, null, 2), "utf8");
  await writeFile(join(dir, "templates.json"), JSON.stringify(store.templates, null, 2), "utf8");
  await writeFile(join(dir, "suppressions.json"), JSON.stringify(store.suppressions, null, 2), "utf8");

  return { dir };
}

describe("outreach store", () => {
  it("creates an empty outreach store shape", () => {
    expect(createEmptyOutreachStore()).toEqual({
      leads: [],
      campaigns: [],
      tasks: [],
      events: [],
      templates: [],
      suppressions: [],
    });
  });

  it("reads empty outreach datasets from disk", async () => {
    const { dir } = await createOutreachFixture();

    const store = await readOutreachStore(dir);

    expect(store).toEqual(createEmptyOutreachStore());
  });

  it("writes typed outreach datasets back to disk", async () => {
    const { dir } = await createOutreachFixture();
    const nextStore: OutreachStore = {
      leads: [
        {
          id: "lead_1",
          sourceType: "obsidian",
          sourcePath: "/Users/nason/Documents/Obsidian Vault/UAE.md",
          company: "Beads Elegant Gift Trading LLC",
          contactName: "Sara",
          country: "United Arab Emirates",
          website: "https://www.beadselegant.com/",
          whatsapp: "+971 55 905 1926",
          email: "sales@example.com",
          score: 100,
          notes: "Priority lead",
          createdAt: "2026-03-29T00:00:00.000Z",
          updatedAt: "2026-03-29T00:00:00.000Z",
        } satisfies OutreachLead,
      ],
      campaigns: [
        {
          id: "camp_1",
          name: "Gulf outreach",
          description: "First-touch WhatsApp and email campaign",
          channels: ["whatsapp", "email"],
          status: "active",
          createdAt: "2026-03-29T00:00:00.000Z",
        } satisfies OutreachCampaign,
      ],
      tasks: [
        {
          id: "task_1",
          campaignId: "camp_1",
          leadId: "lead_1",
          channel: "whatsapp",
          variant: "personalized",
          status: "queued",
          websiteUrl: "https://www.tranquilbeads.com",
          subject: null,
          body: "Hello, this is Nason from TranquilBeads.",
          recipientAddress: "+971 55 905 1926",
          attachmentImagePaths: [
            "/images/imported/obsidian-tasbih/size.jpg",
            "/images/imported/silver-sheen-obsidian/tasbih-03.jpg",
          ],
          sentAt: null,
          lastReplyAt: null,
          needsHumanFollowup: false,
          failureReason: null,
        } satisfies OutreachTask,
      ],
      events: [
        {
          id: "event_1",
          taskId: "task_1",
          type: "task_created",
          payload: { channel: "whatsapp" },
          createdAt: "2026-03-29T00:00:00.000Z",
        } satisfies OutreachEvent,
      ],
      templates: [
        {
          id: "tmpl_1",
          channel: "whatsapp",
          variant: "personalized",
          subject: null,
          body: "Hello, this is Nason from TranquilBeads.",
          attachmentImageCount: 2,
        } satisfies OutreachTemplate,
      ],
      suppressions: [
        {
          address: "sales@example.com",
          channel: "email",
          reason: "unsubscribe",
          createdAt: "2026-03-29T00:00:00.000Z",
        } satisfies SuppressionEntry,
      ],
    };

    await writeOutreachStore(nextStore, dir);

    expect(JSON.parse(await readFile(join(dir, "leads.json"), "utf8"))).toEqual(nextStore.leads);
    expect(JSON.parse(await readFile(join(dir, "campaigns.json"), "utf8"))).toEqual(
      nextStore.campaigns,
    );
    expect(JSON.parse(await readFile(join(dir, "tasks.json"), "utf8"))).toEqual(nextStore.tasks);
    expect(JSON.parse(await readFile(join(dir, "events.json"), "utf8"))).toEqual(nextStore.events);
    expect(JSON.parse(await readFile(join(dir, "templates.json"), "utf8"))).toEqual(
      nextStore.templates,
    );
    expect(JSON.parse(await readFile(join(dir, "suppressions.json"), "utf8"))).toEqual(
      nextStore.suppressions,
    );
  });
});
