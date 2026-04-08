/**
 * Pricing Facade
 *
 * Thin facade that delegates to the pricing component.
 * Preserves the existing API path (api.domain.pricing.*) for SDK compatibility.
 * Handles:
 *   - ID type conversion (typed Id<"tenants"> -> string for component)
 *   - Resource lookups (to get tenantId / categoryKey for price calculations)
 *   - Audit logging via audit component
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import { requireActiveUser } from "../lib/auth";
import { withAudit } from "../lib/auditHelpers";
import { rateLimit, rateLimitKeys } from "../lib/rateLimits";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// Shared validators (mirror component-level validators for facade args)
// =============================================================================

const surchargeTypeValidator = v.union(
    v.literal("percent"),
    v.literal("fixed"),
    v.literal("multiplier")
);

const discountTypeValidator = v.union(
    v.literal("percent"),
    v.literal("fixed"),
    v.literal("free_hours")
);

// =============================================================================
// PRICING GROUPS
// =============================================================================

/**
 * List pricing groups for a tenant.
 */
export const listGroups = query({
    args: {
        tenantId: v.id("tenants"),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { tenantId, isActive }) => {
        return ctx.runQuery(components.pricing.queries.listGroups, {
            tenantId: tenantId as string,
            isActive,
        });
    },
});

/**
 * Get a single pricing group by ID.
 */
export const getGroup = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.pricing.queries.getGroup, { id });
    },
});

/**
 * Create a pricing group.
 */
export const createGroup = mutation({
    args: {
        tenantId: v.id("tenants"),
        name: v.string(),
        description: v.optional(v.string()),
        groupType: v.optional(v.string()),
        discountPercent: v.optional(v.number()),
        discountAmount: v.optional(v.number()),
        applicableBookingModes: v.optional(v.array(v.string())),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        isDefault: v.optional(v.boolean()),
        priority: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });
        const result = await ctx.runMutation(components.pricing.mutations.createGroup, {
            tenantId: args.tenantId as string,
            name: args.name,
            description: args.description,
            groupType: args.groupType,
            discountPercent: args.discountPercent,
            discountAmount: args.discountAmount,
            applicableBookingModes: args.applicableBookingModes,
            validFrom: args.validFrom,
            validUntil: args.validUntil,
            isDefault: args.isDefault,
            priority: args.priority,
            metadata: args.metadata,
        });

        // Audit
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "pricingGroup",
            entityId: result.id as string,
            action: "created",
            sourceComponent: "pricing",
            newState: { name: args.name },
        });

        await emitEvent(ctx, "pricing.group.created", args.tenantId as string, "pricing", {
            groupId: result.id as string, name: args.name,
        });

        return result;
    },
});

/**
 * Update a pricing group.
 */
export const updateGroup = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        groupType: v.optional(v.string()),
        discountPercent: v.optional(v.number()),
        discountAmount: v.optional(v.number()),
        applicableBookingModes: v.optional(v.array(v.string())),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        isDefault: v.optional(v.boolean()),
        priority: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const group = await ctx.runQuery(components.pricing.queries.getGroup, { id });
        if (group) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((group as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.mutations.updateGroup, {
            id,
            ...updates,
        });
        await withAudit(ctx, {
            tenantId: (group as any)?.tenantId ?? "",
            entityType: "pricingGroup",
            entityId: id,
            action: "updated",
            sourceComponent: "pricing",
        });

        await emitEvent(ctx, "pricing.group.updated", (group as any)?.tenantId ?? "", "pricing", {
            groupId: id,
        });

        return result;
    },
});

/**
 * Remove a pricing group.
 */
export const removeGroup = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const group = await ctx.runQuery(components.pricing.queries.getGroup, { id });
        if (group) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((group as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.mutations.removeGroup, { id });
        await withAudit(ctx, {
            tenantId: (group as any)?.tenantId ?? "",
            entityType: "pricingGroup",
            entityId: id,
            action: "removed",
            sourceComponent: "pricing",
        });

        await emitEvent(ctx, "pricing.group.removed", (group as any)?.tenantId ?? "", "pricing", {
            groupId: id,
        });

        return result;
    },
});

// =============================================================================
// RESOURCE PRICING
// =============================================================================

/**
 * List pricing configurations for a resource.
 */
export const listForResource = query({
    args: {
        resourceId: v.string(),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { resourceId, isActive }) => {
        return ctx.runQuery(components.pricing.queries.listForResource, {
            resourceId: resourceId as string,
            isActive,
        });
    },
});

/**
 * List all resource pricing for a tenant.
 */
export const listByTenant = query({
    args: {
        tenantId: v.id("tenants"),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { tenantId, isActive }) => {
        const entries = await ctx.runQuery(components.pricing.queries.listByTenant, {
            tenantId: tenantId as string,
            isActive,
        });
        // Enrich with resource names from resources component
        const resourceIds = [...new Set((entries as any[]).map((e: any) => e.resourceId as string))];
        const resources = await Promise.all(
            resourceIds.map((id) =>
                ctx.runQuery(components.resources.queries.get, { id }).catch(() => null)
            )
        );
        const nameMap = new Map<string, string>();
        for (const r of resources) {
            if (r && (r as any)._id && (r as any).name) {
                nameMap.set((r as any)._id, (r as any).name);
            }
        }
        return (entries as any[]).map((entry: any) => ({
            ...entry,
            resourceName: nameMap.get(entry.resourceId) ?? entry.resourceId,
        }));
    },
});

/**
 * Get a single resource pricing entry.
 */
export const get = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.pricing.queries.get, { id });
    },
});

/**
 * Create resource pricing.
 */
