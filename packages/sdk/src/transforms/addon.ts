/**
 * DigilistSaaS SDK - Addon Transforms
 *
 * Maps raw Convex addon documents to SDK shapes.
 * Addons are optional services/equipment that can be attached to bookings.
 */

// =============================================================================
// Types
// =============================================================================

export interface Addon {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    description?: string;
    category?: string;
    priceType: string;
    price: number;
    currency: string;
    maxQuantity?: number;
    requiresApproval: boolean;
    leadTimeHours?: number;
    icon?: string;
    images: unknown[];
    displayOrder: number;
    isActive: boolean;
    metadata: Record<string, unknown>;
}

export interface ResourceAddon {
    id: string;
    tenantId: string;
    resourceId: string;
    addonId: string;
    isRequired: boolean;
    isRecommended: boolean;
    customPrice?: number;
    displayOrder: number;
    isActive: boolean;
    addon: Addon | null;
    effectivePrice: number;
}

export interface BookingAddon {
    id: string;
    tenantId: string;
    bookingId: string;
    addonId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    currency: string;
    notes?: string;
    status: "pending" | "confirmed" | "approved" | "rejected" | "cancelled";
    addon: Addon | null;
}

// =============================================================================
// Transforms
// =============================================================================

export type ConvexAddon = {
    _id: string;
    tenantId: string;
    name: string;
    slug: string;
    description?: string;
    category?: string;
    priceType: string;
    price: number;
    currency: string;
    maxQuantity?: number;
    requiresApproval?: boolean;
    leadTimeHours?: number;
    icon?: string;
    images?: unknown[];
    displayOrder?: number;
    isActive: boolean;
    metadata?: Record<string, unknown>;
};

/** Map a raw Convex addon document to the SDK Addon shape. */
export function transformAddon(a: ConvexAddon): Addon {
    return {
        id: a._id,
        tenantId: a.tenantId,
        name: a.name,
        slug: a.slug,
        description: a.description,
        category: a.category,
        priceType: a.priceType,
        price: a.price,
        currency: a.currency,
        maxQuantity: a.maxQuantity,
        requiresApproval: a.requiresApproval ?? false,
        leadTimeHours: a.leadTimeHours,
        icon: a.icon,
        images: a.images ?? [],
        displayOrder: a.displayOrder ?? 0,
        isActive: a.isActive,
        metadata: a.metadata ?? {},
    };
}

export type ConvexResourceAddon = {
    _id: string;
    tenantId: string;
    resourceId: string;
    addonId: string;
    isRequired?: boolean;
    isRecommended?: boolean;
    customPrice?: number;
    displayOrder?: number;
    isActive: boolean;
    addon?: ConvexAddon | null;
    effectivePrice?: number;
};

/** Map a raw Convex resourceAddon document to the SDK ResourceAddon shape. */
export function transformResourceAddon(r: ConvexResourceAddon): ResourceAddon {
    return {
        id: r._id,
        tenantId: r.tenantId,
        resourceId: r.resourceId,
        addonId: r.addonId,
        isRequired: r.isRequired ?? false,
        isRecommended: r.isRecommended ?? false,
        customPrice: r.customPrice,
        displayOrder: r.displayOrder ?? 0,
        isActive: r.isActive,
        addon: r.addon ? transformAddon(r.addon) : null,
        effectivePrice: r.effectivePrice ?? r.customPrice ?? (r.addon?.price ?? 0),
    };
}

export type ConvexBookingAddon = {
    _id: string;
    tenantId: string;
    bookingId: string;
    addonId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    currency: string;
    notes?: string;
    status: string;
    addon?: ConvexAddon | null;
};

/** Map a raw Convex bookingAddon document to the SDK BookingAddon shape. */
export function transformBookingAddon(b: ConvexBookingAddon): BookingAddon {
    return {
        id: b._id,
        tenantId: b.tenantId,
        bookingId: b.bookingId,
        addonId: b.addonId,
        quantity: b.quantity,
        unitPrice: b.unitPrice,
        totalPrice: b.totalPrice,
        currency: b.currency,
        notes: b.notes,
        status: b.status as BookingAddon["status"],
        addon: b.addon ? transformAddon(b.addon) : null,
    };
}
