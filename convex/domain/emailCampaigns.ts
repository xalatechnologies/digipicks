/**
 * Email Campaigns Facade
 *
 * Thin facade that delegates to the emailCampaigns component.
 * Preserves the API path (api.domain.emailCampaigns.*) for SDK compatibility.
 * Handles:
 *   - ID type conversion (typed Id<"tenants"> -> string for component)
 *   - Data enrichment (creator names from core tables)
 *   - Audience segment resolution (resolve subscribers by tier/activity)
 *   - Email dispatch via existing email/send action
 *   - Rate limiting
 *   - Audit logging via audit component
 *   - Event bus emission
 */

import { mutation, query, action, internalAction } from "../_generated/server";
import { internal, components } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireActiveUser } from "../lib/auth";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// SEGMENT VALIDATOR (shared)
// =============================================================================

const segmentValidator = v.object({
    type: v.string(),
    tierId: v.optional(v.string()),
    activeSinceDays: v.optional(v.number()),
    inactiveSinceDays: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
});

// =============================================================================
// QUERY FACADES
// =============================================================================

/**
 * List campaigns for a tenant.
 * Enriches with creator data.
 */
export const list = query({
    args: {
        tenantId: v.id("tenants"),
        status: v.optional(v.string()),
        campaignType: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, status, campaignType, limit }) => {
        const campaigns = await ctx.runQuery(
            components.emailCampaigns.functions.list,
            { tenantId: tenantId as string, status, campaignType, limit }
        );

        // Batch fetch creator users
        const creatorIds = [
            ...new Set(
                (campaigns as any[])
                    .map((c: any) => c.creatorId)
                    .filter(Boolean)
            ),
        ];
        const users = await Promise.all(
            creatorIds.map((id: string) =>
                ctx.db.get(id as Id<"users">).catch(() => null)
            )
        );
        const userMap = new Map(
            users.filter(Boolean).map((u: any) => [u!._id, u])
        );

        return (campaigns as any[]).map((c: any) => {
            const user = c.creatorId ? userMap.get(c.creatorId) : null;
            return {
                ...c,
                creator: user
                    ? {
                          id: user._id,
                          name: user.name,
                          displayName: user.displayName,
                      }
                    : null,
            };
        });
    },
});

/**
 * Get a single campaign with creator data.
 */
export const get = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const campaign = await ctx.runQuery(
            components.emailCampaigns.functions.get,
            { id }
        );

        const user = (campaign as any).creatorId
            ? await ctx.db
                  .get((campaign as any).creatorId as Id<"users">)
                  .catch(() => null)
            : null;

        return {
            ...campaign,
            creator: user
                ? {
                      id: user._id,
                      name: user.name,
                      displayName: user.displayName,
                  }
                : null,
        };
    },
});

/**
 * Get campaign analytics (status breakdown).
 */
export const getAnalytics = query({
    args: { campaignId: v.string() },
    handler: async (ctx, { campaignId }) => {
        return ctx.runQuery(
            components.emailCampaigns.functions.getAnalytics,
            { campaignId }
        );
    },
});

/**
 * List recipients for a campaign.
 */
export const listRecipients = query({
    args: {
        campaignId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { campaignId, status, limit }) => {
        const recipients = await ctx.runQuery(
            components.emailCampaigns.functions.listRecipients,
            { campaignId, status, limit }
        );

        // Enrich with user data
        const userIds = [
            ...new Set(
                (recipients as any[]).map((r: any) => r.userId).filter(Boolean)
            ),
        ];
        const users = await Promise.all(
            userIds.map((id: string) =>
                ctx.db.get(id as Id<"users">).catch(() => null)
            )
        );
        const userMap = new Map(
            users.filter(Boolean).map((u: any) => [u!._id, u])
        );

        return (recipients as any[]).map((r: any) => {
            const user = r.userId ? userMap.get(r.userId) : null;
            return {
                ...r,
                user: user
                    ? {
                          id: user._id,
                          name: user.name,
                          displayName: user.displayName,
                      }
                    : null,
            };
        });
    },
});

/**
 * Check if a user is unsubscribed from marketing emails.
 */
