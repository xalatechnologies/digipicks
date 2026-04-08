import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import { withAudit } from "../lib/auditHelpers";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { emitEvent } from "../lib/eventBus";

/**
 * Addon Facade
 * Delegates to components.addons.queries.* / components.addons.mutations.* and enriches with core table data.
 * Preserves api.domain.addons.* paths for SDK hooks.
 *
 * NOTE: The backoffice assigns addons to a resource via metadata.selectedAddons
 * (array of { addonId, availabilityType, customPrice? }). This facade resolves
 * both the direct resourceAddons table entries AND metadata-based associations.
 */

// List addons for a tenant
export const list = query({
    args: {
        tenantId: v.id("tenants"),
        category: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { tenantId, category, isActive }) => {
        return ctx.runQuery(components.addons.queries.list, {
            tenantId: tenantId as string,
            category,
            isActive,
        });
    },
});

// Get addon by ID
export const get = query({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.addons.queries.get, {
            id: id as any,
        });
    },
});

// List addons for a resource
export const listForResource = query({
    args: {
        resourceId: v.string(),
    },
    handler: async (ctx, { resourceId }) => {
        // 1. Query addons component's resourceAddons table by resourceId
        const directAddons = await ctx.runQuery(
            components.addons.queries.listForResource,
            { resourceId: resourceId as string }
        );

        // 2. Also check resource metadata for selectedAddons (backoffice associations)
        let metadataAddons: any[] = [];
        try {
            const resource = await ctx.runQuery(
                components.resources.queries.get,
                { id: resourceId as any }
            );
            const selectedAddons = resource?.metadata?.selectedAddons;
            if (Array.isArray(selectedAddons) && selectedAddons.length > 0) {
                // Collect addon IDs from metadata
                const addonIds = selectedAddons
                    .map((a: any) => a.addonId)
                    .filter(Boolean);

                if (addonIds.length > 0) {
                    // Build a lookup for metadata overrides
                    const metaMap = new Map(
                        selectedAddons.map((a: any) => [a.addonId, a])
                    );

                    // Fetch each addon record from the addons component
                    const resolved = await Promise.all(
                        addonIds.map(async (addonId: string) => {
                            try {
                                return await ctx.runQuery(
                                    components.addons.queries.get,
                                    { id: addonId as any }
                                );
                            } catch {
                                return null;
                            }
                        })
                    );

                    // Map to ResourceAddon-like shape for SDK compatibility
                    for (const addon of resolved) {
                        if (!addon) continue;
                        const meta = metaMap.get(addon._id as string);
                        metadataAddons.push({
                            _id: `meta_${addon._id}`,
                            tenantId: addon.tenantId,
                            resourceId,
                            addonId: addon._id,
                            isRequired: meta?.availabilityType === "required",
                            isRecommended: meta?.availabilityType === "optional",
                            customPrice: meta?.customPrice,
                            displayOrder: addon.displayOrder ?? 999,
                            isActive: true,
                            addon,
                            effectivePrice: meta?.customPrice ?? addon.price ?? 0,
                        });
                    }
                }
            }
        } catch {
            // Resource not found or component error — continue with direct addons only
        }

        // 3. Merge and deduplicate (direct entries take priority by addonId)
        const directAddonIds = new Set(
            directAddons.map((ra: any) => ra.addonId as string)
        );
        const combined = [
            ...directAddons,
            ...metadataAddons.filter((ra: any) => !directAddonIds.has(ra.addonId as string)),
        ];

        // Sort by displayOrder
        combined.sort((a: any, b: any) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
        return combined;
    },
});

// Create addon
export const create = mutation({
    args: {
        tenantId: v.id("tenants"),
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        priceType: v.string(),
        price: v.number(),
        currency: v.string(),
        maxQuantity: v.optional(v.number()),
        requiresApproval: v.optional(v.boolean()),
        leadTimeHours: v.optional(v.number()),
        icon: v.optional(v.string()),
        images: v.optional(v.array(v.any())),
        displayOrder: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateAddon", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });
        const result = await ctx.runMutation(components.addons.mutations.create, {
            tenantId: args.tenantId as string,
            name: args.name,
            slug: args.slug,
            description: args.description,
            category: args.category,
            priceType: args.priceType,
            price: args.price,
            currency: args.currency,
            maxQuantity: args.maxQuantity,
            requiresApproval: args.requiresApproval,
            leadTimeHours: args.leadTimeHours,
            icon: args.icon,
            images: args.images,
            displayOrder: args.displayOrder,
            metadata: args.metadata,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "addon",
            entityId: (result as any).id ?? "",
            action: "created",
            sourceComponent: "addons",
            newState: { name: args.name, slug: args.slug, price: args.price },
        });

        await emitEvent(ctx, "addons.addon.created", args.tenantId as string, "addons", {
            addonId: (result as any).id ?? "", name: args.name,
        });

        return result;
    },
});

// Update addon
export const update = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        priceType: v.optional(v.string()),
        price: v.optional(v.number()),
        currency: v.optional(v.string()),
        maxQuantity: v.optional(v.number()),
        requiresApproval: v.optional(v.boolean()),
        leadTimeHours: v.optional(v.number()),
        icon: v.optional(v.string()),
        images: v.optional(v.array(v.any())),
        displayOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const existing = await ctx.runQuery(components.addons.queries.get, { id: id as any });
        if (existing) {
            await rateLimit(ctx, { name: "mutateAddon", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.addons.mutations.update, {
            id: id as any,
            ...updates,
        });

        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? (result as any)?.tenantId ?? "",
            entityType: "addon",
            entityId: id,
            action: "updated",
            sourceComponent: "addons",
        });

        await emitEvent(ctx, "addons.addon.updated", (existing as any)?.tenantId ?? (result as any)?.tenantId ?? "", "addons", {
            addonId: id,
        });

        return result;
    },
});

