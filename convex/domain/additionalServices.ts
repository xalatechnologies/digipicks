import { query, mutation } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import { withAudit } from "../lib/auditHelpers";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { emitEvent } from "../lib/eventBus";

/**
 * Additional Services Facade
 * Delegates to components.pricing.queries.* / components.pricing.mutations.* (additional services are in the pricing component).
 * Preserves api.domain.additionalServices.* paths for SDK hooks.
 *
 * NOTE: The backoffice assigns services to a resource via metadata.selectedServices
 * (array of { serviceId, availabilityType, customPrice? }). This facade resolves
 * both the direct component table entries AND metadata-based associations.
 */

// List additional services for a resource
export const listByResource = query({
    args: {
        resourceId: v.string(),
    },
    handler: async (ctx, { resourceId }) => {
        // 1. Query pricing component's additionalServices table by resourceId
        const directServices = await ctx.runQuery(
            components.pricing.queries.listAdditionalServices,
            { resourceId: resourceId as string }
        );

        // 2. Also check resource metadata for selectedServices (backoffice associations)
        let metadataServices: any[] = [];
        try {
            const resource = await ctx.runQuery(
                components.resources.queries.get,
                { id: resourceId as any }
            );
            const selectedServices = resource?.metadata?.selectedServices;
            if (Array.isArray(selectedServices) && selectedServices.length > 0) {
                const serviceIds = new Set(
                    selectedServices.map((s: any) => s.serviceId).filter(Boolean)
                );

                if (serviceIds.size > 0 && resource.tenantId) {
                    // Get all services for this tenant
                    const allTenantServices = await ctx.runQuery(
                        components.pricing.queries.listAdditionalServicesByTenant,
                        { tenantId: resource.tenantId as string }
                    );

                    // Build a lookup for metadata overrides (customPrice, availabilityType)
                    const metaMap = new Map(
                        selectedServices.map((s: any) => [s.serviceId, s])
                    );

                    // Filter to only the referenced service IDs
                    metadataServices = allTenantServices
                        .filter((svc: any) => serviceIds.has(svc._id as string))
                        .map((svc: any) => {
                            const meta = metaMap.get(svc._id as string);
                            return {
                                ...svc,
                                // Apply custom price from backoffice if set
                                price: meta?.customPrice ?? svc.price,
                                // Mark as required if backoffice set it
                                isRequired: meta?.availabilityType === "required"
                                    ? true
                                    : svc.isRequired,
                            };
                        });
                }
            }
        } catch {
            // Resource not found or component error — continue with direct services only
        }

        // 3. Merge and deduplicate (direct entries take priority)
        const directIds = new Set(directServices.map((s: any) => s._id as string));
        const combined = [
            ...directServices,
            ...metadataServices.filter((s: any) => !directIds.has(s._id as string)),
        ];

        // Sort by displayOrder
        combined.sort((a: any, b: any) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
        return combined;
    },
});

// List all additional services for a tenant
export const listByTenant = query({
    args: {
        tenantId: v.id("tenants"),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { tenantId, isActive }) => {
        return ctx.runQuery(components.pricing.queries.listAdditionalServicesByTenant, {
            tenantId: tenantId as string,
            isActive,
        });
    },
});

// Get a single additional service by ID
export const get = query({
    args: {
        serviceId: v.string(),
    },
    handler: async (_ctx, { serviceId: _serviceId }) => {
        // The pricing component's getAdditionalService/getAdditionalServicesByIds
        // queries require type regeneration (npx convex dev). Until then, use
        // listByResource or listByTenant to find additional services.
        throw new Error("Use listByResource or listByTenant to find additional services");
    },
});

// Create a new additional service
export const create = mutation({
    args: {
        tenantId: v.id("tenants"),
        resourceId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        price: v.number(),
        currency: v.optional(v.string()),
        isRequired: v.optional(v.boolean()),
        displayOrder: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });
        const result = await ctx.runMutation(components.pricing.mutations.createAdditionalService, {
            tenantId: args.tenantId as string,
            resourceId: args.resourceId as string,
            name: args.name,
            description: args.description,
            price: args.price,
            currency: args.currency,
            isRequired: args.isRequired,
            displayOrder: args.displayOrder,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "additionalService",
            entityId: (result as any).id ?? args.resourceId,
            action: "created",
            sourceComponent: "pricing",
            newState: { name: args.name, price: args.price, resourceId: args.resourceId },
        });

        await emitEvent(ctx, "pricing.service.created", args.tenantId as string, "pricing", {
            serviceId: (result as any).id ?? args.resourceId, resourceId: args.resourceId, name: args.name,
        });

        return result;
    },
});

// Update an additional service
export const update = mutation({
    args: {
        serviceId: v.string(),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        price: v.optional(v.number()),
        currency: v.optional(v.string()),
        isRequired: v.optional(v.boolean()),
        displayOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { serviceId, ...updates }) => {
        // No getAdditionalService query available — use general rate limit
        await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.user("system"), throws: true });
        const result = await ctx.runMutation(components.pricing.mutations.updateAdditionalService, {
            id: serviceId as any,
            ...updates,
        });

        await withAudit(ctx, {
            tenantId: (result as any)?.tenantId ?? "",
            entityType: "additionalService",
            entityId: serviceId,
            action: "updated",
            sourceComponent: "pricing",
        });

        await emitEvent(ctx, "pricing.service.updated", (result as any)?.tenantId ?? "", "pricing", {
            serviceId,
        });

        return result;
    },
});

// Delete an additional service (soft delete by setting isActive to false)
export const remove = mutation({
    args: {
        serviceId: v.string(),
    },
    handler: async (ctx, { serviceId }) => {
        // No getAdditionalService query available — use general rate limit
        await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.user("system"), throws: true });
        const result = await ctx.runMutation(components.pricing.mutations.removeAdditionalService, {
            id: serviceId as any,
        });

        await withAudit(ctx, {
            tenantId: (result as any)?.tenantId ?? "",
            entityType: "additionalService",
            entityId: serviceId,
            action: "removed",
            sourceComponent: "pricing",
        });

        await emitEvent(ctx, "pricing.service.removed", (result as any)?.tenantId ?? "", "pricing", {
            serviceId,
        });

        return result;
    },
});
