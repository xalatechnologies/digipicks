/**
 * Pricing Component Schema
 *
 * 10 tables covering pricing groups, resource pricing, holidays, weekday pricing,
 * discount codes, discount code usage, org/user pricing group assignments,
 * additional services, and ticket templates.
 *
 * External references (tenantId, resourceId, userId, organizationId)
 * use v.string() because component tables cannot reference app-level tables.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const surchargeType = v.union(
    v.literal("percent"),
    v.literal("fixed"),
    v.literal("multiplier")
);

const discountType = v.union(
    v.literal("percent"),
    v.literal("fixed"),
    v.literal("free_hours")
);

export default defineSchema({
    // =========================================================================
    // PRICING GROUPS
    // =========================================================================

    pricingGroups: defineTable({
        tenantId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        groupType: v.optional(v.string()),
        discountPercent: v.optional(v.number()),
        discountAmount: v.optional(v.number()),
        applicableBookingModes: v.optional(v.array(v.string())),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        isDefault: v.boolean(),
        priority: v.number(),
        isActive: v.boolean(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_tenant_active", ["tenantId", "isActive"]),

    // =========================================================================
    // RESOURCE PRICING
    // =========================================================================

    resourcePricing: defineTable({
        tenantId: v.string(),
        resourceId: v.string(),
        pricingGroupId: v.optional(v.string()),
        priceType: v.string(),
        basePrice: v.number(),
        currency: v.string(),

        // Per-unit pricing
        pricePerHour: v.optional(v.number()),
        pricePerDay: v.optional(v.number()),
        pricePerHalfDay: v.optional(v.number()),
        pricePerWeek: v.optional(v.number()),
        pricePerMonth: v.optional(v.number()),
        pricePerPerson: v.optional(v.number()),
        pricePerPersonHour: v.optional(v.number()),
        slotOptions: v.optional(v.array(v.any())),

        // Duration constraints
        minDuration: v.optional(v.number()),
        maxDuration: v.optional(v.number()),

        // People constraints
        minPeople: v.optional(v.number()),
        maxPeople: v.optional(v.number()),

        // Age constraints
        minAge: v.optional(v.number()),
        maxAge: v.optional(v.number()),

        // Booking settings
        slotDurationMinutes: v.optional(v.number()),
        advanceBookingDays: v.optional(v.number()),
        sameDayBookingAllowed: v.optional(v.boolean()),
        cancellationHours: v.optional(v.number()),
        applicableBookingModes: v.optional(v.array(v.string())),

        // Fees
        depositAmount: v.optional(v.number()),
        cleaningFee: v.optional(v.number()),
        serviceFee: v.optional(v.number()),

        // Tax
        taxRate: v.optional(v.number()),
        taxIncluded: v.optional(v.boolean()),

        // Surcharge multipliers
        weekendMultiplier: v.optional(v.number()),
        peakHoursMultiplier: v.optional(v.number()),
        holidayMultiplier: v.optional(v.number()),

        // Feature toggles
        enableDiscountCodes: v.optional(v.boolean()),
        enableSurcharges: v.optional(v.boolean()),
        enablePriceGroups: v.optional(v.boolean()),

        // Flexible rules
        rules: v.any(),
        isActive: v.boolean(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_resource", ["resourceId"])
        .index("by_pricing_group", ["pricingGroupId"]),

    // =========================================================================
    // HOLIDAYS
    // =========================================================================

    holidays: defineTable({
        tenantId: v.string(),
        name: v.string(),
        date: v.string(),
        dateTo: v.optional(v.string()),  // End of date range (MM-DD or YYYY-MM-DD)
        startTime: v.optional(v.string()),  // Time range start (HH:MM)
        endTime: v.optional(v.string()),    // Time range end (HH:MM)
        isRecurring: v.boolean(),
        surchargeType: surchargeType,
        surchargeValue: v.number(),
        appliesToResources: v.optional(v.array(v.string())),
        appliesToCategories: v.optional(v.array(v.string())),
        isActive: v.boolean(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_date", ["date"])
        .index("by_tenant_active", ["tenantId", "isActive"]),

    // =========================================================================
    // WEEKDAY PRICING
    // =========================================================================

    weekdayPricing: defineTable({
        tenantId: v.string(),
        resourceId: v.optional(v.string()),
        dayOfWeek: v.number(), // 0 = Sunday, 6 = Saturday
        surchargeType: surchargeType,
        surchargeValue: v.number(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        label: v.optional(v.string()),
        isActive: v.boolean(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_resource", ["resourceId"])
        .index("by_tenant_day", ["tenantId", "dayOfWeek"])
        .index("by_tenant_active", ["tenantId", "isActive"]),

    // =========================================================================
    // DISCOUNT CODES
    // =========================================================================

    discountCodes: defineTable({
        tenantId: v.string(),
        code: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        discountType: discountType,
        discountValue: v.number(),

        // Constraints
        minBookingAmount: v.optional(v.number()),
        maxDiscountAmount: v.optional(v.number()),
        minDurationMinutes: v.optional(v.number()),

        // Scope
        appliesToResources: v.optional(v.array(v.string())),
        appliesToCategories: v.optional(v.array(v.string())),
        appliesToBookingModes: v.optional(v.array(v.string())),

        // Usage limits
        maxUsesTotal: v.optional(v.number()),
        maxUsesPerUser: v.optional(v.number()),
        currentUses: v.number(),

        // Validity
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),

        // Restrictions
        restrictToUsers: v.optional(v.array(v.string())),
        restrictToOrgs: v.optional(v.array(v.string())),
        restrictToPriceGroups: v.optional(v.array(v.string())),
        firstTimeBookersOnly: v.optional(v.boolean()),

        isActive: v.boolean(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_code", ["tenantId", "code"])
        .index("by_active", ["tenantId", "isActive"]),

    // =========================================================================
    // DISCOUNT CODE USAGE
    // =========================================================================

    discountCodeUsage: defineTable({
        tenantId: v.string(),
        discountCodeId: v.id("discountCodes"),
        userId: v.string(),
        bookingId: v.optional(v.string()),
        discountAmount: v.number(),
        usedAt: v.number(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_code", ["discountCodeId"])
        .index("by_user", ["userId"])
        .index("by_booking", ["bookingId"]),

    // =========================================================================
    // ORG PRICING GROUPS
    // =========================================================================

    orgPricingGroups: defineTable({
        tenantId: v.string(),
        organizationId: v.string(),
        pricingGroupId: v.id("pricingGroups"),
        discountPercent: v.optional(v.number()),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        isActive: v.boolean(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_organization", ["organizationId"])
        .index("by_pricing_group", ["pricingGroupId"]),

    // =========================================================================
    // USER PRICING GROUPS
    // =========================================================================

    userPricingGroups: defineTable({
        tenantId: v.string(),
        userId: v.string(),
        pricingGroupId: v.id("pricingGroups"),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        isActive: v.boolean(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_user", ["userId"])
        .index("by_pricing_group", ["pricingGroupId"]),

    // =========================================================================
    // ADDITIONAL SERVICES
    // =========================================================================

    additionalServices: defineTable({
        tenantId: v.string(),
        resourceId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        price: v.number(),
        currency: v.optional(v.string()),
        isRequired: v.optional(v.boolean()),
        displayOrder: v.optional(v.number()),
        isActive: v.boolean(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_resource", ["resourceId"]),

    // =========================================================================
    // PACKAGES (Basispakke / Plusspakke / Premiumpakke)
    // Customer-facing bundles with included services and fixed price
    // =========================================================================

    packages: defineTable({
        tenantId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        /** Fixed price for this package (NOK) */
        price: v.number(),
        currency: v.optional(v.string()),
        /** IDs of additionalServices included in this package */
        includedServiceIds: v.optional(v.array(v.string())),
        /** IDs of addons/equipment included in this package */
        includedAddonIds: v.optional(v.array(v.string())),
        /** Free-text list of what's included (for display) */
        includedItems: v.optional(v.array(v.string())),
        /** Suitable for these event types */
        suitableFor: v.optional(v.array(v.string())),
        /** Display order (0 = first) */
        displayOrder: v.number(),
        /** Highlight this package as recommended */
        isRecommended: v.optional(v.boolean()),
        /** Show on public web listing page */
        isPublic: v.boolean(),
        isActive: v.boolean(),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_tenant_active", ["tenantId", "isActive"])
        .index("by_tenant_public", ["tenantId", "isPublic"]),

    // =========================================================================
    // TICKET TEMPLATES
    // =========================================================================

    ticketTemplates: defineTable({
        tenantId: v.string(),
        name: v.string(),
        price: v.number(),
        maxPerPurchase: v.optional(v.number()),
        description: v.optional(v.string()),
        displayOrder: v.optional(v.number()),
        isActive: v.boolean(),
        metadata: v.any(),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_tenant_active", ["tenantId", "isActive"]),
});
