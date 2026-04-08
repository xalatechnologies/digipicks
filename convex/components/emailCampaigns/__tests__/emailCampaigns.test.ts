/**
 * Email Campaigns Component — Convex Tests
 *
 * Covers all functions in components/emailCampaigns/functions.ts:
 *   - create (validation, defaults, segment types)
 *   - update (draft only, partial updates)
 *   - get (success, not-found)
 *   - list (filters by status, type, limit)
 *   - schedule (draft → scheduled)
 *   - cancel (draft/scheduled → cancelled)
 *   - markSending / markSent (status transitions)
 *   - addRecipients (filtering unsubscribed, count update)
 *   - updateRecipientStatus (counters, timestamps)
 *   - unsubscribe / resubscribe (GDPR opt-out)
 *   - isUnsubscribed (lookup)
 *   - getAnalytics (status breakdown)
 *   - listRecipients (filters)
 *   - listScheduledReady (time-based query)
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/emailCampaigns/__tests__/emailCampaigns.test.ts
 */

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT = "tenant-email-001";
const CREATOR = "creator-a";

const DEFAULT_SEGMENT = { type: "all" as const };

async function createCampaign(
    t: ReturnType<typeof convexTest>,
    overrides: Partial<{
        tenantId: string;
        creatorId: string;
        name: string;
        subject: string;
        body: string;
        campaignType: string;
        segment: { type: string; tierId?: string; tags?: string[] };
    }> = {}
) {
    return t.mutation(api.functions.create, {
        tenantId: overrides.tenantId ?? TENANT,
        creatorId: overrides.creatorId ?? CREATOR,
        name: overrides.name ?? "Welcome Campaign",
        subject: overrides.subject ?? "Welcome to DigiPicks!",
        body: overrides.body ?? "<p>Thanks for subscribing.</p>",
        campaignType: overrides.campaignType ?? "marketing",
        segment: overrides.segment ?? DEFAULT_SEGMENT,
    });
}

// =============================================================================
// CREATE
// =============================================================================

describe("create", () => {
    it("creates a draft campaign with correct defaults", async () => {
        const t = convexTest(schema, modules);
        const result = await createCampaign(t);
        expect(result.id).toBeDefined();

        const campaign = await t.query(api.functions.get, { id: result.id as any });
        expect(campaign.status).toBe("draft");
        expect(campaign.recipientCount).toBe(0);
        expect(campaign.sentCount).toBe(0);
        expect(campaign.openCount).toBe(0);
        expect(campaign.clickCount).toBe(0);
        expect(campaign.bounceCount).toBe(0);
        expect(campaign.unsubscribeCount).toBe(0);
        expect(campaign.campaignType).toBe("marketing");
        expect(campaign.segment.type).toBe("all");
    });

    it("rejects invalid campaign type", async () => {
        const t = convexTest(schema, modules);
        await expect(
            createCampaign(t, { campaignType: "invalid" })
        ).rejects.toThrow("Invalid campaign type");
    });

    it("rejects invalid segment type", async () => {
        const t = convexTest(schema, modules);
        await expect(
            createCampaign(t, { segment: { type: "nonexistent" } })
        ).rejects.toThrow("Invalid segment type");
    });

    it("rejects empty name", async () => {
        const t = convexTest(schema, modules);
        await expect(
            createCampaign(t, { name: "  " })
        ).rejects.toThrow("Campaign name cannot be empty");
    });

    it("rejects empty subject", async () => {
        const t = convexTest(schema, modules);
        await expect(
            createCampaign(t, { subject: "" })
        ).rejects.toThrow("Campaign subject cannot be empty");
    });

    it("accepts tier segment with tierId", async () => {
        const t = convexTest(schema, modules);
        const result = await createCampaign(t, {
            segment: { type: "tier", tierId: "tier-gold" },
        });
        const campaign = await t.query(api.functions.get, { id: result.id as any });
        expect(campaign.segment.type).toBe("tier");
        expect(campaign.segment.tierId).toBe("tier-gold");
    });
});

// =============================================================================
// UPDATE
// =============================================================================

