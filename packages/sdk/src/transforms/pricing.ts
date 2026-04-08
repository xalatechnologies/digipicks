/**
 * DigilistSaaS SDK - Pricing Transforms
 *
 * Maps raw Convex pricing documents to SDK shapes.
 */

// =============================================================================
// Types
// =============================================================================

export interface PriceBreakdown {
    basePrice: number;
    discountPercent: number;
    discountAmount: number;
    subtotal: number;
    addons: Array<{ addonId: string; name: string; price: number }>;
    addonsTotal: number;
    cleaningFee: number;
    depositAmount: number;
}

export interface PricingDetails {
    priceType: string;
    pricePerHour?: number;
    pricePerDay?: number;
    basePrice: number;
    minDuration?: number;
    maxDuration?: number;
}

export interface CalculatePriceResult {
    breakdown: PriceBreakdown;
    total: number;
    currency: string;
    durationHours: number;
    pricingDetails: PricingDetails;
}

export interface ResourcePricingConfig {
    model: string;
    basePrice?: number;
    currency: string;
    pricePerHour?: number;
    pricePerDay?: number;
    pricePerHalfDay?: number;
    pricePerPerson?: number;
    pricePerPersonHour?: number;
    minDurationMinutes?: number;
    maxDurationMinutes?: number;
    minPeople?: number;
    maxPeople?: number;
    depositAmount?: number;
    cleaningFee?: number;
    serviceFee?: number;
    taxRate?: number;
}

export interface ResourcePricingEntry {
    id: string;
    tenantId: string;
    resourceId: string;
    resourceName?: string;
    pricingGroupId?: string;
    priceType: string;
    basePrice: number;
    currency: string;
    pricePerHour?: number;
    pricePerDay?: number;
    pricePerHalfDay?: number;
    minDuration?: number;
    maxDuration?: number;
    minPeople?: number;
    maxPeople?: number;
    depositAmount?: number;
    cleaningFee?: number;
    serviceFee?: number;
    taxRate?: number;
    taxIncluded?: boolean;
    weekendMultiplier?: number;
    holidayMultiplier?: number;
    isActive: boolean;
    createdAt: string;
}

export interface PricingGroup {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    isDefault: boolean;
    priority: number;
    isActive: boolean;
}

// =============================================================================
// Transforms
// =============================================================================

export type ConvexResourcePricingEntry = {
    _id: string;
    _creationTime: number;
    tenantId: string;
    resourceId: string;
    resourceName?: string;
    pricingGroupId?: string;
    priceType: string;
    basePrice: number;
    currency: string;
    pricePerHour?: number;
    pricePerDay?: number;
    pricePerHalfDay?: number;
    minDuration?: number;
    maxDuration?: number;
    minPeople?: number;
    maxPeople?: number;
    depositAmount?: number;
    cleaningFee?: number;
    serviceFee?: number;
    taxRate?: number;
    taxIncluded?: boolean;
    weekendMultiplier?: number;
    holidayMultiplier?: number;
    isActive: boolean;
};

/** Map a raw Convex resourcePricing document to the SDK ResourcePricingEntry shape. */
export function transformResourcePricingEntry(r: ConvexResourcePricingEntry): ResourcePricingEntry {
    return {
        id: r._id,
        tenantId: r.tenantId,
        resourceId: r.resourceId,
        resourceName: r.resourceName,
        pricingGroupId: r.pricingGroupId,
        priceType: r.priceType,
        basePrice: r.basePrice,
        currency: r.currency,
        pricePerHour: r.pricePerHour,
        pricePerDay: r.pricePerDay,
        pricePerHalfDay: r.pricePerHalfDay,
        minDuration: r.minDuration,
        maxDuration: r.maxDuration,
        minPeople: r.minPeople,
        maxPeople: r.maxPeople,
        depositAmount: r.depositAmount,
        cleaningFee: r.cleaningFee,
        serviceFee: r.serviceFee,
        taxRate: r.taxRate,
        taxIncluded: r.taxIncluded,
        weekendMultiplier: r.weekendMultiplier,
        holidayMultiplier: r.holidayMultiplier,
        isActive: r.isActive,
        createdAt: new Date(r._creationTime).toISOString(),
    };
}

export type ConvexPricingGroup = {
    _id: string;
    tenantId: string;
    name: string;
    description?: string;
    isDefault: boolean;
    priority: number;
    isActive: boolean;
};

/** Map a raw Convex pricingGroup document to the SDK PricingGroup shape. */
export function transformPricingGroup(g: ConvexPricingGroup): PricingGroup {
    return {
        id: g._id,
        tenantId: g.tenantId,
        name: g.name,
        description: g.description,
        isDefault: g.isDefault,
        priority: g.priority,
        isActive: g.isActive,
    };
}