export const create = mutation({
    args: {
        tenantId: v.id("tenants"),
        resourceId: v.string(),
        pricingGroupId: v.optional(v.string()),
        priceType: v.string(),
        basePrice: v.number(),
        currency: v.string(),
        pricePerHour: v.optional(v.number()),
        pricePerDay: v.optional(v.number()),
        pricePerHalfDay: v.optional(v.number()),
        pricePerPerson: v.optional(v.number()),
        pricePerPersonHour: v.optional(v.number()),
        slotOptions: v.optional(v.array(v.any())),
        minDuration: v.optional(v.number()),
        maxDuration: v.optional(v.number()),
        minPeople: v.optional(v.number()),
        maxPeople: v.optional(v.number()),
        minAge: v.optional(v.number()),
        maxAge: v.optional(v.number()),
        slotDurationMinutes: v.optional(v.number()),
        advanceBookingDays: v.optional(v.number()),
        sameDayBookingAllowed: v.optional(v.boolean()),
        cancellationHours: v.optional(v.number()),
        applicableBookingModes: v.optional(v.array(v.string())),
        depositAmount: v.optional(v.number()),
        cleaningFee: v.optional(v.number()),
        serviceFee: v.optional(v.number()),
        taxRate: v.optional(v.number()),
        taxIncluded: v.optional(v.boolean()),
        weekendMultiplier: v.optional(v.number()),
        peakHoursMultiplier: v.optional(v.number()),
        holidayMultiplier: v.optional(v.number()),
        enableDiscountCodes: v.optional(v.boolean()),
        enableSurcharges: v.optional(v.boolean()),
        enablePriceGroups: v.optional(v.boolean()),
        rules: v.optional(v.any()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });
        const result = await ctx.runMutation(components.pricing.mutations.create, {
            tenantId: args.tenantId as string,
            resourceId: args.resourceId as string,
            pricingGroupId: args.pricingGroupId as string | undefined,
            priceType: args.priceType,
            basePrice: args.basePrice,
            currency: args.currency,
            pricePerHour: args.pricePerHour,
            pricePerDay: args.pricePerDay,
            pricePerHalfDay: args.pricePerHalfDay,
            pricePerPerson: args.pricePerPerson,
            pricePerPersonHour: args.pricePerPersonHour,
            slotOptions: args.slotOptions,
            minDuration: args.minDuration,
            maxDuration: args.maxDuration,
            minPeople: args.minPeople,
            maxPeople: args.maxPeople,
            minAge: args.minAge,
            maxAge: args.maxAge,
            slotDurationMinutes: args.slotDurationMinutes,
            advanceBookingDays: args.advanceBookingDays,
            sameDayBookingAllowed: args.sameDayBookingAllowed,
            cancellationHours: args.cancellationHours,
            applicableBookingModes: args.applicableBookingModes,
            depositAmount: args.depositAmount,
            cleaningFee: args.cleaningFee,
            serviceFee: args.serviceFee,
            taxRate: args.taxRate,
            taxIncluded: args.taxIncluded,
            weekendMultiplier: args.weekendMultiplier,
            peakHoursMultiplier: args.peakHoursMultiplier,
            holidayMultiplier: args.holidayMultiplier,
            enableDiscountCodes: args.enableDiscountCodes,
            enableSurcharges: args.enableSurcharges,
            enablePriceGroups: args.enablePriceGroups,
            rules: args.rules,
            metadata: args.metadata,
        });

        // Audit
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "resourcePricing",
            entityId: result.id as string,
            action: "created",
            sourceComponent: "pricing",
            newState: { resourceId: args.resourceId as string, priceType: args.priceType },
        });

        await emitEvent(ctx, "pricing.resourcePricing.created", args.tenantId as string, "pricing", {
            pricingId: result.id as string, resourceId: args.resourceId as string,
        });

        return result;
    },
});

/**
 * Update resource pricing.
 */
export const update = mutation({
    args: {
        id: v.string(),
        priceType: v.optional(v.string()),
        basePrice: v.optional(v.number()),
        currency: v.optional(v.string()),
        pricingGroupId: v.optional(v.string()),
        pricePerHour: v.optional(v.number()),
        pricePerDay: v.optional(v.number()),
        pricePerHalfDay: v.optional(v.number()),
        pricePerPerson: v.optional(v.number()),
        pricePerPersonHour: v.optional(v.number()),
        slotOptions: v.optional(v.array(v.any())),
        minDuration: v.optional(v.number()),
        maxDuration: v.optional(v.number()),
        minPeople: v.optional(v.number()),
        maxPeople: v.optional(v.number()),
        minAge: v.optional(v.number()),
        maxAge: v.optional(v.number()),
        slotDurationMinutes: v.optional(v.number()),
        advanceBookingDays: v.optional(v.number()),
        sameDayBookingAllowed: v.optional(v.boolean()),
        cancellationHours: v.optional(v.number()),
        applicableBookingModes: v.optional(v.array(v.string())),
        depositAmount: v.optional(v.number()),
        cleaningFee: v.optional(v.number()),
        serviceFee: v.optional(v.number()),
        taxRate: v.optional(v.number()),
        taxIncluded: v.optional(v.boolean()),
        weekendMultiplier: v.optional(v.number()),
        peakHoursMultiplier: v.optional(v.number()),
        holidayMultiplier: v.optional(v.number()),
        enableDiscountCodes: v.optional(v.boolean()),
        enableSurcharges: v.optional(v.boolean()),
        enablePriceGroups: v.optional(v.boolean()),
        rules: v.optional(v.any()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const entry = await ctx.runQuery(components.pricing.queries.get, { id });
        if (entry) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((entry as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.mutations.update, {
            id,
            ...updates,
        });
        await withAudit(ctx, {
            tenantId: (entry as any)?.tenantId ?? "",
            entityType: "resourcePricing",
            entityId: id,
            action: "updated",
            sourceComponent: "pricing",
        });

        await emitEvent(ctx, "pricing.resourcePricing.updated", (entry as any)?.tenantId ?? "", "pricing", {
            pricingId: id,
        });

        return result;
    },
});

/**
 * Remove resource pricing.
 */
export const remove = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const entry = await ctx.runQuery(components.pricing.queries.get, { id });
        if (entry) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((entry as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.mutations.remove, { id });
        await withAudit(ctx, {
            tenantId: (entry as any)?.tenantId ?? "",
            entityType: "resourcePricing",
            entityId: id,
            action: "removed",
            sourceComponent: "pricing",
        });

        await emitEvent(ctx, "pricing.resourcePricing.removed", (entry as any)?.tenantId ?? "", "pricing", {
            pricingId: id,
        });

        return result;
    },
});

