/**
 * Compliance Component — Query Functions
 *
 * Read-only operations for consent records, DSAR requests, and policy versions.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// CONSENT — Queries
// =============================================================================

/**
 * Get a specific consent record for a user + category.
 */
export const getConsent = query({
    args: {
        userId: v.string(),
        category: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.any(),
    handler: async (ctx, { userId, category, limit = 100 }) => {
        const records = await ctx.db
            .query("consentRecords")
            .withIndex("by_user_category", (q) =>
                q.eq("userId", userId).eq("category", category)
            )
            .take(limit);

        if (records.length === 0) return null;

        // Return the most recent record for this user+category
        records.sort((a, b) => b.consentedAt - a.consentedAt);
        return records[0];
    },
});

/**
 * List all consent records for a user.
 */
export const listConsent = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { userId, limit = 100 }) => {
        const records = await ctx.db
            .query("consentRecords")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .take(limit);

        // Sort newest first
        records.sort((a, b) => b.consentedAt - a.consentedAt);
        return records;
    },
});

/**
 * Get a summary of all consent categories for a user.
 * Returns current consent state per category.
 */
export const getConsentSummary = query({
    args: {
        userId: v.string(),
    },
    returns: v.object({
        marketing: v.boolean(),
        analytics: v.boolean(),
        thirdParty: v.boolean(),
        necessary: v.boolean(),
    }),
    handler: async (ctx, { userId }) => {
        const records = await ctx.db
            .query("consentRecords")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Group by category, take latest record per category
        const latestByCategory: Record<string, boolean> = {};
        const sortedRecords = records.sort((a, b) => b.consentedAt - a.consentedAt);

        for (const record of sortedRecords) {
            if (!(record.category in latestByCategory)) {
                latestByCategory[record.category] = record.isConsented && !record.withdrawnAt;
            }
        }

        return {
            marketing: latestByCategory["marketing"] ?? false,
            analytics: latestByCategory["analytics"] ?? false,
            thirdParty: latestByCategory["thirdParty"] ?? false,
            necessary: true, // "necessary" is always true
        };
    },
});

// =============================================================================
// DSAR — Queries
// =============================================================================

/**
 * Get a single DSAR request by ID.
 */
export const getDSAR = query({
    args: {
        id: v.id("dsarRequests"),
    },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const request = await ctx.db.get(id);
        if (!request) {
            throw new Error("DSAR request not found");
        }
        return request;
    },
});

/**
 * List DSAR requests for a tenant, optionally filtered by user or status.
 */
export const listDSARRequests = query({
    args: {
        tenantId: v.string(),
        userId: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, userId, status, limit = 100 }) => {
        let requests;

        if (status) {
            requests = await ctx.db
                .query("dsarRequests")
                .withIndex("by_status", (q) =>
                    q.eq("tenantId", tenantId).eq("status", status)
                )
                .collect();
        } else {
            requests = await ctx.db
                .query("dsarRequests")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .collect();
        }

        if (userId) {
            requests = requests.filter((r) => r.userId === userId);
        }

        // Sort newest first
        requests.sort((a, b) => b.submittedAt - a.submittedAt);
        return requests.slice(0, limit);
    },
});

// =============================================================================
// POLICY VERSIONS — Queries
// =============================================================================

/**
 * Get the current published policy for a tenant + type.
 */
export const getPolicy = query({
    args: {
        tenantId: v.string(),
        policyType: v.string(),
    },
    returns: v.any(),
    handler: async (ctx, { tenantId, policyType }) => {
        const policies = await ctx.db
            .query("policyVersions")
            .withIndex("by_type", (q) =>
                q.eq("tenantId", tenantId).eq("policyType", policyType)
            )
            .collect();

        // Find the most recently published version
        const published = policies
            .filter((p) => p.isPublished)
            .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));

        return published[0] ?? null;
    },
});

/**
 * List all current published policies for a tenant.
 */
export const listPolicies = query({
    args: {
        tenantId: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, limit = 100 }) => {
        const policies = await ctx.db
            .query("policyVersions")
            .withIndex("by_published", (q) =>
                q.eq("tenantId", tenantId).eq("isPublished", true)
            )
            .take(limit);

        // Sort by policy type for consistent ordering
        policies.sort((a, b) => a.policyType.localeCompare(b.policyType));
        return policies;
    },
});

/**
 * Get the version history of a specific policy type for a tenant.
 */
export const getPolicyHistory = query({
    args: {
        tenantId: v.string(),
        policyType: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, policyType, limit = 100 }) => {
        const policies = await ctx.db
            .query("policyVersions")
            .withIndex("by_type", (q) =>
                q.eq("tenantId", tenantId).eq("policyType", policyType)
            )
            .take(limit);

        // Sort newest first
        policies.sort((a, b) => b._creationTime - a._creationTime);
        return policies;
    },
});
