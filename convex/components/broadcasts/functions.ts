/**
 * Broadcasts Component Functions
 *
 * Pure component implementation — operates only on its own tables.
 * Uses v.string() for all external references (tenantId, creatorId, userId).
 * Data enrichment (user names) happens in the facade layer.
 */

import { mutation, query } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { v } from 'convex/values';

// =============================================================================
// CONSTANTS
// =============================================================================

const VALID_MESSAGE_TYPES = ['text_update', 'pick_alert', 'announcement'];
const VALID_STATUSES = ['draft', 'sent'];

// =============================================================================
// QUERIES
// =============================================================================

/**
 * List broadcasts sent by a creator.
 * Sorted newest first. Used in creator's "Sent" view.
 */
export const listByCreator = query({
  args: {
    tenantId: v.string(),
    creatorId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, { tenantId, creatorId, status, limit }) => {
    let broadcasts;

    if (status) {
      broadcasts = await ctx.db
        .query('broadcasts')
        .withIndex('by_tenant_status', (q) => q.eq('tenantId', tenantId).eq('status', status))
        .collect();
      broadcasts = broadcasts.filter((b) => b.creatorId === creatorId);
    } else {
      broadcasts = await ctx.db
        .query('broadcasts')
        .withIndex('by_tenant_creator', (q) => q.eq('tenantId', tenantId).eq('creatorId', creatorId))
        .collect();
    }

    // Sort newest first
    broadcasts.sort((a, b) => b._creationTime - a._creationTime);

    if (limit) {
      broadcasts = broadcasts.slice(0, limit);
    }

    return broadcasts;
  },
});

/**
 * Get a single broadcast by ID.
 */
export const get = query({
  args: { id: v.id('broadcasts') },
  returns: v.any(),
  handler: async (ctx, { id }) => {
    const broadcast = await ctx.db.get(id);
    if (!broadcast) {
      throw new Error('Broadcast not found');
    }
    return broadcast;
  },
});

/**
 * List broadcasts received by a subscriber (via receipts).
 * Sorted newest first. Used in subscriber inbox.
 */
export const listForSubscriber = query({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, { tenantId, userId, unreadOnly, limit }) => {
    const receipts = await ctx.db
      .query('broadcastReceipts')
      .withIndex('by_tenant_user', (q) => q.eq('tenantId', tenantId).eq('userId', userId))
      .collect();

    let filtered = receipts;
    if (unreadOnly) {
      filtered = filtered.filter((r) => !r.readAt);
    }

    // Resolve broadcast data
    const results = [];
    for (const receipt of filtered) {
      const broadcast = (await ctx.db.get(receipt.broadcastId as any)) as Doc<'broadcasts'> | null;
      if (!broadcast || broadcast.status !== 'sent') continue;

      results.push({
        ...broadcast,
        receiptId: receipt._id as string,
        readAt: receipt.readAt,
      });
    }

    // Sort newest first
    results.sort((a, b) => b._creationTime - a._creationTime);

    if (limit) {
      return results.slice(0, limit);
    }

    return results;
  },
});

/**
 * Count unread broadcasts for a subscriber.
 */
export const unreadCount = query({
  args: {
    tenantId: v.string(),
    userId: v.string(),
  },
  returns: v.object({ count: v.number() }),
  handler: async (ctx, { tenantId, userId }) => {
    const receipts = await ctx.db
      .query('broadcastReceipts')
      .withIndex('by_tenant_user', (q) => q.eq('tenantId', tenantId).eq('userId', userId))
      .collect();

    const unread = receipts.filter((r) => !r.readAt);
    return { count: unread.length };
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create and send a broadcast.
 * Creates the broadcast record and fan-out receipts for each recipient.
 */
export const send = mutation({
  args: {
    tenantId: v.string(),
    creatorId: v.string(),
    title: v.string(),
    body: v.string(),
    messageType: v.string(),
    recipientIds: v.array(v.string()),
    pickId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({ id: v.string(), recipientCount: v.number() }),
  handler: async (ctx, args) => {
    // Validate message type
    if (!VALID_MESSAGE_TYPES.includes(args.messageType)) {
      throw new Error(`Invalid message type: ${args.messageType}. Must be one of: ${VALID_MESSAGE_TYPES.join(', ')}`);
    }

    if (args.title.trim().length === 0) {
      throw new Error('Broadcast title cannot be empty');
    }
    if (args.body.trim().length === 0) {
      throw new Error('Broadcast body cannot be empty');
    }

    const now = Date.now();
    const recipientCount = args.recipientIds.length;

    const broadcastId = await ctx.db.insert('broadcasts', {
      tenantId: args.tenantId,
      creatorId: args.creatorId,
      title: args.title,
      body: args.body,
      messageType: args.messageType,
      recipientCount,
      status: 'sent',
      sentAt: now,
      pickId: args.pickId,
      metadata: args.metadata ?? {},
    });

    // Fan-out: create a receipt for each recipient
    for (const userId of args.recipientIds) {
      await ctx.db.insert('broadcastReceipts', {
        tenantId: args.tenantId,
        broadcastId: broadcastId as string,
        userId,
      });
    }

    return { id: broadcastId as string, recipientCount };
  },
});

/**
 * Mark a broadcast as read by a subscriber.
 */
export const markAsRead = mutation({
  args: {
    userId: v.string(),
    broadcastId: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { userId, broadcastId }) => {
    const receipt = await ctx.db
      .query('broadcastReceipts')
      .withIndex('by_user_broadcast', (q) => q.eq('userId', userId).eq('broadcastId', broadcastId))
      .unique();

    if (!receipt) {
      throw new Error('Broadcast receipt not found');
    }

    if (!receipt.readAt) {
      await ctx.db.patch(receipt._id, { readAt: Date.now() });
    }

    return { success: true };
  },
});

/**
 * Remove a broadcast (creator only — hard delete with receipts).
 */
export const remove = mutation({
  args: { id: v.id('broadcasts') },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { id }) => {
    const broadcast = await ctx.db.get(id);
    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    // Delete all receipts for this broadcast
    const receipts = await ctx.db
      .query('broadcastReceipts')
      .withIndex('by_broadcast', (q) => q.eq('broadcastId', id as string))
      .collect();

    for (const receipt of receipts) {
      await ctx.db.delete(receipt._id);
    }

    await ctx.db.delete(id);
    return { success: true };
  },
});