// =============================================================================
// PRICE CALCULATION
// =============================================================================

/**
 * Calculate price for a booking (simple).
 * Looks up resource to validate existence, then delegates.
 */
export const calculatePrice = query({
    args: {
        resourceId: v.string(),
        startTime: v.number(),
        endTime: v.number(),
        userId: v.optional(v.id("users")),
        organizationId: v.optional(v.id("organizations")),
        addonIds: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        // Validate resource exists via resources component
        const resource = await ctx.runQuery(components.resources.queries.get, {
            id: args.resourceId as string,
        });

        if (!resource) {
            throw new Error("Resource not found");
        }

        return ctx.runQuery(components.pricing.calculations.calculatePrice, {
            resourceId: args.resourceId as string,
            startTime: args.startTime,
            endTime: args.endTime,
            userId: args.userId as string | undefined,
            organizationId: args.organizationId as string | undefined,
            // Note: addonIds are external addons; the component uses additionalServiceIds
            // For now, pass undefined — component handles its own additional services
        });
    },
});

/**
 * Calculate price with full breakdown including surcharges, discounts, and tax.
 * Looks up resource from resources component to get tenantId and categoryKey.
 */
export const calculatePriceWithBreakdown = query({
    args: {
        resourceId: v.string(),
        bookingMode: v.string(),
        durationMinutes: v.number(),
        attendees: v.number(),
        tickets: v.optional(v.number()),
        priceGroupId: v.optional(v.string()),
        selectedSlotMinutes: v.optional(v.number()),
        bookingDate: v.optional(v.number()),
        bookingTime: v.optional(v.string()),
        discountCode: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        organizationId: v.optional(v.id("organizations")),
    },
    handler: async (ctx, args) => {
        // Look up resource to get tenantId and categoryKey
        const resource = await ctx.runQuery(components.resources.queries.get, {
            id: args.resourceId as string,
        });

        if (!resource) {
            return {
                items: [],
                surcharges: [],
                subtotal: 0,
                surchargeTotal: 0,
                subtotalWithSurcharges: 0,
                discounts: [],
                totalDiscountAmount: 0,
                subtotalAfterDiscount: 0,
                taxAmount: 0,
                taxRate: 0.25,
                total: 0,
                currency: "NOK",
                deposit: undefined,
                summary: "Pris på forespørsel",
                explanation: "Ressursen ble ikke funnet.",
                pricingModel: "per_booking",
                validation: { valid: false, errors: ["Ressursen ble ikke funnet"] },
                slotOptions: [],
                constraints: {},
            };
        }

        const result: any = await ctx.runQuery(components.pricing.calculations.calculatePriceWithBreakdown, {
            tenantId: (resource as any).tenantId,
            resourceId: args.resourceId as string,
            resourceCategoryKey: (resource as any).categoryKey,
            bookingMode: args.bookingMode,
            durationMinutes: args.durationMinutes,
            attendees: args.attendees,
            tickets: args.tickets,
            priceGroupId: args.priceGroupId,
            selectedSlotMinutes: args.selectedSlotMinutes,
            bookingDate: args.bookingDate,
            bookingTime: args.bookingTime,
            discountCode: args.discountCode,
            userId: args.userId as string | undefined,
            organizationId: args.organizationId as string | undefined,
        });

        // If the component found no resourcePricing entries, fall back to
        // the admin's pricingRules saved on the resource metadata.
        const r = resource as any;
        const pricingRules = r.metadata?.pricingRules;
        if (result?.validation?.valid === false &&
            result?.validation?.errors?.[0] === "Ingen priskonfigurasjon funnet" &&
            pricingRules?.groupPrices) {

            const groupPrices = pricingRules.groupPrices as Record<string, any>;
            // Find the applicable base price
            let basePrice = 0;
            let groupName = "Standard";
            const pricing = r.pricing;

            if (args.priceGroupId && groupPrices[args.priceGroupId]) {
                const gp = groupPrices[args.priceGroupId];
                basePrice = gp.pricePerHour ?? gp.pricePerDay ?? gp.basePrice ?? 0;
                // Try to get group name
                const group: any = await ctx.runQuery(components.pricing.queries.getGroup, {
                    id: args.priceGroupId as any,
                });
                if (group) groupName = group.name;
            } else {
                // Use the first selected group or resource base price
                const firstGroupId = pricingRules.pricingGroupIds?.[0];
                if (firstGroupId && groupPrices[firstGroupId]) {
                    const gp = groupPrices[firstGroupId];
                    basePrice = gp.pricePerHour ?? gp.pricePerDay ?? gp.basePrice ?? 0;
                } else {
                    basePrice = pricing?.basePrice ?? pricing?.hourlyRate ?? 0;
                }
            }

            // Price is per slot (booking interval), not per hour
            const slotMinutes = r.bookingConfig?.slotDurationMinutes
                ?? r.metadata?.bookingConfig?.slotDurationMinutes
                ?? 60;
            const slotHours = slotMinutes / 60;
            const numSlots = Math.max(1, Math.round(args.durationMinutes / slotMinutes));
            const subtotal = Math.round(basePrice * numSlots);
            const taxRate = 0.25;
            const taxAmount = Math.round(subtotal * taxRate);
            const total = subtotal + taxAmount;

            const slotLabel = slotHours === 1 ? "time" : `${slotHours}t`;

            return {
                items: [{
                    label: groupName,
                    amount: subtotal,
                    unitPrice: basePrice,
                    quantity: numSlots,
                    unit: slotLabel,
                }],
                surcharges: [],
                subtotal,
                surchargeTotal: 0,
                subtotalWithSurcharges: subtotal,
                discounts: [],
                totalDiscountAmount: 0,
                subtotalAfterDiscount: subtotal,
                taxAmount,
                taxRate,
                total,
                currency: pricing?.currency ?? "NOK",
                deposit: undefined,
                summary: `${total} NOK inkl. mva`,
                explanation: `${groupName}: ${numSlots} × ${basePrice} NOK`,
                pricingModel: "per_hour",
                validation: { valid: true, errors: [] },
                slotOptions: [],
                constraints: {},
            };
        }

        return result;
    },
});