export const isUnsubscribed = query({
    args: {
        tenantId: v.id("tenants"),
        email: v.string(),
    },
    handler: async (ctx, { tenantId, email }) => {
        return ctx.runQuery(
            components.emailCampaigns.functions.isUnsubscribed,
            { tenantId: tenantId as string, email }
        );
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

/**
 * Create a new email campaign.
 */
export const create = mutation({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
        name: v.string(),
        subject: v.string(),
        body: v.string(),
        preheader: v.optional(v.string()),
        templateCategory: v.optional(v.string()),
        campaignType: v.string(),
        segment: segmentValidator,
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await requireActiveUser(ctx, args.creatorId);

        const result = await ctx.runMutation(
            components.emailCampaigns.functions.create,
            {
                tenantId: args.tenantId as string,
                creatorId: args.creatorId as string,
                name: args.name,
                subject: args.subject,
                body: args.body,
                preheader: args.preheader,
                templateCategory: args.templateCategory,
                campaignType: args.campaignType,
                segment: args.segment,
                metadata: args.metadata,
            }
        );

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.creatorId as string,
            entityType: "emailCampaign",
            entityId: (result as any).id,
            action: "created",
            newState: {
                name: args.name,
                campaignType: args.campaignType,
                segment: args.segment,
            },
            sourceComponent: "emailCampaigns",
        });

        await emitEvent(
            ctx,
            "emailCampaigns.campaign.created",
            args.tenantId as string,
            "emailCampaigns",
            {
                campaignId: (result as any).id,
                creatorId: args.creatorId as string,
                campaignType: args.campaignType,
            }
        );

        return result;
    },
});

/**
 * Update a draft campaign.
 */
export const update = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        subject: v.optional(v.string()),
        body: v.optional(v.string()),
        preheader: v.optional(v.string()),
        campaignType: v.optional(v.string()),
        segment: v.optional(segmentValidator),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const result = await ctx.runMutation(
            components.emailCampaigns.functions.update,
            { id, ...updates } as any
        );

        return result;
    },
});

/**
 * Schedule a campaign for future sending.
 */
export const schedule = mutation({
    args: {
        id: v.string(),
        scheduledAt: v.number(),
    },
    handler: async (ctx, { id, scheduledAt }) => {
        const campaign = await ctx.runQuery(
            components.emailCampaigns.functions.get,
            { id }
        );

        const result = await ctx.runMutation(
            components.emailCampaigns.functions.schedule,
            { id, scheduledAt } as any
        );

        await withAudit(ctx, {
            tenantId: (campaign as any).tenantId,
            entityType: "emailCampaign",
            entityId: id,
            action: "scheduled",
            newState: { scheduledAt },
            sourceComponent: "emailCampaigns",
        });

        return result;
    },
});

/**
 * Cancel a campaign.
 */
export const cancel = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const campaign = await ctx.runQuery(
            components.emailCampaigns.functions.get,
            { id }
        );

        const result = await ctx.runMutation(
            components.emailCampaigns.functions.cancel,
            { id } as any
        );

        await withAudit(ctx, {
            tenantId: (campaign as any).tenantId,
            entityType: "emailCampaign",
            entityId: id,
            action: "cancelled",
            previousState: { status: (campaign as any).status },
            sourceComponent: "emailCampaigns",
        });

        return result;
    },
});

/**
 * Send a campaign immediately.
 * Resolves the audience segment, adds recipients, and dispatches emails
 * via the existing email/send action.
 */
export const sendCampaign = mutation({
    args: {
        tenantId: v.id("tenants"),
        campaignId: v.string(),
        creatorId: v.id("users"),
    },
    handler: async (ctx, { tenantId, campaignId, creatorId }) => {
        await requireActiveUser(ctx, creatorId);

        await rateLimit(ctx, {
            name: "sendBroadcast",
            key: rateLimitKeys.user(creatorId as string),
            throws: true,
        });

        // Get campaign
        const campaign = await ctx.runQuery(
            components.emailCampaigns.functions.get,
            { id: campaignId }
        );

        if (
            (campaign as any).status !== "draft" &&
            (campaign as any).status !== "scheduled"
        ) {
            throw new Error("Campaign must be in draft or scheduled status to send");
        }

        // Resolve audience based on segment
        const segment = (campaign as any).segment;
        let subscriberUsers: Array<{ userId: string; email: string }> = [];

        if (segment.type === "all" || segment.type === "tier") {
            // Get active subscribers
            const memberships = await ctx.runQuery(
                components.subscriptions.functions.listCreatorSubscribers,
                { creatorId: creatorId as string, status: "active" }
            );

            let filteredMemberships = memberships as any[];

            // Filter by tier if specified
            if (segment.type === "tier" && segment.tierId) {
                filteredMemberships = filteredMemberships.filter(
                    (m: any) => m.tierId === segment.tierId
                );
            }

            // Resolve user emails from core users table
            for (const m of filteredMemberships) {
                const user = await ctx.db
                    .get(m.userId as Id<"users">)
                    .catch(() => null);
                if (user?.email) {
                    subscriberUsers.push({
                        userId: m.userId,
                        email: user.email,
                    });
                }
            }
        }

        // Mark campaign as sending
        await ctx.runMutation(
            components.emailCampaigns.functions.markSending,
            { id: campaignId } as any
        );

        // Add recipients
        if (subscriberUsers.length > 0) {
            await ctx.runMutation(
                components.emailCampaigns.functions.addRecipients,
                {
                    campaignId,
                    tenantId: tenantId as string,
                    recipients: subscriberUsers,
                }
            );
        }

        // Schedule the email dispatch action
        await ctx.scheduler.runAfter(
            0,
            internal.domain.emailCampaigns.dispatchCampaignEmails,
            {
                tenantId: tenantId as string,
                campaignId,
            }
        );

        await withAudit(ctx, {
            tenantId: tenantId as string,
            userId: creatorId as string,
            entityType: "emailCampaign",
            entityId: campaignId,
            action: "sending",
            newState: {
                recipientCount: subscriberUsers.length,
                segment,
            },
            sourceComponent: "emailCampaigns",
        });

        await emitEvent(
            ctx,
            "emailCampaigns.campaign.sending",
            tenantId as string,
            "emailCampaigns",
            {
                campaignId,
                recipientCount: subscriberUsers.length,
            }
        );

        return {
            campaignId,
            recipientCount: subscriberUsers.length,
            status: "sending",
        };
    },
});

