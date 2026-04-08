/**
 * Listing Types
 * 
 * Resource/listing types for the booking platform.
 */

import type { 
    TenantId, 
    OrganizationId, 
    ResourceId, 
    Timestamps, 
    Pricing, 
    Location, 
    Image, 
    Metadata 
} from './common';

// =============================================================================
// Listing Type Enums
// =============================================================================

export type ListingType =
    | 'SPACE'
    | 'RESOURCE'
    | 'SERVICE'
    | 'EVENT'
    | 'VEHICLE'
    | 'OTHER';

export type TimeMode =
    | 'hourly' 
    | 'daily' 
    | 'weekly' 
    | 'monthly' 
    | 'session';

// =============================================================================
// Listing Types
// =============================================================================

export interface Listing extends Timestamps {
    id: ResourceId;
    tenantId: TenantId;
    organizationId?: OrganizationId;
    name: string;
    slug: string;
    description?: string;
    type: ListingType;
    categoryKey: string;
    subcategoryKeys?: string[];
    status: string;
    bookingModel?: string;
    timeMode?: TimeMode;
    images: Image[];
    pricing?: Pricing;
    capacity?: number;
    quantity?: number;
    location?: Location;
    address?: string;
    features?: ListingFeature[];
    requiresApproval?: boolean;
    metadata?: ListingMetadata;
    /** Enable season/long-term rental requests */
    allowSeasonRental?: boolean;
    /** Enable recurring booking patterns */
    allowRecurringBooking?: boolean;
}

export interface ListingFeature {
    name: string;
    value: boolean | string | number;
    icon?: string;
}

export interface ListingMetadata extends Metadata {
    amenities?: string[];
    features?: string[];
    city?: string;
    region?: string;
    postalCode?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
}

// =============================================================================
// Listing Card Types (for UI display)
// =============================================================================

export interface ListingCardData {
    id: string;
    name: string;
    slug: string;
    type: ListingType;
    typeLabel: string;
    status: string;
    description?: string;
    image?: string;
    location?: string;
    facilities: string[];
    moreFacilities: number;
    capacity: number;
    price: number;
    priceUnit: string;
    currency: string;
}

// =============================================================================
// Listing Input Types
// =============================================================================

export interface CreateListingInput {
    name: string;
    slug?: string;
    description?: string;
    type: ListingType;
    categoryKey: string;
    subcategoryKeys?: string[];
    bookingModel?: string;
    timeMode?: TimeMode;
    images?: Image[];
    pricing?: Pricing;
    capacity?: number;
    location?: Location;
    features?: ListingFeature[];
    requiresApproval?: boolean;
    metadata?: ListingMetadata;
    /** Enable season/long-term rental requests */
    allowSeasonRental?: boolean;
    /** Enable recurring booking patterns */
    allowRecurringBooking?: boolean;
}

export interface UpdateListingInput extends Partial<CreateListingInput> {
    id: ResourceId;
    status?: string;
}

// =============================================================================
// Listing Query Types
// =============================================================================

export interface ListingQueryParams {
    tenantId?: TenantId;
    organizationId?: OrganizationId;
    type?: ListingType;
    categoryKey?: string;
    subcategoryKeys?: string[];
    status?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    minCapacity?: number;
    facilities?: string[];
    location?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