/**
 * Get pricing configuration for a resource (for display purposes).
 */
export const getResourcePricingConfig = query({
    args: {
        resourceId: v.string(),
        bookingMode: v.optional(v.string()),
    },
    handler: async (ctx, { resourceId, bookingMode }) => {
        return ctx.runQuery(components.pricing.queries.getResourcePricingConfig, {
            resourceId: resourceId as string,
            bookingMode,
        });
    },
});

/**
 * Get all pricing groups applicable to a resource (for selection in UI).
 *
 * Priority: resource metadata.pricingRules (admin wizard config) first,
 * then falls back to resourcePricing component table (seed/legacy data).
 */
export const getResourcePriceGroups = query({
    args: {
        resourceId: v.string(),
        bookingMode: v.optional(v.string()),
    },
    handler: async (ctx, { resourceId, bookingMode }) => {
        // Look up resource to get tenantId and metadata
        const resource = await ctx.runQuery(components.resources.queries.get, {
            id: resourceId as string,
        });

        if (!resource) {
            return [];
        }

        const r = resource as any;
        const tenantId = r.tenantId as string;

        // Check if the admin configured pricing rules via the wizard
        const pricingRules = r.metadata?.pricingRules;
        const groupIds: string[] = pricingRules?.pricingGroupIds ?? [];
        const groupPrices: Record<string, any> = pricingRules?.groupPrices ?? {};

        if (groupIds.length > 0) {
            // Fetch all tenant pricing groups in one call, then filter
            const allGroups = await ctx.runQuery(
                components.pricing.queries.listGroups,
                { tenantId, isActive: true },
            );
            const groupMap = new Map(
                (allGroups as any[]).map((g: any) => [String(g._id), g]),
            );

            const results: Array<{
                id: string;
                name: string;
                description?: string;
                basePrice: number;
                pricePerHour?: number;
                pricePerDay?: number;
                pricePerWeek?: number;
                pricePerMonth?: number;
                currency: string;
                isDefault: boolean;
                priority: number;
            }> = [];

            for (const gid of groupIds) {
                const group = groupMap.get(gid);
                if (!group) continue;
                const prices = groupPrices[gid] ?? {};
                results.push({
                    id: gid,
                    name: (group as any).name,
                    description: (group as any).description,
                    basePrice: prices.pricePerHour ?? prices.pricePerDay ?? prices.pricePerWeek ?? prices.pricePerMonth ?? prices.basePrice ?? 0,
                    pricePerHour: prices.pricePerHour,
                    pricePerDay: prices.pricePerDay,
                    pricePerWeek: prices.pricePerWeek,
                    pricePerMonth: prices.pricePerMonth,
                    currency: "NOK",
                    isDefault: (group as any).isDefault ?? false,
                    priority: (group as any).priority ?? 0,
                });
            }

            results.sort((a, b) => a.priority - b.priority);
            return results;
        }

        // Fallback: read from resourcePricing component table
        return ctx.runQuery(components.pricing.queries.getResourcePriceGroups, {
            resourceId: resourceId as string,
            tenantId,
            bookingMode,
        });
    },
});

/**
 * Get applicable surcharges for a booking.
 * Looks up resource to get tenantId and categoryKey, then delegates.
 */
export const getApplicableSurcharges = query({
    args: {
        tenantId: v.id("tenants"),
        resourceId: v.string(),
        bookingDate: v.number(),
        bookingTime: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, resourceId, bookingDate, bookingTime }) => {
        // Look up resource to get categoryKey and pricingRules
        const resource = await ctx.runQuery(components.resources.queries.get, {
            id: resourceId as string,
        });

        const allSurcharges = await ctx.runQuery(components.pricing.surcharges.getApplicableSurcharges, {
            tenantId: tenantId as string,
            resourceId: resourceId as string,
            bookingDate,
            bookingTime,
            resourceCategoryKey: (resource as any)?.categoryKey,
        });

        // Filter by listing's pricingRules if set
        const pricingRules = (resource as any)?.pricingRules;
        if (!pricingRules) return allSurcharges;

        const enabledHolidayIds: string[] | undefined = pricingRules.holidayIds;
        const enabledWeekdayIds: string[] | undefined = pricingRules.weekdaySurchargeIds;

        // If no filter arrays are set, return all (owner hasn't configured filtering)
        if (!enabledHolidayIds && !enabledWeekdayIds) return allSurcharges;

        return (allSurcharges as any[]).filter((s: any) => {
            if (s.type === 'holiday') {
                return !enabledHolidayIds || enabledHolidayIds.includes(s.id);
            }
            // weekday and peak types come from weekdayPricing table
            return !enabledWeekdayIds || enabledWeekdayIds.includes(s.id);
        });
    },
});