/**
 * Unsubscribe a user from marketing emails.
 */
export const unsubscribe = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        email: v.string(),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, userId, email, reason }) => {
        const result = await ctx.runMutation(
            components.emailCampaigns.functions.unsubscribe,
            {
                tenantId: tenantId as string,
                userId: userId as string,
                email,
                reason,
            }
        );

        await withAudit(ctx, {
            tenantId: tenantId as string,
            userId: userId as string,
            entityType: "emailCampaign",
            entityId: email,
            action: "unsubscribed",
            sourceComponent: "emailCampaigns",
        });

        return result;
    },
});

/**
 * Resubscribe a user.
 */
export const resubscribe = mutation({
    args: {
        tenantId: v.id("tenants"),
        email: v.string(),
    },
    handler: async (ctx, { tenantId, email }) => {
        return ctx.runMutation(
            components.emailCampaigns.functions.resubscribe,
            { tenantId: tenantId as string, email }
        );
    },
});

// =============================================================================
// INTERNAL ACTIONS (email dispatch)
// =============================================================================

/**
 * Dispatch emails for a campaign.
 * Fetches pending recipients and sends each email via the Resend integration.
 */
export const dispatchCampaignEmails = internalAction({
    args: {
        tenantId: v.string(),
        campaignId: v.string(),
    },
    handler: async (ctx, { tenantId, campaignId }) => {
        // Get campaign details
        const campaign = await ctx.runQuery(
            components.emailCampaigns.functions.get,
            { id: campaignId }
        );

        // Get pending recipients
        const recipients = await ctx.runQuery(
            components.emailCampaigns.functions.listRecipients,
            { campaignId, status: "pending" }
        );

        // Send emails to each recipient
        for (const recipient of recipients as any[]) {
            try {
                const result = await ctx.runAction(
                    internal.email.send.send,
                    {
                        tenantId,
                        templateCategory:
                            (campaign as any).templateCategory || "marketing",
                        recipientEmail: recipient.email,
                        recipientName: undefined,
                        userId: recipient.userId,
                        variables: {
                            subject: (campaign as any).subject,
                            body: (campaign as any).body,
                            campaignId,
                            unsubscribeUrl: `${process.env.WEB_APP_URL || "http://localhost:5190"}/unsubscribe?email=${encodeURIComponent(recipient.email)}&tenant=${tenantId}`,
                        },
                    }
                );

                // Update recipient status
                await ctx.runMutation(
                    components.emailCampaigns.functions.updateRecipientStatus,
                    {
                        id: recipient._id,
                        status:
                            (result as any)?.success ? "sent" : "bounced",
                        resendId: (result as any)?.resendId,
                        bounceReason: (result as any)?.success
                            ? undefined
                            : (result as any)?.reason,
                    }
                );
            } catch (error) {
                // Mark as bounced on error
                await ctx.runMutation(
                    components.emailCampaigns.functions.updateRecipientStatus,
                    {
                        id: recipient._id,
                        status: "bounced",
                        bounceReason:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                    }
                );
            }
        }

        // Mark campaign as sent
        await ctx.runMutation(
            components.emailCampaigns.functions.markSent,
            { id: campaignId } as any
        );
    },
});
