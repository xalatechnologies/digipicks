import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

/**
 * Tenant Config Facade
 * Delegates to components.tenantConfig for feature flags, branding, and theme.
 * Preserves api.domain.tenantConfig.* paths for SDK hooks.
 */

// Get all feature flags for a tenant
export const listFlags = query({
    args: {
        tenantId: v.string(),
    },
    handler: async (ctx, { tenantId }) => {
        return ctx.runQuery(components.tenantConfig.queries.listFlags, {
            tenantId,
        });
    },
});

// Evaluate all flags for a tenant
export const evaluateAllFlags = query({
    args: {
        tenantId: v.string(),
        targetType: v.optional(v.string()),
        targetId: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, targetType, targetId }) => {
        return ctx.runQuery(components.tenantConfig.queries.evaluateAllFlags, {
            tenantId,
            targetType,
            targetId,
        });
    },
});

// Get branding for a tenant
export const getBranding = query({
    args: {
        tenantId: v.string(),
    },
    handler: async (ctx, { tenantId }) => {
        return ctx.runQuery(components.tenantConfig.queries.getBranding, {
            tenantId,
        });
    },
});

// Get theme CSS for a tenant
export const getThemeCSS = query({
    args: {
        tenantId: v.string(),
    },
    handler: async (ctx, { tenantId }) => {
        return ctx.runQuery(components.tenantConfig.queries.getThemeCSS, {
            tenantId,
        });
    },
});

// Update branding for a tenant
export const updateBranding = mutation({
    args: {
        tenantId: v.string(),
        logoUrl: v.optional(v.string()),
        faviconUrl: v.optional(v.string()),
        primaryColor: v.optional(v.string()),
        secondaryColor: v.optional(v.string()),
        fontFamily: v.optional(v.string()),
        customCSS: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return ctx.runMutation(components.tenantConfig.mutations.updateBranding, args);
    },
});

// Set a theme override
export const setThemeOverride = mutation({
    args: {
        tenantId: v.string(),
        componentKey: v.string(),
        property: v.string(),
        value: v.string(),
    },
    handler: async (ctx, args) => {
        return ctx.runMutation(components.tenantConfig.mutations.setThemeOverride, {
            tenantId: args.tenantId,
            componentKey: args.componentKey,
            property: args.property,
            value: args.value,
        });
    },
});