// =============================================================================
// HOLIDAYS
// =============================================================================

/**
 * List holidays for a tenant.
 */
export const listHolidays = query({
    args: {
        tenantId: v.id("tenants"),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { tenantId, isActive }) => {
        return ctx.runQuery(components.pricing.holidays.listHolidays, {
            tenantId: tenantId as string,
            isActive,
        });
    },
});

/**
 * Create a holiday.
 */
export const createHoliday = mutation({
    args: {
        tenantId: v.id("tenants"),
        name: v.string(),
        date: v.string(),
        dateTo: v.optional(v.string()),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        isRecurring: v.boolean(),
        surchargeType: surchargeTypeValidator,
        surchargeValue: v.number(),
        appliesToResources: v.optional(v.array(v.string())),
        appliesToCategories: v.optional(v.array(v.string())),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });
        const result = await ctx.runMutation(components.pricing.holidays.createHoliday, {
            tenantId: args.tenantId as string,
            name: args.name,
            date: args.date,
            dateTo: args.dateTo,
            startTime: args.startTime,
            endTime: args.endTime,
            isRecurring: args.isRecurring,
            surchargeType: args.surchargeType,
            surchargeValue: args.surchargeValue,
            appliesToResources: args.appliesToResources?.map((id) => id as string),
            appliesToCategories: args.appliesToCategories,
            metadata: args.metadata,
        });
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "holiday",
            entityId: (result as any).id ?? "",
            action: "created",
            sourceComponent: "pricing",
            newState: { name: args.name, date: args.date },
        });

        await emitEvent(ctx, "pricing.holiday.created", args.tenantId as string, "pricing", {
            holidayId: (result as any).id ?? "", name: args.name, date: args.date,
        });

        return result;
    },
});

/**
 * Update a holiday.
 */
export const updateHoliday = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        date: v.optional(v.string()),
        dateTo: v.optional(v.string()),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        isRecurring: v.optional(v.boolean()),
        surchargeType: v.optional(surchargeTypeValidator),
        surchargeValue: v.optional(v.number()),
        appliesToResources: v.optional(v.array(v.string())),
        appliesToCategories: v.optional(v.array(v.string())),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, appliesToResources, ...updates }) => {
        const existing = await ctx.runQuery(components.pricing.holidays.getHoliday, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.holidays.updateHoliday, {
            id,
            ...updates,
            appliesToResources: appliesToResources?.map((rid) => rid as string),
        });
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "holiday",
            entityId: id,
            action: "updated",
            sourceComponent: "pricing",
        });

        await emitEvent(ctx, "pricing.holiday.updated", (existing as any)?.tenantId ?? "", "pricing", {
            holidayId: id,
        });

        return result;
    },
});

/**
 * Delete a holiday.
 */
export const deleteHoliday = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.pricing.holidays.getHoliday, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.holidays.deleteHoliday, { id });
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "holiday",
            entityId: id,
            action: "deleted",
            sourceComponent: "pricing",
            previousState: { name: (existing as any)?.name },
        });

        await emitEvent(ctx, "pricing.holiday.deleted", (existing as any)?.tenantId ?? "", "pricing", {
            holidayId: id,
        });

        return result;
    },
});

// =============================================================================
// WEEKDAY PRICING
// =============================================================================

/**
 * List weekday pricing rules.
 */
export const listWeekdayPricing = query({
    args: {
        tenantId: v.id("tenants"),
        resourceId: v.optional(v.string()),
        dayOfWeek: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { tenantId, resourceId, dayOfWeek, isActive }) => {
        return ctx.runQuery(components.pricing.surcharges.listWeekdayPricing, {
            tenantId: tenantId as string,
            resourceId: resourceId as string | undefined,
            dayOfWeek,
            isActive,
        });
    },
});

/**
 * Create a weekday pricing rule.
 */
export const createWeekdayPricing = mutation({
    args: {
        tenantId: v.id("tenants"),
        resourceId: v.optional(v.string()),
        dayOfWeek: v.number(),
        surchargeType: surchargeTypeValidator,
        surchargeValue: v.number(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        label: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });
        const result = await ctx.runMutation(components.pricing.surcharges.createWeekdayPricing, {
            tenantId: args.tenantId as string,
            resourceId: args.resourceId as string | undefined,
            dayOfWeek: args.dayOfWeek,
            surchargeType: args.surchargeType,
            surchargeValue: args.surchargeValue,
            startTime: args.startTime,
            endTime: args.endTime,
            label: args.label,
            metadata: args.metadata,
        });
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "weekdayPricing",
            entityId: (result as any).id ?? "",
            action: "created",
            sourceComponent: "pricing",
            newState: { dayOfWeek: args.dayOfWeek, surchargeValue: args.surchargeValue },
        });

        await emitEvent(ctx, "pricing.weekdayPricing.created", args.tenantId as string, "pricing", {
            weekdayPricingId: (result as any).id ?? "", dayOfWeek: args.dayOfWeek,
        });

        return result;
    },
});

/**
 * Update a weekday pricing rule.
 */
export const updateWeekdayPricing = mutation({
    args: {
        id: v.string(),
        dayOfWeek: v.optional(v.number()),
        surchargeType: v.optional(surchargeTypeValidator),
        surchargeValue: v.optional(v.number()),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        label: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const existing = await ctx.runQuery(components.pricing.surcharges.getWeekdayPricingRule, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.surcharges.updateWeekdayPricing, {
            id,
            ...updates,
        });
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "weekdayPricing",
            entityId: id,
            action: "updated",
            sourceComponent: "pricing",
        });

        await emitEvent(ctx, "pricing.weekdayPricing.updated", (existing as any)?.tenantId ?? "", "pricing", {
            weekdayPricingId: id,
        });

        return result;
    },
});

