import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

/**
 * Compliance Facade
 * Delegates to components.compliance for consent management and DSAR requests.
 * Preserves api.domain.compliance.* paths for SDK hooks.
 */

// Get consent summary for a user
export const getConsentSummary = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, { userId }) => {
        return ctx.runQuery(components.compliance.queries.getConsentSummary, {
            userId,
        });
    },
});

// List consent records for a user
export const listConsent = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { userId, limit }) => {
        return ctx.runQuery(components.compliance.queries.listConsent, {
            userId,
            limit,
        });
    },
});

// Update a consent record
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
    handler: async (ctx, args) => {
        return ctx.runMutation(components.compliance.mutations.updateConsent, {
            tenantId: args.tenantId,
            userId: args.userId,
            category: args.category,
            isConsented: args.isConsented,
            ipAddress: args.ipAddress,
            userAgent: args.userAgent,
            version: args.version,
            metadata: args.metadata,
        });
    },
});

// Submit a DSAR (Data Subject Access Request) for data export
export const submitDSAR = mutation({
    args: {
        tenantId: v.string(),
        userId: v.string(),
        requestType: v.string(),
        details: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return ctx.runMutation(components.compliance.mutations.submitDSAR, {
            tenantId: args.tenantId,
            userId: args.userId,
            requestType: args.requestType,
            details: args.details,
            metadata: args.metadata,
        });
    },
});
