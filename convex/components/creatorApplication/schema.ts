/**
 * Creator Application Component Schema
 *
 * Tracks creator applications through a manual verification workflow.
 * External references (tenantId, userId, reviewedBy) use v.string()
 * because component tables cannot reference app-level tables.
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  applications: defineTable({
    tenantId: v.string(),
    userId: v.string(),

    // Identity & profile
    displayName: v.string(),
    bio: v.string(),

    // Niche & expertise
    niche: v.string(), // e.g. "NFL", "NBA", "Soccer", "MMA"
    specialties: v.optional(v.array(v.string())), // e.g. ["props", "parlays"]

    // Performance proof
    performanceProof: v.optional(v.string()), // link or description of track record
    trackRecordUrl: v.optional(v.string()), // external tracker profile URL

    // External presence
    socialLinks: v.optional(
      v.object({
        twitter: v.optional(v.string()),
        instagram: v.optional(v.string()),
        youtube: v.optional(v.string()),
        discord: v.optional(v.string()),
        website: v.optional(v.string()),
      }),
    ),

    // Verification workflow
    status: v.string(), // "pending" | "approved" | "rejected" | "more_info_requested"
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    reviewNote: v.optional(v.string()),

    // Resubmission support
    submittedAt: v.number(),
    resubmittedAt: v.optional(v.number()),
    previousApplicationId: v.optional(v.string()),

    metadata: v.optional(v.any()),
  })
    .index('by_tenant', ['tenantId'])
    .index('by_user', ['userId'])
    .index('by_tenant_and_status', ['tenantId', 'status'])
    .index('by_tenant_and_user', ['tenantId', 'userId']),
});