/**
 * Delete a weekday pricing rule.
 */
export const deleteWeekdayPricing = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.pricing.surcharges.getWeekdayPricingRule, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.surcharges.deleteWeekdayPricing, { id });
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "weekdayPricing",
            entityId: id,
            action: "deleted",
            sourceComponent: "pricing",
            previousState: { dayOfWeek: (existing as any)?.dayOfWeek, label: (existing as any)?.label },
        });

        await emitEvent(ctx, "pricing.weekdayPricing.deleted", (existing as any)?.tenantId ?? "", "pricing", {
            weekdayPricingId: id,
        });

        return result;
    },
});

// =============================================================================
// DISCOUNT CODES
// =============================================================================

/**
 * List discount codes for a tenant.
 */
export const listDiscountCodes = query({
    args: {
        tenantId: v.id("tenants"),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { tenantId, isActive }) => {
        return ctx.runQuery(components.pricing.discounts.listDiscountCodes, {
            tenantId: tenantId as string,
            isActive,
        });
    },
});

/**
 * Create a discount code.
 */
export const createDiscountCode = mutation({
    args: {
        tenantId: v.id("tenants"),
        code: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        discountType: discountTypeValidator,
        discountValue: v.number(),
        minBookingAmount: v.optional(v.number()),
        maxDiscountAmount: v.optional(v.number()),
        minDurationMinutes: v.optional(v.number()),
        appliesToResources: v.optional(v.array(v.string())),
        appliesToCategories: v.optional(v.array(v.string())),
        appliesToBookingModes: v.optional(v.array(v.string())),
        maxUsesTotal: v.optional(v.number()),
        maxUsesPerUser: v.optional(v.number()),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        restrictToUsers: v.optional(v.array(v.string())),
        restrictToOrgs: v.optional(v.array(v.string())),
        restrictToPriceGroups: v.optional(v.array(v.string())),
        firstTimeBookersOnly: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant(args.tenantId as string), throws: true });
        const result = await ctx.runMutation(components.pricing.discounts.createDiscountCode, {
            tenantId: args.tenantId as string,
            code: args.code,
            name: args.name,
            description: args.description,
            discountType: args.discountType,
            discountValue: args.discountValue,
            minBookingAmount: args.minBookingAmount,
            maxDiscountAmount: args.maxDiscountAmount,
            minDurationMinutes: args.minDurationMinutes,
            appliesToResources: args.appliesToResources?.map((id) => id as string),
            appliesToCategories: args.appliesToCategories,
            appliesToBookingModes: args.appliesToBookingModes,
            maxUsesTotal: args.maxUsesTotal,
            maxUsesPerUser: args.maxUsesPerUser,
            validFrom: args.validFrom,
            validUntil: args.validUntil,
            restrictToUsers: args.restrictToUsers,
            restrictToOrgs: args.restrictToOrgs,
            restrictToPriceGroups: args.restrictToPriceGroups,
            firstTimeBookersOnly: args.firstTimeBookersOnly,
            metadata: args.metadata,
        });
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "discountCode",
            entityId: (result as any).id ?? "",
            action: "created",
            sourceComponent: "pricing",
            newState: { code: args.code, name: args.name },
        });

        await emitEvent(ctx, "pricing.discountCode.created", args.tenantId as string, "pricing", {
            discountCodeId: (result as any).id ?? "", code: args.code,
        });

        return result;
    },
});

/**
 * Update a discount code.
 */
export const updateDiscountCode = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        discountType: v.optional(discountTypeValidator),
        discountValue: v.optional(v.number()),
        minBookingAmount: v.optional(v.number()),
        maxDiscountAmount: v.optional(v.number()),
        minDurationMinutes: v.optional(v.number()),
        appliesToResources: v.optional(v.array(v.string())),
        appliesToCategories: v.optional(v.array(v.string())),
        appliesToBookingModes: v.optional(v.array(v.string())),
        maxUsesTotal: v.optional(v.number()),
        maxUsesPerUser: v.optional(v.number()),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        restrictToUsers: v.optional(v.array(v.string())),
        restrictToOrgs: v.optional(v.array(v.string())),
        restrictToPriceGroups: v.optional(v.array(v.string())),
        firstTimeBookersOnly: v.optional(v.boolean()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, appliesToResources, ...updates }) => {
        const existing = await ctx.runQuery(components.pricing.discounts.getDiscountCode, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.discounts.updateDiscountCode, {
            id,
            ...updates,
            appliesToResources: appliesToResources?.map((rid) => rid as string),
        });
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "discountCode",
            entityId: id,
            action: "updated",
            sourceComponent: "pricing",
        });

        await emitEvent(ctx, "pricing.discountCode.updated", (existing as any)?.tenantId ?? "", "pricing", {
            discountCodeId: id,
        });

        return result;
    },
});

/**
 * Delete a discount code.
 */
export const deleteDiscountCode = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.pricing.discounts.getDiscountCode, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.discounts.deleteDiscountCode, { id });
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "discountCode",
            entityId: id,
            action: "deleted",
            sourceComponent: "pricing",
            previousState: { code: (existing as any)?.code, name: (existing as any)?.name },
        });

        await emitEvent(ctx, "pricing.discountCode.deleted", (existing as any)?.tenantId ?? "", "pricing", {
            discountCodeId: id,
        });

        return result;
    },
});

/**
 * Validate and get discount code details.
 */
