/**
 * Email Campaigns Component Functions
 *
 * Pure component implementation — operates only on its own tables.
 * Uses v.string() for all external references (tenantId, creatorId, userId).
 * Data enrichment (user names, tier names) happens in the facade layer.
 */

import { mutation, query } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { v } from 'convex/values';

// =============================================================================
// CONSTANTS
// =============================================================================

const VALID_CAMPAIGN_TYPES = ['transactional', 'marketing', 'announcement'];
const VALID_STATUSES = ['draft', 'scheduled', 'sending', 'sent', 'cancelled'];
const VALID_SEGMENT_TYPES = ['all', 'tier', 'active', 'inactive', 'custom'];
const VALID_RECIPIENT_STATUSES = ['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed'];

// =============================================================================
// SEGMENT VALIDATOR
// =============================================================================

const segmentValidator = v.object({
  type: v.string(),
  tierId: v.optional(v.string()),
  activeSinceDays: v.optional(v.number()),
  inactiveSinceDays: v.optional(v.number()),
  tags: v.optional(v.array(v.string())),
});

// =============================================================================
// QUERIES
// =============================================================================

/**
 * List campaigns for a tenant, optionally filtered by status or type.
 * Sorted newest first.
 */
export const list = query({
  args: {
    tenantId: v.string(),
    status: v.optional(v.string()),
    campaignType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, { tenantId, status, campaignType, limit }) => {
    let campaigns;

    if (status) {
      campaigns = await ctx.db
        .query('campaigns')
        .withIndex('by_tenant_status', (q) => q.eq('tenantId', tenantId).eq('status', status))
        .collect();
    } else if (campaignType) {
      campaigns = await ctx.db
        .query('campaigns')
        .withIndex('by_tenant_type', (q) => q.eq('tenantId', tenantId).eq('campaignType', campaignType))
        .collect();
    } else {
      campaigns = await ctx.db
        .query('campaigns')
        .withIndex('by_tenant', (q) => q.eq('tenantId', tenantId))
        .collect();
    }

    campaigns.sort((a, b) => b._creationTime - a._creationTime);

    if (limit) {
      campaigns = campaigns.slice(0, limit);
    }

    return campaigns;
  },
});

/**
 * Get a single campaign by ID.
 */
export const get = query({
  args: { id: v.id('campaigns') },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    const campaign = await ctx.db.get(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    return campaign;
  },
});

/**
 * Get campaign analytics — returns the campaign with recipient status breakdown.
 */
export const getAnalytics = query({
  args: { campaignId: v.string() },
  returns: v.any(),
  handler: async (ctx, { campaignId }) => {
    const recipients = await ctx.db
      .query('campaignRecipients')
      .withIndex('by_campaign', (q) => q.eq('campaignId', campaignId))
      .collect();

    const breakdown: Record<string, number> = {};
    for (const r of recipients) {
      breakdown[r.status] = (breakdown[r.status] || 0) + 1;
    }

    return {
      campaignId,
      totalRecipients: recipients.length,
      breakdown,
    };
  },
});

/**
 * List recipients for a campaign, optionally filtered by status.
 */
export const listRecipients = query({
  args: {
    campaignId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, { campaignId, status, limit }) => {
    let recipients;

    if (status) {
      recipients = await ctx.db
        .query('campaignRecipients')
        .withIndex('by_campaign_status', (q) => q.eq('campaignId', campaignId).eq('status', status))
        .collect();
    } else {
      recipients = await ctx.db
        .query('campaignRecipients')
        .withIndex('by_campaign', (q) => q.eq('campaignId', campaignId))
        .collect();
    }

    if (limit) {
      recipients = recipients.slice(0, limit);
    }

    return recipients;
  },
});

/**
 * Check if a user is unsubscribed from marketing emails.
 */
export const isUnsubscribed = query({
  args: {
    tenantId: v.string(),
    email: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, { tenantId, email }) => {
    const unsub = await ctx.db
      .query('unsubscribes')
      .withIndex('by_tenant_email', (q) => q.eq('tenantId', tenantId).eq('email', email))
      .first();
    return unsub !== null;
  },
});

/**
 * List scheduled campaigns ready to send (status=scheduled, scheduledAt <= now).
 */
