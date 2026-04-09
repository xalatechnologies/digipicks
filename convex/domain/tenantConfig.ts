import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import { requireActiveUser } from "../lib/auth";

/**
 * Tenant Config Facade
 * Delegates to components.tenantConfig for feature flags, branding, and theme.
 * Preserves api.domain.tenantConfig.* paths for SDK hooks.
 */

// Get all feature flags for a tenant
export const listFlags = query({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        return ctx.runQuery(components.tenantConfig.queries.listFlags, {
            tenantId: tenantId as string,
        });
    },
});

// Evaluate all flags for a tenant
export const evaluateAllFlags = query({
    args: {
        tenantId: v.id("tenants"),
        targetType: v.optional(v.string()),
        targetId: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, targetType, targetId }) => {
        return ctx.runQuery(components.tenantConfig.queries.evaluateAllFlags, {
            tenantId: tenantId as string,
            targetType,
            targetId,
        });
    },
});

// Get branding for a tenant
export const getBranding = query({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        return ctx.runQuery(components.tenantConfig.queries.getBranding, {
            tenantId: tenantId as string,
        });
    },
});

// Get theme CSS for a tenant
export const getThemeCSS = query({
    args: {
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { tenantId }) => {
        return ctx.runQuery(components.tenantConfig.queries.getThemeCSS, {
            tenantId: tenantId as string,
        });
    },
});

// Update branding for a tenant
export const updateBranding = mutation({
    args: {
        tenantId: v.id("tenants"),
        logoUrl: v.optional(v.string()),
        faviconUrl: v.optional(v.string()),
        primaryColor: v.optional(v.string()),
        secondaryColor: v.optional(v.string()),
        fontFamily: v.optional(v.string()),
        customCSS: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return ctx.runMutation(components.tenantConfig.mutations.updateBranding, {
            ...args,
            tenantId: args.tenantId as string,
        });
    },
});

// =============================================================================
// CREATOR BRANDING
// =============================================================================

// Get creator branding config
export const getCreatorBranding = query({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
    },
    handler: async (ctx, { tenantId, creatorId }) => {
        return ctx.runQuery(components.tenantConfig.queries.getCreatorBranding, {
            tenantId: tenantId as string,
            creatorId: creatorId as string,
        });
    },
});

// Get creator brand assets
export const listCreatorBrandAssets = query({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
    },
    handler: async (ctx, { tenantId, creatorId }) => {
        return ctx.runQuery(components.tenantConfig.queries.listCreatorBrandAssets, {
            tenantId: tenantId as string,
            creatorId: creatorId as string,
        });
    },
});

// Get creator theme CSS for injection
export const getCreatorThemeCSS = query({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
    },
    handler: async (ctx, { tenantId, creatorId }) => {
        return ctx.runQuery(components.tenantConfig.queries.getCreatorThemeCSS, {
            tenantId: tenantId as string,
            creatorId: creatorId as string,
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
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
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
        await requireActiveUser(ctx, args.creatorId);
        return ctx.runMutation(components.tenantConfig.mutations.updateCreatorBranding, {
            ...args,
            tenantId: args.tenantId as string,
            creatorId: args.creatorId as string,
        });
    },
});

// Upload creator brand asset
export const uploadCreatorBrandAsset = mutation({
    args: {
        tenantId: v.id("tenants"),
        creatorId: v.id("users"),
        assetType: v.string(),
        url: v.string(),
        alt: v.optional(v.string()),
        storageId: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await requireActiveUser(ctx, args.creatorId);
        return ctx.runMutation(components.tenantConfig.mutations.uploadCreatorBrandAsset, {
            ...args,
            tenantId: args.tenantId as string,
            creatorId: args.creatorId as string,
        });
    },
});

// Remove creator brand asset
export const removeCreatorBrandAsset = mutation({
    args: {
        id: v.string(),
        creatorId: v.id("users"),
    },
    handler: async (ctx, { id, creatorId }) => {
        await requireActiveUser(ctx, creatorId);
        return ctx.runMutation(components.tenantConfig.mutations.removeCreatorBrandAsset, {
            id: id as any,
        });
    },
});

// Set a theme override
export const setThemeOverride = mutation({
    args: {
        tenantId: v.id("tenants"),
        componentKey: v.string(),
        property: v.string(),
        value: v.string(),
    },
    handler: async (ctx, args) => {
        return ctx.runMutation(components.tenantConfig.mutations.setThemeOverride, {
            tenantId: args.tenantId as string,
            componentKey: args.componentKey,
            property: args.property,
            value: args.value,
        });
    },
});