export const validateDiscountCode = query({
    args: {
        tenantId: v.id("tenants"),
        code: v.string(),
        resourceId: v.optional(v.string()),
        categoryKey: v.optional(v.string()),
        bookingMode: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        organizationId: v.optional(v.id("organizations")),
        priceGroupId: v.optional(v.string()),
        bookingAmount: v.optional(v.number()),
        durationMinutes: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return ctx.runQuery(components.pricing.discounts.validateDiscountCode, {
            tenantId: args.tenantId as string,
            code: args.code,
            resourceId: args.resourceId as string | undefined,
            categoryKey: args.categoryKey,
            bookingMode: args.bookingMode,
            userId: args.userId as string | undefined,
            organizationId: args.organizationId as string | undefined,
            priceGroupId: args.priceGroupId,
            bookingAmount: args.bookingAmount,
            durationMinutes: args.durationMinutes,
        });
    },
});

/**
 * Apply discount code (record usage after booking).
 */
export const applyDiscountCode = mutation({
    args: {
        tenantId: v.id("tenants"),
        discountCodeId: v.string(),
        userId: v.id("users"),
        bookingId: v.optional(v.string()),
        discountAmount: v.number(),
    },
    handler: async (ctx, args) => {
        await requireActiveUser(ctx, args.userId);

        const result = await ctx.runMutation(components.pricing.discounts.applyDiscountCode, {
            tenantId: args.tenantId as string,
            discountCodeId: args.discountCodeId,
            userId: args.userId as string,
            bookingId: args.bookingId as string | undefined,
            discountAmount: args.discountAmount,
        });
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            entityType: "discountCode",
            entityId: args.discountCodeId,
            action: "applied",
            sourceComponent: "pricing",
            newState: { bookingId: args.bookingId, discountAmount: args.discountAmount },
        });

        await emitEvent(ctx, "pricing.discountCode.applied", args.tenantId as string, "pricing", {
            discountCodeId: args.discountCodeId, userId: args.userId as string, bookingId: args.bookingId,
        });

        return result;
    },
});

// =============================================================================
// ADDITIONAL SERVICES
// =============================================================================

/**
 * List additional services for a resource.
 */
export const listAdditionalServices = query({
    args: {
        resourceId: v.string(),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { resourceId, isActive }) => {
        return ctx.runQuery(components.pricing.queries.listAdditionalServices, {
            resourceId: resourceId as string,
            isActive,
        });
    },
});

/**
 * List additional services for a tenant.
 */
export const listAdditionalServicesByTenant = query({
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

/**
 * Create an additional service.
 */
export const createAdditionalService = mutation({
    args: {
        tenantId: v.id("tenants"),
        resourceId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        price: v.number(),
        currency: v.optional(v.string()),
        isRequired: v.optional(v.boolean()),
        displayOrder: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(components.pricing.mutations.createAdditionalService, {
            tenantId: args.tenantId as string,
            resourceId: args.resourceId as string,
            name: args.name,
            description: args.description,
            price: args.price,
            currency: args.currency,
            isRequired: args.isRequired,
            displayOrder: args.displayOrder,
            metadata: args.metadata,
        });
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "additionalService",
            entityId: (result as any).id ?? "",
            action: "created",
            sourceComponent: "pricing",
            newState: { name: args.name, price: args.price },
        });

        await emitEvent(ctx, "pricing.additionalService.created", args.tenantId as string, "pricing", {
            serviceId: (result as any).id ?? "", name: args.name,
        });

        return result;
    },
});

/**
 * Update an additional service.
 */
export const updateAdditionalService = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        price: v.optional(v.number()),
        currency: v.optional(v.string()),
        isRequired: v.optional(v.boolean()),
        displayOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const existing = await ctx.runQuery(components.pricing.queries.getAdditionalService, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.mutations.updateAdditionalService, {
            id,
            ...updates,
        });
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "additionalService",
            entityId: id,
            action: "updated",
            sourceComponent: "pricing",
        });

        await emitEvent(ctx, "pricing.additionalService.updated", (existing as any)?.tenantId ?? "", "pricing", {
            serviceId: id,
        });

        return result;
    },
});

/**
 * Remove an additional service.
 */
export const removeAdditionalService = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.pricing.queries.getAdditionalService, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.mutations.removeAdditionalService, { id });
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "additionalService",
            entityId: id,
            action: "removed",
            sourceComponent: "pricing",
            previousState: { name: (existing as any)?.name },
        });

        await emitEvent(ctx, "pricing.additionalService.removed", (existing as any)?.tenantId ?? "", "pricing", {
            serviceId: id,
        });

        return result;
    },
});

// =============================================================================
// TICKET TEMPLATES
// =============================================================================

/**
 * List ticket templates for a tenant.
 */
export const listTicketTemplates = query({
    args: {
        tenantId: v.id("tenants"),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { tenantId, isActive }) => {
        return ctx.runQuery(components.pricing.queries.listTicketTemplates, {
            tenantId: tenantId as string,
            isActive,
        });
    },
});

/**
 * Create a ticket template.
 */
export const createTicketTemplate = mutation({
    args: {
        tenantId: v.id("tenants"),
        name: v.string(),
        price: v.number(),
        maxPerPurchase: v.optional(v.number()),
        description: v.optional(v.string()),
        displayOrder: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(components.pricing.mutations.createTicketTemplate, {
            tenantId: args.tenantId as string,
            name: args.name,
            price: args.price,
            maxPerPurchase: args.maxPerPurchase,
            description: args.description,
            displayOrder: args.displayOrder,
            metadata: args.metadata,
        });

        // Audit
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "ticketTemplate",
            entityId: result.id as string,
            action: "created",
            sourceComponent: "pricing",
            newState: { name: args.name, price: args.price },
        });

        await emitEvent(ctx, "pricing.ticketTemplate.created", args.tenantId as string, "pricing", {
            templateId: result.id as string, name: args.name,
        });

        return result;
    },
});

