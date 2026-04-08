/**
 * Compliance Component — Mutation Functions
 *
 * Write operations for consent records, DSAR requests, and policy versions.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// CONSENT — Mutations
// =============================================================================

/**
 * Create or update a consent record for a user + category.
 */
export const updateConsent = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        category: v.string(),
        isConsented: v.boolean(),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
        version: v.string(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const validCategories = ["marketing", "analytics", "thirdParty", "necessary"];
        if (!validCategories.includes(args.category)) {
            throw new Error(`Invalid consent category: ${args.category}. Must be one of: ${validCategories.join(", ")}`);
        }

        // "necessary" consent cannot be withdrawn
        if (args.category === "necessary" && !args.isConsented) {
            throw new Error("Necessary consent cannot be withdrawn");
        }

        const now = Date.now();

        const id = await ctx.db.insert("consentRecords", {
            tenantId: args.tenantId,
            userId: args.userId,
            category: args.category,
            isConsented: args.isConsented,
            consentedAt: now,
            withdrawnAt: args.isConsented ? undefined : now,
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
            version: args.version,
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});

// =============================================================================
// DSAR — Mutations
// =============================================================================

/**
 * Submit a new DSAR request.
 */
export const submitDSAR = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        requestType: v.string(),
        details: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const validTypes = ["access", "deletion", "rectification", "portability", "restriction"];
        if (!validTypes.includes(args.requestType)) {
            throw new Error(`Invalid DSAR request type: ${args.requestType}. Must be one of: ${validTypes.join(", ")}`);
        }

        const id = await ctx.db.insert("dsarRequests", {
            tenantId: args.tenantId,
            userId: args.userId,
            requestType: args.requestType,
            details: args.details,
            status: "submitted",
            submittedAt: Date.now(),
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});

/**
 * Update the status of a DSAR request.
 */
export const updateDSARStatus = mutation({
    args: {
        id: v.id("dsarRequests"),
        status: v.string(),
        processedBy: v.string(),
        responseData: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, status, processedBy, responseData }) => {
        const request = await ctx.db.get(id);
        if (!request) {
            throw new Error("DSAR request not found");
        }

        const validStatuses = ["submitted", "in_progress", "completed", "rejected"];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid DSAR status: ${status}. Must be one of: ${validStatuses.join(", ")}`);
        }

        const updates: Record<string, unknown> = {
            status,
            processedBy,
        };

        if (responseData !== undefined) {
            updates.responseData = responseData;
        }

        if (status === "completed" || status === "rejected") {
            updates.completedAt = Date.now();
        }

        await ctx.db.patch(id, updates);
        return { success: true };
    },
});

// =============================================================================
// POLICY VERSIONS — Mutations
// =============================================================================

/**
 * Publish a new policy version. Unpublishes the previous version of the same type.
 */
export const publishPolicy = mutation({
    args: {
        tenantId: v.string(),
        policyType: v.string(),
        title: v.string(),
        content: v.string(),
        version: v.string(),
        publishedBy: v.string(),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const validTypes = ["privacy", "terms", "cookies", "data_processing"];
        if (!validTypes.includes(args.policyType)) {
            throw new Error(`Invalid policy type: ${args.policyType}. Must be one of: ${validTypes.join(", ")}`);
        }

        // Find the current published version to link as previous
        const existing = await ctx.db
            .query("policyVersions")
            .withIndex("by_type", (q) =>
                q.eq("tenantId", args.tenantId).eq("policyType", args.policyType)
            )
            .collect();

        const currentPublished = existing.find((p) => p.isPublished);

        // Unpublish the current version
        if (currentPublished) {
            await ctx.db.patch(currentPublished._id, { isPublished: false });
        }

        const now = Date.now();

        const id = await ctx.db.insert("policyVersions", {
            tenantId: args.tenantId,
            policyType: args.policyType,
            version: args.version,
            title: args.title,
            content: args.content,
            isPublished: true,
            publishedAt: now,
            publishedBy: args.publishedBy,
            previousVersionId: currentPublished?._id,
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});

/**
 * Rollback to a previous policy version. Republishes the target version
 * and unpublishes the current one.
 */
export const rollbackPolicy = mutation({
    args: {
        id: v.id("policyVersions"),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const target = await ctx.db.get(id);
        if (!target) {
            throw new Error("Policy version not found");
        }

        // Find and unpublish the currently published version of the same type
        const currentVersions = await ctx.db
            .query("policyVersions")
            .withIndex("by_type", (q) =>
                q.eq("tenantId", target.tenantId).eq("policyType", target.policyType)
            )
            .collect();

        const currentPublished = currentVersions.find((p) => p.isPublished);
        if (currentPublished) {
            await ctx.db.patch(currentPublished._id, { isPublished: false });
        }

        // Republish the target version
        await ctx.db.patch(id, {
            isPublished: true,
            publishedAt: Date.now(),
        });

        return { success: true };
    },
});
