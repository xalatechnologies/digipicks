/**
 * Creator Profiles Component Schema
 *
 * Canonical creator card data, populated when a creatorApplication is
 * approved. This is the source of truth for handle, displayName, bio,
 * primarySports, nicheTags, externalLinks, and avatar — used by
 * discovery, homepage featured cards, and creator profile pages.
 *
 * Performance stats (winRate, ROI, picks count) are NOT stored here —
 * they live in the picks/leaderboard query and are joined at read time.
 *
 * External references use v.string() for component isolation.
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  creatorProfiles: defineTable({
    tenantId: v.string(),
    userId: v.string(),

    handle: v.string(), // lowercase, unique per tenant
    displayName: v.string(),
    bio: v.string(),
    avatarStorageId: v.optional(v.string()),

    primarySports: v.array(v.string()),
    nicheTags: v.array(v.string()),

    externalLinks: v.array(
      v.object({
        label: v.string(),
        url: v.string(),
      }),
    ),

    // active = discoverable; inactive = hidden from discovery
    // suspended = hard hidden, set by admin moderation
    status: v.string(), // active | inactive | suspended

    // Featured flag for homepage curation; admin-controllable later.
    featured: v.boolean(),

    promotedAt: v.number(), // when the application was approved
    sourceApplicationId: v.optional(v.string()),
  })
    .index('by_tenant', ['tenantId'])
    .index('by_tenant_status', ['tenantId', 'status'])
    .index('by_tenant_handle', ['tenantId', 'handle'])
    .index('by_user', ['userId'])
    .index('by_tenant_featured', ['tenantId', 'featured']),
});