// Delete addon
export const remove = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.addons.queries.get, { id: id as any });
        if (existing) {
            await rateLimit(ctx, { name: "mutateAddon", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.addons.mutations.remove, {
            id: id as any,
        });

        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? (result as any)?.tenantId ?? "",
            entityType: "addon",
            entityId: id,
            action: "removed",
            sourceComponent: "addons",
        });

        await emitEvent(ctx, "addons.addon.removed", (existing as any)?.tenantId ?? (result as any)?.tenantId ?? "", "addons", {
            addonId: id,
        });

        return result;
    },
});

// Add addon to resource
export const addToResource = mutation({
    args: {
        tenantId: v.id("tenants"),
        resourceId: v.string(),
        addonId: v.string(),
        isRequired: v.optional(v.boolean()),
        isRecommended: v.optional(v.boolean()),
        customPrice: v.optional(v.number()),
        displayOrder: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(components.addons.mutations.addToResource, {
            tenantId: args.tenantId as string,
            resourceId: args.resourceId as string,
            addonId: args.addonId as any,
            isRequired: args.isRequired,
            isRecommended: args.isRecommended,
            customPrice: args.customPrice,
            displayOrder: args.displayOrder,
            metadata: args.metadata,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "resourceAddon",
            entityId: args.addonId,
            action: "added_to_resource",
            sourceComponent: "addons",
            newState: { resourceId: args.resourceId, addonId: args.addonId },
        });

        await emitEvent(ctx, "addons.resourceAddon.added", args.tenantId as string, "addons", {
            resourceId: args.resourceId, addonId: args.addonId,
        });

        return result;
    },
});