export const listScheduledReady = query({
  args: { now: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, { now }) => {
    const campaigns = await ctx.db
      .query('campaigns')
      .withIndex('by_scheduled', (q) => q.eq('status', 'scheduled'))
      .collect();

    return campaigns.filter((c) => c.scheduledAt !== undefined && c.scheduledAt <= now);
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new email campaign (starts as draft).
 */
export const create = mutation({
  args: {
    tenantId: v.string(),
    creatorId: v.string(),
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    preheader: v.optional(v.string()),
    templateCategory: v.optional(v.string()),
    campaignType: v.string(),
    segment: segmentValidator,
    metadata: v.optional(v.any()),
  },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, args) => {
    if (!VALID_CAMPAIGN_TYPES.includes(args.campaignType)) {
      throw new Error(
        `Invalid campaign type: ${args.campaignType}. Must be one of: ${VALID_CAMPAIGN_TYPES.join(', ')}`,
      );
    }
    if (!VALID_SEGMENT_TYPES.includes(args.segment.type)) {
      throw new Error(`Invalid segment type: ${args.segment.type}. Must be one of: ${VALID_SEGMENT_TYPES.join(', ')}`);
    }
    if (args.name.trim().length === 0) {
      throw new Error('Campaign name cannot be empty');
    }
    if (args.subject.trim().length === 0) {
      throw new Error('Campaign subject cannot be empty');
    }

    const id = await ctx.db.insert('campaigns', {
      tenantId: args.tenantId,
      creatorId: args.creatorId,
      name: args.name,
      subject: args.subject,
      body: args.body,
      preheader: args.preheader,
      templateCategory: args.templateCategory,
      campaignType: args.campaignType,
      segment: args.segment,
      status: 'draft',
      recipientCount: 0,
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      bounceCount: 0,
      unsubscribeCount: 0,
      metadata: args.metadata ?? {},
    });

    return { id: id as string };
  },
});

/**
 * Update a draft campaign's content or segment.
 */
export const update = mutation({
  args: {
    id: v.id('campaigns'),
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    preheader: v.optional(v.string()),
    campaignType: v.optional(v.string()),
    segment: v.optional(segmentValidator),
    metadata: v.optional(v.any()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { id, ...updates }) => {
    const campaign = await ctx.db.get(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    if (campaign.status !== 'draft') {
      throw new Error('Can only update draft campaigns');
    }

    const patch: Record<string, any> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.subject !== undefined) patch.subject = updates.subject;
    if (updates.body !== undefined) patch.body = updates.body;
    if (updates.preheader !== undefined) patch.preheader = updates.preheader;
    if (updates.campaignType !== undefined) {
      if (!VALID_CAMPAIGN_TYPES.includes(updates.campaignType)) {
        throw new Error(`Invalid campaign type: ${updates.campaignType}`);
      }
      patch.campaignType = updates.campaignType;
    }
    if (updates.segment !== undefined) {
      if (!VALID_SEGMENT_TYPES.includes(updates.segment.type)) {
        throw new Error(`Invalid segment type: ${updates.segment.type}`);
      }
      patch.segment = updates.segment;
    }
    if (updates.metadata !== undefined) patch.metadata = updates.metadata;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(id, patch);
    }

    return { success: true };
  },
});

/**
 * Schedule a campaign for future sending.
 */
export const schedule = mutation({
  args: {
    id: v.id('campaigns'),
    scheduledAt: v.number(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { id, scheduledAt }) => {
    const campaign = await ctx.db.get(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    if (campaign.status !== 'draft') {
      throw new Error('Can only schedule draft campaigns');
    }

    await ctx.db.patch(id, {
      status: 'scheduled',
      scheduledAt,
    });

    return { success: true };
  },
});

/**
 * Add recipients to a campaign (called from facade after segment resolution).
 */
export const addRecipients = mutation({
  args: {
    campaignId: v.string(),
    tenantId: v.string(),
    recipients: v.array(
      v.object({
        userId: v.string(),
        email: v.string(),
      }),
    ),
  },
  returns: v.object({ added: v.number() }),
  handler: async (ctx, { campaignId, tenantId, recipients }) => {
    // Filter out unsubscribed users
    const unsubscribed = new Set<string>();
    const allUnsubs = await ctx.db
      .query('unsubscribes')
      .withIndex('by_tenant', (q) => q.eq('tenantId', tenantId))
      .collect();
    for (const u of allUnsubs) {
      unsubscribed.add(u.email);
    }

    let added = 0;
    for (const r of recipients) {
      if (unsubscribed.has(r.email)) continue;

      await ctx.db.insert('campaignRecipients', {
        tenantId,
        campaignId,
        userId: r.userId,
        email: r.email,
        status: 'pending',
      });
      added++;
    }

    // Update campaign recipient count
    const campaign = (await ctx.db.get(campaignId as any)) as Doc<'campaigns'> | null;
    if (campaign) {
      await ctx.db.patch(campaign._id, {
        recipientCount: campaign.recipientCount + added,
      });
    }

    return { added };
  },
});

/**
 * Mark a campaign as sending (transition from draft/scheduled → sending).
 */
export const markSending = mutation({
  args: { id: v.id('campaigns') },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { id }) => {
    const campaign = await ctx.db.get(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error('Can only start sending draft or scheduled campaigns');
    }

    await ctx.db.patch(id, { status: 'sending' });
    return { success: true };
  },
});

/**
 * Mark a campaign as sent (all emails dispatched).
 */
export const markSent = mutation({
  args: { id: v.id('campaigns') },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { id }) => {
    const campaign = await ctx.db.get(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    await ctx.db.patch(id, {
      status: 'sent',
      sentAt: Date.now(),
      completedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Cancel a campaign (only draft or scheduled).
 */
export const cancel = mutation({
  args: { id: v.id('campaigns') },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { id }) => {
    const campaign = await ctx.db.get(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error('Can only cancel draft or scheduled campaigns');
    }

    await ctx.db.patch(id, { status: 'cancelled' });
    return { success: true };
  },
});

/**
 * Update a recipient's delivery status (called after email send).
 */
export const updateRecipientStatus = mutation({
  args: {
    id: v.id('campaignRecipients'),
    status: v.string(),
    resendId: v.optional(v.string()),
    bounceReason: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { id, status, resendId, bounceReason }) => {
    if (!VALID_RECIPIENT_STATUSES.includes(status)) {
      throw new Error(`Invalid recipient status: ${status}`);
    }

    const recipient = await ctx.db.get(id);
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    const now = Date.now();
    const patch: Record<string, any> = { status };
    if (resendId) patch.resendId = resendId;

    switch (status) {
      case 'sent':
        patch.sentAt = now;
        break;
      case 'opened':
        patch.openedAt = now;
        break;
      case 'clicked':
        patch.clickedAt = now;
        break;
      case 'bounced':
        patch.bouncedAt = now;
        if (bounceReason) patch.bounceReason = bounceReason;
        break;
      case 'unsubscribed':
        patch.unsubscribedAt = now;
        break;
    }

    await ctx.db.patch(id, patch);

    // Update campaign aggregate counters
    const campaign = (await ctx.db.get(recipient.campaignId as any)) as Doc<'campaigns'> | null;
    if (campaign) {
      const counterPatch: Record<string, any> = {};
      if (status === 'sent') counterPatch.sentCount = campaign.sentCount + 1;
      if (status === 'opened') counterPatch.openCount = campaign.openCount + 1;
      if (status === 'clicked') counterPatch.clickCount = campaign.clickCount + 1;
      if (status === 'bounced') counterPatch.bounceCount = campaign.bounceCount + 1;
      if (status === 'unsubscribed') counterPatch.unsubscribeCount = campaign.unsubscribeCount + 1;

      if (Object.keys(counterPatch).length > 0) {
        await ctx.db.patch(campaign._id, counterPatch);
      }
    }

    return { success: true };
  },
});

/**
 * Add a user to the unsubscribe list.
 */
export const unsubscribe = mutation({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    email: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { tenantId, userId, email, reason }) => {
    // Check if already unsubscribed
    const existing = await ctx.db
      .query('unsubscribes')
      .withIndex('by_tenant_email', (q) => q.eq('tenantId', tenantId).eq('email', email))
      .first();

    if (existing) {
      return { success: true };
    }

    await ctx.db.insert('unsubscribes', {
      tenantId,
      userId,
      email,
      reason,
      unsubscribedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Resubscribe a user (remove from unsubscribe list).
 */
export const resubscribe = mutation({
  args: {
    tenantId: v.string(),
    email: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { tenantId, email }) => {
    const existing = await ctx.db
      .query('unsubscribes')
      .withIndex('by_tenant_email', (q) => q.eq('tenantId', tenantId).eq('email', email))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});