describe("update", () => {
    it("updates draft campaign fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);

        await t.mutation(api.functions.update, {
            id: id as any,
            name: "Updated Name",
            subject: "New Subject",
        });

        const campaign = await t.query(api.functions.get, { id: id as any });
        expect(campaign.name).toBe("Updated Name");
        expect(campaign.subject).toBe("New Subject");
    });

    it("rejects updates to non-draft campaigns", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);

        // Schedule the campaign
        await t.mutation(api.functions.schedule, {
            id: id as any,
            scheduledAt: Date.now() + 3600000,
        });

        await expect(
            t.mutation(api.functions.update, {
                id: id as any,
                name: "Should fail",
            })
        ).rejects.toThrow("Can only update draft campaigns");
    });
});

// =============================================================================
// LIST
// =============================================================================

describe("list", () => {
    it("lists campaigns for a tenant sorted newest first", async () => {
        const t = convexTest(schema, modules);
        await createCampaign(t, { name: "First" });
        await createCampaign(t, { name: "Second" });

        const campaigns = await t.query(api.functions.list, { tenantId: TENANT });
        expect(campaigns.length).toBe(2);
        expect(campaigns[0].name).toBe("Second");
    });

    it("filters by status", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t, { name: "Draft One" });
        await createCampaign(t, { name: "Draft Two" });

        // Schedule one
        await t.mutation(api.functions.schedule, {
            id: id as any,
            scheduledAt: Date.now() + 3600000,
        });

        const drafts = await t.query(api.functions.list, {
            tenantId: TENANT,
            status: "draft",
        });
        expect(drafts.length).toBe(1);
        expect(drafts[0].name).toBe("Draft Two");
    });

    it("filters by campaign type", async () => {
        const t = convexTest(schema, modules);
        await createCampaign(t, { campaignType: "marketing" });
        await createCampaign(t, { campaignType: "transactional" });

        const marketing = await t.query(api.functions.list, {
            tenantId: TENANT,
            campaignType: "marketing",
        });
        expect(marketing.length).toBe(1);
    });

    it("respects limit", async () => {
        const t = convexTest(schema, modules);
        await createCampaign(t, { name: "A" });
        await createCampaign(t, { name: "B" });
        await createCampaign(t, { name: "C" });

        const limited = await t.query(api.functions.list, {
            tenantId: TENANT,
            limit: 2,
        });
        expect(limited.length).toBe(2);
    });

    it("isolates by tenant", async () => {
        const t = convexTest(schema, modules);
        await createCampaign(t, { tenantId: "tenant-1" });
        await createCampaign(t, { tenantId: "tenant-2" });

        const t1 = await t.query(api.functions.list, { tenantId: "tenant-1" });
        expect(t1.length).toBe(1);
    });
});

// =============================================================================
// SCHEDULE / CANCEL
// =============================================================================

describe("schedule", () => {
    it("transitions draft to scheduled", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);
        const scheduledAt = Date.now() + 3600000;

        await t.mutation(api.functions.schedule, {
            id: id as any,
            scheduledAt,
        });

        const campaign = await t.query(api.functions.get, { id: id as any });
        expect(campaign.status).toBe("scheduled");
        expect(campaign.scheduledAt).toBe(scheduledAt);
    });

    it("rejects scheduling non-draft campaigns", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);

        await t.mutation(api.functions.schedule, {
            id: id as any,
            scheduledAt: Date.now() + 3600000,
        });

        // Try scheduling again
        await expect(
            t.mutation(api.functions.schedule, {
                id: id as any,
                scheduledAt: Date.now() + 7200000,
            })
        ).rejects.toThrow("Can only schedule draft campaigns");
    });
});

describe("cancel", () => {
    it("cancels a draft campaign", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);

        await t.mutation(api.functions.cancel, { id: id as any });

        const campaign = await t.query(api.functions.get, { id: id as any });
        expect(campaign.status).toBe("cancelled");
    });

    it("cancels a scheduled campaign", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);

        await t.mutation(api.functions.schedule, {
            id: id as any,
            scheduledAt: Date.now() + 3600000,
        });

        await t.mutation(api.functions.cancel, { id: id as any });

        const campaign = await t.query(api.functions.get, { id: id as any });
        expect(campaign.status).toBe("cancelled");
    });

    it("rejects cancelling sent campaigns", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);

        await t.mutation(api.functions.markSending, { id: id as any });
        await t.mutation(api.functions.markSent, { id: id as any });

        await expect(
            t.mutation(api.functions.cancel, { id: id as any })
        ).rejects.toThrow("Can only cancel draft or scheduled campaigns");
    });
});

