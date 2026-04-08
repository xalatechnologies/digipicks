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

// =============================================================================
// CREATOR BRANDING
// =============================================================================

// Get creator branding config
export const getCreatorBranding = query({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
    },
    handler: async (ctx, { tenantId, creatorId }) => {
        return ctx.runQuery(components.tenantConfig.queries.getCreatorBranding, {
            tenantId,
            creatorId,
        });
    },
});

// Get creator brand assets
export const listCreatorBrandAssets = query({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
    },
    handler: async (ctx, { tenantId, creatorId }) => {
        return ctx.runQuery(components.tenantConfig.queries.listCreatorBrandAssets, {
            tenantId,
            creatorId,
        });
    },
});

// Get creator theme CSS for injection
export const getCreatorThemeCSS = query({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
    },
    handler: async (ctx, { tenantId, creatorId }) => {
        return ctx.runQuery(components.tenantConfig.queries.getCreatorThemeCSS, {
            tenantId,
            creatorId,
        });
    },
});

// Resolve creator from custom domain
export const getCreatorByCustomDomain = query({
    args: {
        domain: v.string(),
    },
    handler: async (ctx, { domain }) => {
        return ctx.runQuery(components.tenantConfig.queries.getCreatorByCustomDomain, {
            domain,
        });
    },
});

// Update creator branding
export const updateCreatorBranding = mutation({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
        primaryColor: v.optional(v.string()),
        secondaryColor: v.optional(v.string()),
        accentColor: v.optional(v.string()),
        fontFamily: v.optional(v.string()),
        borderRadius: v.optional(v.string()),
        darkMode: v.optional(v.boolean()),
        customCSS: v.optional(v.string()),
        displayName: v.optional(v.string()),
        tagline: v.optional(v.string()),
        customDomain: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return ctx.runMutation(components.tenantConfig.mutations.updateCreatorBranding, args);
    },
});

// Upload creator brand asset
export const uploadCreatorBrandAsset = mutation({
    args: {
        tenantId: v.string(),
        creatorId: v.string(),
        assetType: v.string(),
        url: v.string(),
        alt: v.optional(v.string()),
        storageId: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return ctx.runMutation(components.tenantConfig.mutations.uploadCreatorBrandAsset, args);
    },
});

// Remove creator brand asset
export const removeCreatorBrandAsset = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        return ctx.runMutation(components.tenantConfig.mutations.removeCreatorBrandAsset, {
            id: id as any,
        });
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