/**
 * Update a ticket template.
 */
export const updateTicketTemplate = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        price: v.optional(v.number()),
        maxPerPurchase: v.optional(v.number()),
        description: v.optional(v.string()),
        displayOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const existing = await ctx.runQuery(components.pricing.queries.getTicketTemplate, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.mutations.updateTicketTemplate, {
            id,
            ...updates,
        });
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "ticketTemplate",
            entityId: id,
            action: "updated",
            sourceComponent: "pricing",
        });

        await emitEvent(ctx, "pricing.ticketTemplate.updated", (existing as any)?.tenantId ?? "", "pricing", {
            templateId: id,
        });

        return result;
    },
});

/**
 * Remove a ticket template.
 */
export const removeTicketTemplate = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.pricing.queries.getTicketTemplate, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.mutations.removeTicketTemplate, { id });
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "ticketTemplate",
            entityId: id,
            action: "removed",
            sourceComponent: "pricing",
            previousState: { name: (existing as any)?.name },
        });

        await emitEvent(ctx, "pricing.ticketTemplate.removed", (existing as any)?.tenantId ?? "", "pricing", {
            templateId: id,
        });

        return result;
    },
});

// =============================================================================
// ORG PRICING GROUPS
// =============================================================================

/**
 * List org pricing group assignments.
 */
export const listOrgPricingGroups = query({
    args: {
        tenantId: v.id("tenants"),
        organizationId: v.optional(v.id("organizations")),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { tenantId, organizationId, isActive }) => {
        return ctx.runQuery(components.pricing.queries.listOrgPricingGroups, {
            tenantId: tenantId as string,
            organizationId: organizationId as string | undefined,
            isActive,
        });
    },
});

/**
 * Assign a pricing group to an organization.
 */
export const assignOrgPricingGroup = mutation({
    args: {
        tenantId: v.id("tenants"),
        organizationId: v.id("organizations"),
        pricingGroupId: v.string(),
        discountPercent: v.optional(v.number()),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(components.pricing.mutations.assignOrgPricingGroup, {
            tenantId: args.tenantId as string,
            organizationId: args.organizationId as string,
            pricingGroupId: args.pricingGroupId,
            discountPercent: args.discountPercent,
            validFrom: args.validFrom,
            validUntil: args.validUntil,
            metadata: args.metadata,
        });
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "orgPricingGroup",
            entityId: (result as any).id ?? "",
            action: "assigned",
            sourceComponent: "pricing",
            newState: { organizationId: args.organizationId as string, pricingGroupId: args.pricingGroupId },
        });

        await emitEvent(ctx, "pricing.orgPricingGroup.assigned", args.tenantId as string, "pricing", {
            assignmentId: (result as any).id ?? "", organizationId: args.organizationId as string, pricingGroupId: args.pricingGroupId,
        });

        return result;
    },
});

/**
 * Remove an org pricing group assignment.
 */
export const removeOrgPricingGroup = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.pricing.queries.getOrgPricingGroup, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.mutations.removeOrgPricingGroup, { id });
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "orgPricingGroup",
            entityId: id,
            action: "removed",
            sourceComponent: "pricing",
            previousState: { organizationId: (existing as any)?.organizationId },
        });

        await emitEvent(ctx, "pricing.orgPricingGroup.removed", (existing as any)?.tenantId ?? "", "pricing", {
            assignmentId: id,
        });

        return result;
    },
});

// =============================================================================
// USER PRICING GROUPS
// =============================================================================

/**
 * List user pricing group assignments.
 */
export const listUserPricingGroups = query({
    args: {
        tenantId: v.id("tenants"),
        userId: v.optional(v.id("users")),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { tenantId, userId, isActive }) => {
        return ctx.runQuery(components.pricing.queries.listUserPricingGroups, {
            tenantId: tenantId as string,
            userId: userId as string | undefined,
            isActive,
        });
    },
});

/**
 * Assign a pricing group to a user.
 */
export const assignUserPricingGroup = mutation({
    args: {
        tenantId: v.id("tenants"),
        userId: v.id("users"),
        pricingGroupId: v.string(),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(components.pricing.mutations.assignUserPricingGroup, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            pricingGroupId: args.pricingGroupId,
            validFrom: args.validFrom,
            validUntil: args.validUntil,
            metadata: args.metadata,
        });
        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            userId: args.userId as string,
            entityType: "userPricingGroup",
            entityId: (result as any).id ?? "",
            action: "assigned",
            sourceComponent: "pricing",
            newState: { pricingGroupId: args.pricingGroupId },
        });

        await emitEvent(ctx, "pricing.userPricingGroup.assigned", args.tenantId as string, "pricing", {
            assignmentId: (result as any).id ?? "", userId: args.userId as string, pricingGroupId: args.pricingGroupId,
        });

        return result;
    },
});

/**
 * Remove a user pricing group assignment.
 */
export const removeUserPricingGroup = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const existing = await ctx.runQuery(components.pricing.queries.getUserPricingGroup, { id });
        if (existing) {
            await rateLimit(ctx, { name: "mutatePricing", key: rateLimitKeys.tenant((existing as any).tenantId), throws: true });
        }
        const result = await ctx.runMutation(components.pricing.mutations.removeUserPricingGroup, { id });
        await withAudit(ctx, {
            tenantId: (existing as any)?.tenantId ?? "",
            entityType: "userPricingGroup",
            entityId: id,
            action: "removed",
            sourceComponent: "pricing",
            previousState: { userId: (existing as any)?.userId },
        });

        await emitEvent(ctx, "pricing.userPricingGroup.removed", (existing as any)?.tenantId ?? "", "pricing", {
            assignmentId: id,
        });

        return result;
    },
});