// =============================================================================
// STATUS TRANSITIONS
// =============================================================================

describe("markSending / markSent", () => {
    it("transitions draft → sending → sent", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);

        await t.mutation(api.functions.markSending, { id: id as any });
        let campaign = await t.query(api.functions.get, { id: id as any });
        expect(campaign.status).toBe("sending");

        await t.mutation(api.functions.markSent, { id: id as any });
        campaign = await t.query(api.functions.get, { id: id as any });
        expect(campaign.status).toBe("sent");
        expect(campaign.sentAt).toBeDefined();
        expect(campaign.completedAt).toBeDefined();
    });

    it("rejects sending already-sent campaigns", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);
        await t.mutation(api.functions.markSending, { id: id as any });
        await t.mutation(api.functions.markSent, { id: id as any });

        await expect(
            t.mutation(api.functions.markSending, { id: id as any })
        ).rejects.toThrow("Can only start sending draft or scheduled campaigns");
    });
});

// =============================================================================
// RECIPIENTS
// =============================================================================

describe("addRecipients", () => {
    it("adds recipients and updates campaign count", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);

        const result = await t.mutation(api.functions.addRecipients, {
            campaignId: id,
            tenantId: TENANT,
            recipients: [
                { userId: "user-1", email: "a@example.com" },
                { userId: "user-2", email: "b@example.com" },
            ],
        });

        expect(result.added).toBe(2);

        const campaign = await t.query(api.functions.get, { id: id as any });
        expect(campaign.recipientCount).toBe(2);
    });

    it("filters out unsubscribed users", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);

        // Unsubscribe one email
        await t.mutation(api.functions.unsubscribe, {
            tenantId: TENANT,
            userId: "user-2",
            email: "b@example.com",
        });

        const result = await t.mutation(api.functions.addRecipients, {
            campaignId: id,
            tenantId: TENANT,
            recipients: [
                { userId: "user-1", email: "a@example.com" },
                { userId: "user-2", email: "b@example.com" },
            ],
        });

        expect(result.added).toBe(1);
    });
});

describe("updateRecipientStatus", () => {
    it("updates recipient status and campaign counters", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);

        await t.mutation(api.functions.addRecipients, {
            campaignId: id,
            tenantId: TENANT,
            recipients: [{ userId: "user-1", email: "a@example.com" }],
        });

        const recipients = await t.query(api.functions.listRecipients, {
            campaignId: id,
        });
        expect(recipients.length).toBe(1);

        // Mark as sent
        await t.mutation(api.functions.updateRecipientStatus, {
            id: recipients[0]._id,
            status: "sent",
            resendId: "resend-123",
        });

        const updated = await t.query(api.functions.listRecipients, {
            campaignId: id,
        });
        expect(updated[0].status).toBe("sent");
        expect(updated[0].sentAt).toBeDefined();
        expect(updated[0].resendId).toBe("resend-123");

        const campaign = await t.query(api.functions.get, { id: id as any });
        expect(campaign.sentCount).toBe(1);
    });

    it("tracks opens, clicks, and bounces", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);

        await t.mutation(api.functions.addRecipients, {
            campaignId: id,
            tenantId: TENANT,
            recipients: [
                { userId: "user-1", email: "a@example.com" },
                { userId: "user-2", email: "b@example.com" },
            ],
        });

        const recipients = await t.query(api.functions.listRecipients, {
            campaignId: id,
        });

        // Mark first as opened
        await t.mutation(api.functions.updateRecipientStatus, {
            id: recipients[0]._id,
            status: "opened",
        });

        // Mark second as bounced
        await t.mutation(api.functions.updateRecipientStatus, {
            id: recipients[1]._id,
            status: "bounced",
            bounceReason: "mailbox full",
        });

        const campaign = await t.query(api.functions.get, { id: id as any });
        expect(campaign.openCount).toBe(1);
        expect(campaign.bounceCount).toBe(1);

        const bouncedRecipient = await t.query(api.functions.listRecipients, {
            campaignId: id,
            status: "bounced",
        });
        expect(bouncedRecipient.length).toBe(1);
        expect(bouncedRecipient[0].bounceReason).toBe("mailbox full");
    });

    it("rejects invalid recipient status", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);

        await t.mutation(api.functions.addRecipients, {
            campaignId: id,
            tenantId: TENANT,
            recipients: [{ userId: "user-1", email: "a@example.com" }],
        });

        const recipients = await t.query(api.functions.listRecipients, {
            campaignId: id,
        });

        await expect(
            t.mutation(api.functions.updateRecipientStatus, {
                id: recipients[0]._id,
                status: "invalid_status",
            })
        ).rejects.toThrow("Invalid recipient status");
    });
});

