/**
 * Common Types
 * 
 * Base types used across the platform.
 */

// =============================================================================
// App Types
// =============================================================================

export type AppId = 'backoffice' | 'dashboard' | 'web' | 'minside' | 'docs' | 'monitoring' | 'saas-admin';

export interface AppConfig {
    appId: AppId;
    name: string;
    port: number;
    description: string;
}

// =============================================================================
// Locale Types
// =============================================================================

export type Locale = 'nb' | 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

// =============================================================================
// Status Types
// =============================================================================

export type EntityStatus = 'active' | 'inactive' | 'suspended' | 'deleted' | 'archived';
export type PublishStatus = 'draft' | 'published' | 'unpublished' | 'archived';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

// =============================================================================
// ID Types (branded types for type safety)
// =============================================================================

export type TenantId = string & { readonly __brand: 'TenantId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type OrganizationId = string & { readonly __brand: 'OrganizationId' };
export type ResourceId = string & { readonly __brand: 'ResourceId' };
export type CategoryId = string & { readonly __brand: 'CategoryId' };
export type AmenityId = string & { readonly __brand: 'AmenityId' };

// =============================================================================
// Timestamp Types
// =============================================================================

export interface Timestamps {
    createdAt: string;
    updatedAt: string;
}

export interface SoftDelete {
    deletedAt?: string;
}

// =============================================================================
// Pricing Types
// =============================================================================

export type Currency = 'NOK' | 'SEK' | 'DKK' | 'EUR' | 'USD';

export type PricingUnit =
    | 'hour'
    | 'day'
    | 'week'
    | 'month'
    | 'session'
    | 'person'
    | 'unit'
    | 'time'
    | 'dag'
    | 'uke'
    | 'måned'
    | 'stk'
    | '30min'
    | '45min'
    | '90min'
    | '2hours'
    | '3hours'
    | 'half-day'
    | 'booking';

/** How the price is calculated */
export type PricingModel =
    | 'per_hour'           // Price per hour
    | 'per_day'            // Price per day (full day)
    | 'per_half_day'       // Price per half day
    | 'per_session'        // Fixed price per session/slot
    | 'per_person'         // Price per person
    | 'per_person_hour'    // Price per person per hour
    | 'per_person_day'     // Price per person per day
    | 'per_booking'        // Fixed price per booking (regardless of duration/people)
    | 'tiered_duration'    // Different rates for different durations
    | 'tiered_capacity'    // Different rates for different group sizes
    | 'sport_slot';        // Sport-style slots (30min, 1hr, 1.5hr, 2hr)

/** Duration options for sport-style bookings */
export interface DurationOption {
    minutes: number;
    label: string;
    price: number;
}

/** Capacity tier for tiered pricing */
export interface CapacityTier {
    minPeople: number;
    maxPeople: number;
    pricePerPerson?: number;
    flatPrice?: number;
    label?: string;
}

/** Age group pricing */
export interface AgeGroupPricing {
    ageGroup: 'child' | 'youth' | 'adult' | 'senior' | 'student';
    label: string;
    minAge?: number;
    maxAge?: number;
    price: number;
    discountPercent?: number;
}

/** Booking constraints/rules */
export interface BookingConstraints {
    minDurationMinutes?: number;
    maxDurationMinutes?: number;
    minPeople?: number;
    maxPeople?: number;
    minAge?: number;
    maxAge?: number;
    slotDurationMinutes?: number;      // For fixed-slot bookings (e.g., 30min slots)
    advanceBookingDays?: number;       // How far in advance can book
    sameDayBookingAllowed?: boolean;
    cancellationHours?: number;        // Hours before for free cancellation
}

/** Comprehensive pricing configuration */
export interface PricingConfig {
    /** Primary pricing model */
    model: PricingModel;
    /** Base price (interpretation depends on model) */
    basePrice: number;
    /** Currency code */
    currency: Currency;
    /** Display unit for the price */
    unit: PricingUnit;

    // Time-based pricing
    pricePerHour?: number;
    pricePerDay?: number;
    pricePerHalfDay?: number;

    // Person-based pricing
    pricePerPerson?: number;
    pricePerPersonHour?: number;
    pricePerPersonDay?: number;

    // Sport/slot-based pricing
    durationOptions?: DurationOption[];

    // Tiered pricing
    capacityTiers?: CapacityTier[];

    // Age group pricing
    ageGroupPricing?: AgeGroupPricing[];

    // Booking constraints
    constraints?: BookingConstraints;

    // Multipliers
    weekendMultiplier?: number;
    peakHoursMultiplier?: number;
    holidayMultiplier?: number;

    // Additional fees
    depositAmount?: number;
    cleaningFee?: number;
    serviceFee?: number;

    // Tax
    taxRate?: number;           // e.g., 0.25 for 25% MVA
    taxIncluded?: boolean;      // Is tax included in displayed price?
}

/** Price calculation result with full breakdown */
export interface PriceCalculationResult {
    /** Final total to pay */
    total: number;
    /** Currency */
    currency: Currency;
    /** Itemized breakdown */
    items: PriceLineItem[];
    /** Applied discounts */
    discounts: PriceDiscount[];
    /** Tax details */
    tax: {
        rate: number;
        amount: number;
        label: string;
    };
    /** Deposit (not included in total) */
    deposit?: number;
    /** Human-readable explanation */
    explanation: string;
}

export interface PriceLineItem {
    type: 'base' | 'duration' | 'capacity' | 'addon' | 'fee';
    label: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
    explanation?: string;
}

export interface PriceDiscount {
    type: 'promo' | 'member' | 'volume' | 'age_group' | 'organization';
    label: string;
    percent?: number;
    amount: number;
}

/** Legacy Pricing interface (for backward compatibility) */
export interface Pricing {
    basePrice: number;
    currency: Currency;
    unit: PricingUnit;
    weekendMultiplier?: number;
    peakHoursMultiplier?: number;
    depositAmount?: number;
    cleaningFee?: number;
}

// =============================================================================
// Location Types
// =============================================================================

export interface Coordinates {
    lat: number;
    lng: number;
}

/** Alias for Coordinates using latitude/longitude (digdir compatibility) */
export interface GeoCoordinates {
    latitude: number;
    longitude: number;
}

export interface Address {
    street?: string;
    streetNumber?: string;
    postalCode?: string;
    city?: string;
    region?: string;
    municipality?: string;
    county?: string;
    country?: string;
    /** Formatted address string (e.g. for display) */
    formatted?: string;
    coordinates?: GeoCoordinates | Coordinates;
}

export interface Location extends Address {
    coordinates?: Coordinates;
}

// =============================================================================
// Contact Types
// =============================================================================

export interface ContactInfo {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    organization?: string;
}

// =============================================================================
// Image Types
// =============================================================================

export interface Image {
    url: string;
    alt?: string;
    isPrimary?: boolean;
    width?: number;
    height?: number;
}

/** Listing/resource image with id and ordering (extends Image) */
export interface ListingImage extends Image {
    id: string;
    caption?: string;
    order?: number;
}

// =============================================================================
// Metadata Types
// =============================================================================

export type Metadata = Record<string, unknown>;
