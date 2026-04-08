/**
 * Disputes Component — Query Functions
 *
 * Read-only operations for disputes and dispute messages.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// DISPUTE QUERIES
// =============================================================================

export const listDisputes = query({
    args: {
        tenantId: v.string(),
        status: v.optional(v.string()),
        filedByUserId: v.optional(v.string()),
        respondentUserId: v.optional(v.string()),
        mediatorUserId: v.optional(v.string()),
        category: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, status, filedByUserId, respondentUserId, mediatorUserId, category, limit = 50 }) => {
        if (status) {
            return ctx.db
                .query("disputes")
                .withIndex("by_tenant_status", (q) => q.eq("tenantId", tenantId).eq("status", status))
                .order("desc")
                .take(limit);
        }
        if (filedByUserId) {
            return ctx.db
                .query("disputes")
                .withIndex("by_tenant_filed_by", (q) => q.eq("tenantId", tenantId).eq("filedByUserId", filedByUserId))
                .order("desc")
                .take(limit);
        }
        if (respondentUserId) {
            return ctx.db
                .query("disputes")
                .withIndex("by_tenant_respondent", (q) => q.eq("tenantId", tenantId).eq("respondentUserId", respondentUserId))
                .order("desc")
                .take(limit);
        }
        if (mediatorUserId) {
            return ctx.db
                .query("disputes")
                .withIndex("by_tenant_mediator", (q) => q.eq("tenantId", tenantId).eq("mediatorUserId", mediatorUserId))
                .order("desc")
                .take(limit);
        }
        if (category) {
            return ctx.db
                .query("disputes")
                .withIndex("by_tenant_category", (q) => q.eq("tenantId", tenantId).eq("category", category))
                .order("desc")
                .take(limit);
        }
        return ctx.db
            .query("disputes")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .order("desc")
            .take(limit);
    },
});

export const getDispute = query({
    args: { id: v.id("disputes") },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        return await ctx.db.get(id);
    },
});

export const listDisputeMessages = query({
    args: {
        disputeId: v.id("disputes"),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { disputeId, limit = 100 }) => {
        return await ctx.db
            .query("disputeMessages")
            .withIndex("by_dispute", (q) => q.eq("disputeId", disputeId))
            .order("asc")
            .take(limit);
    },
});

export const getDisputeCounts = query({
    args: { tenantId: v.string() },
    returns: v.any(),
    handler: async (ctx, { tenantId }) => {
        const all = await ctx.db
            .query("disputes")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();

        const counts: Record<string, number> = {
            all: all.length,
            open: 0,
            under_review: 0,
            awaiting_evidence: 0,
            resolved: 0,
            appealed: 0,
            closed: 0,
        };

        for (const dispute of all) {
            if (counts[dispute.status] !== undefined) {
                counts[dispute.status]++;
            }
        }

        return counts;
    },
});