// =============================================================================
// UNSUBSCRIBE / RESUBSCRIBE
// =============================================================================

describe("unsubscribe / resubscribe", () => {
    it("unsubscribes a user", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.unsubscribe, {
            tenantId: TENANT,
            userId: "user-1",
            email: "user@example.com",
            reason: "Too many emails",
        });

        const isUnsub = await t.query(api.functions.isUnsubscribed, {
            tenantId: TENANT,
            email: "user@example.com",
        });
        expect(isUnsub).toBe(true);
    });

    it("unsubscribe is idempotent", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.unsubscribe, {
            tenantId: TENANT,
            userId: "user-1",
            email: "user@example.com",
        });

        // Second call should succeed without error
        const result = await t.mutation(api.functions.unsubscribe, {
            tenantId: TENANT,
            userId: "user-1",
            email: "user@example.com",
        });
        expect(result.success).toBe(true);
    });

    it("resubscribes a user", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.functions.unsubscribe, {
            tenantId: TENANT,
            userId: "user-1",
            email: "user@example.com",
        });

        await t.mutation(api.functions.resubscribe, {
            tenantId: TENANT,
            email: "user@example.com",
        });

        const isUnsub = await t.query(api.functions.isUnsubscribed, {
            tenantId: TENANT,
            email: "user@example.com",
        });
        expect(isUnsub).toBe(false);
    });

    it("resubscribe is safe when not unsubscribed", async () => {
        const t = convexTest(schema, modules);

        const result = await t.mutation(api.functions.resubscribe, {
            tenantId: TENANT,
            email: "never-unsubscribed@example.com",
        });
        expect(result.success).toBe(true);
    });
});

// =============================================================================
// ANALYTICS
// =============================================================================

describe("getAnalytics", () => {
    it("returns status breakdown for a campaign", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createCampaign(t);

        await t.mutation(api.functions.addRecipients, {
            campaignId: id,
            tenantId: TENANT,
            recipients: [
                { userId: "user-1", email: "a@example.com" },
                { userId: "user-2", email: "b@example.com" },
                { userId: "user-3", email: "c@example.com" },
            ],
        });

        const recipients = await t.query(api.functions.listRecipients, {
            campaignId: id,
        });

        await t.mutation(api.functions.updateRecipientStatus, {
            id: recipients[0]._id,
            status: "sent",
        });
        await t.mutation(api.functions.updateRecipientStatus, {
            id: recipients[1]._id,
            status: "opened",
        });

        const analytics = await t.query(api.functions.getAnalytics, {
            campaignId: id,
        });

        expect(analytics.totalRecipients).toBe(3);
        expect(analytics.breakdown.sent).toBe(1);
        expect(analytics.breakdown.opened).toBe(1);
        expect(analytics.breakdown.pending).toBe(1);
    });
});

// =============================================================================
// SCHEDULED READY
// =============================================================================

describe("listScheduledReady", () => {
    it("returns campaigns with scheduledAt in the past", async () => {
        const t = convexTest(schema, modules);
        const { id: pastId } = await createCampaign(t, { name: "Past" });
        const { id: futureId } = await createCampaign(t, { name: "Future" });

        const now = Date.now();
        await t.mutation(api.functions.schedule, {
            id: pastId as any,
            scheduledAt: now - 1000,
        });
        await t.mutation(api.functions.schedule, {
            id: futureId as any,
            scheduledAt: now + 3600000,
        });

        const ready = await t.query(api.functions.listScheduledReady, { now });
        expect(ready.length).toBe(1);
        expect(ready[0].name).toBe("Past");
    });
});

// =============================================================================
// GET — error cases
// =============================================================================

describe("get", () => {
    it("throws for non-existent campaign", async () => {
        const t = convexTest(schema, modules);
        // Use a valid-looking but non-existent ID
        await expect(
            t.query(api.functions.get, { id: "nonexistent" as any })
        ).rejects.toThrow();
    });
});