// Remove addon from resource
export const removeFromResource = mutation({
    args: {
        resourceId: v.string(),
        addonId: v.string(),
    },
    handler: async (ctx, { resourceId, addonId }) => {
        const addon = await ctx.runQuery(components.addons.queries.get, { id: addonId as any });
        if (addon) {
            await rateLimit(ctx, { name: "mutateAddon", key: rateLimitKeys.tenant((addon as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.addons.mutations.removeFromResource, {
            resourceId: resourceId as string,
            addonId: addonId as any,
        });

        await withAudit(ctx, {
            tenantId: (addon as any)?.tenantId ?? (result as any)?.tenantId ?? "",
            entityType: "resourceAddon",
            entityId: addonId,
            action: "removed_from_resource",
            sourceComponent: "addons",
            details: { resourceId },
        });

        await emitEvent(ctx, "addons.resourceAddon.removed", (addon as any)?.tenantId ?? (result as any)?.tenantId ?? "", "addons", {
            resourceId, addonId,
        });

        return result;
    },
});

// =============================================================================
// BOOKING-ADDON OPERATIONS
// =============================================================================

// List addons for a booking
export const listForBooking = query({
    args: {
        bookingId: v.string(),
    },
    handler: async (ctx, { bookingId }) => {
        return ctx.runQuery(components.addons.queries.listForBooking, {
            bookingId: bookingId as string,
        });
    },
});

// Add addon to a booking
export const addToBooking = mutation({
    args: {
        tenantId: v.id("tenants"),
        bookingId: v.string(),
        addonId: v.string(),
        quantity: v.number(),
        notes: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutateAddon", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });
        const result = await ctx.runMutation(components.addons.mutations.addToBooking, {
            tenantId: args.tenantId as string,
            bookingId: args.bookingId as string,
            addonId: args.addonId as any,
            quantity: args.quantity,
            notes: args.notes,
            metadata: args.metadata,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "bookingAddon",
            entityId: args.addonId,
            action: "added_to_booking",
            sourceComponent: "addons",
            newState: { bookingId: args.bookingId, quantity: args.quantity },
        });

        await emitEvent(ctx, "addons.bookingAddon.added", args.tenantId as string, "addons", {
            bookingId: args.bookingId, addonId: args.addonId, quantity: args.quantity,
        });

        return result;
    },
});

// Update a booking addon (quantity, notes)
export const updateBookingAddon = mutation({
    args: {
        id: v.string(),
        quantity: v.optional(v.number()),
        notes: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const result = await ctx.runMutation(components.addons.mutations.updateBookingAddon, {
            id: id as any,
            ...updates,
        });

        await withAudit(ctx, {
            tenantId: (result as any)?.tenantId ?? "",
            entityType: "bookingAddon",
            entityId: id,
            action: "updated",
            sourceComponent: "addons",
        });

        return result;
    },
});

// Remove addon from a booking
export const removeFromBooking = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const result = await ctx.runMutation(components.addons.mutations.removeFromBooking, {
            id: id as any,
        });

        await withAudit(ctx, {
            tenantId: (result as any)?.tenantId ?? "",
            entityType: "bookingAddon",
            entityId: id,
            action: "removed_from_booking",
            sourceComponent: "addons",
        });

        return result;
    },
});

// Approve a pending booking addon
export const approveBookingAddon = mutation({
    args: {
        id: v.string(),
    },
    handler: async (ctx, { id }) => {
        const result = await ctx.runMutation(components.addons.mutations.approve, {
            id: id as any,
        });

        await withAudit(ctx, {
            tenantId: (result as any)?.tenantId ?? "",
            entityType: "bookingAddon",
            entityId: id,
            action: "approved",
            sourceComponent: "addons",
        });

        await emitEvent(ctx, "addons.bookingAddon.approved", (result as any)?.tenantId ?? "", "addons", {
            bookingAddonId: id,
        });

        return result;
    },
});

// Reject a pending booking addon
export const rejectBookingAddon = mutation({
    args: {
        id: v.string(),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, { id, reason }) => {
        const result = await ctx.runMutation(components.addons.mutations.reject, {
            id: id as any,
            reason,
        });

        await withAudit(ctx, {
            tenantId: (result as any)?.tenantId ?? "",
            entityType: "bookingAddon",
            entityId: id,
            action: "rejected",
            sourceComponent: "addons",
            newState: { reason },
        });

        await emitEvent(ctx, "addons.bookingAddon.rejected", (result as any)?.tenantId ?? "", "addons", {
            bookingAddonId: id, reason,
        });

        return result;
    },
});
