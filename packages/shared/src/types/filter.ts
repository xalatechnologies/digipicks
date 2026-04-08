/**
 * Filter Types
 * 
 * Filter and search types for listings and other entities.
 */

import type { ListingType } from './listing';

// =============================================================================
// Filter State Types
// =============================================================================

export interface ListingFilterState {
    category?: string;
    subcategories?: string[];
    facilities?: string[];
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    minCapacity?: number;
    date?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    newThisWeek?: boolean;
    requiresApproval?: boolean;
    cateringAvailable?: boolean;
}

// =============================================================================
// Filter Option Types
// =============================================================================

export interface FilterOption {
    id: string;
    label: string;
    count?: number;
}

export interface SortOption {
    id: string;
    label: string;
    field: string;
    order: 'asc' | 'desc';
}

// =============================================================================
// Filter Config Types
// =============================================================================

export interface FilterConfig {
    id: string;
    label: string;
    type: 'select' | 'multiselect' | 'range' | 'checkbox' | 'date' | 'text';
    options?: FilterOption[];
    value?: string | string[] | number | number[] | boolean;
    onChange: (value: unknown) => void;
    isActive?: boolean;
    placeholder?: string;
    helpText?: string;
}

// =============================================================================
// Price/Capacity Range Types
// =============================================================================

export interface PriceRangeFilter {
    min?: number;
    max?: number;
    currency?: string;
}

export interface CapacityRangeFilter {
    min?: number;
    max?: number;
}

export interface RatingFilter {
    min?: number;
}

// =============================================================================
// Location Filter Types
// =============================================================================

export interface LocationFilter {
    locationId?: string;
    locationName?: string;
    radiusKm?: number;
    latitude?: number;
    longitude?: number;
}

// =============================================================================
// Date/Time Filter Types
// =============================================================================

export interface DateTimeFilter {
    startDate?: Date | string;
    endDate?: Date | string;
}

// =============================================================================
// Availability Types
// =============================================================================

export type AvailabilityStatus = 'available' | 'unavailable' | 'soon';

// =============================================================================
// View Mode Types (consolidated in listings-admin; re-export for backward compat)
// =============================================================================

export type { ListingAdminViewMode as ViewMode } from './listings-admin';

// =============================================================================
// Complete Filter State
// =============================================================================

export interface FullFilterState {
    listingType?: ListingType | 'ALL';
    venueType?: string;
    priceRange?: PriceRangeFilter;
    capacity?: CapacityRangeFilter;
    rating?: RatingFilter;
    availability?: AvailabilityStatus;
    location?: LocationFilter;
    facilities?: string[];
    dateTime?: DateTimeFilter;
    searchQuery?: string;
}
