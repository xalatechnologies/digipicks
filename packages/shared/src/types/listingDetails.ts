/**
 * Listing Details Types
 *
 * Types for the listing details page supporting FACILITY, EQUIPMENT, EVENT, OTHER.
 * Used by digdir web app and components displaying rich listing data.
 */

import type { ContactInfo, GeoCoordinates, ListingImage } from './common';

// =============================================================================
// Digdir Listing Type Enums
// =============================================================================

/** Digdir listing type taxonomy (FACILITY, EQUIPMENT, etc.) */
export type DigdirListingType = 'FACILITY' | 'EQUIPMENT' | 'EVENT' | 'OTHER';

/** Booking mode for UI (slots, all-day, duration, tickets) */
export type BookingMode = 'SLOTS' | 'ALL_DAY' | 'DURATION' | 'TICKETS' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM' | 'NONE';

/** Approval mode for bookings */
export type ApprovalMode = 'NONE' | 'REQUIRED' | 'AUTO';

// =============================================================================
// Opening Hours (Full Structure)
// =============================================================================

export interface DayHours {
    day: string;
    dayIndex: number;
    open?: string;
    close?: string;
    isClosed: boolean;
    breaks?: Array<{ start: string; end: string }>;
}

export interface ExceptionalDay {
    date: string;
    label: string;
    hours?: { open: string; close: string };
    isClosed: boolean;
}

/** Full opening hours with regular schedule and exceptions */
export interface OpeningHoursFull {
    regular: DayHours[];
    exceptions?: ExceptionalDay[];
}

/** Simple opening hours (open/close strings) */
export interface OpeningHoursSimple {
    open: string;
    close: string;
}

// =============================================================================
// Rules & FAQ
// =============================================================================

export type RuleCategory = 'general' | 'cancellation' | 'safety' | 'cleaning' | 'noise' | 'other';

export interface Rule {
    id: string;
    title: string;
    content: string;
    category?: RuleCategory;
    icon?: string;
}

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
    category?: string;
}

// =============================================================================
// Amenities & Facilities (Display Shapes)
// =============================================================================

/** Amenity display shape for UI (simpler than entity Amenity) */
export interface AmenityDisplay {
    id: string;
    name: string;
    icon?: string;
    category?: string;
    description?: string;
}

export interface IncludedFacility {
    id: string;
    name: string;
    description?: string;
    quantity?: number;
}

// =============================================================================
// Activity & History
// =============================================================================

export interface ListingEvent {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    isRecurring?: boolean;
    organizer?: string;
    status: 'upcoming' | 'ongoing' | 'past' | 'cancelled';
    /** Event image URL (populated for venue-linked events) */
    image?: string;
    /** Event slug for URL navigation */
    slug?: string;
    /** Genre tags */
    genre?: string | string[];
    /** Artists performing */
    artists?: string[];
    /** Ticket price */
    ticketPrice?: number;
    /** Ticket/external URL */
    ticketUrl?: string;
}

export interface RentalHistoryItem {
    id: string;
    date: string;
    duration?: string;
    purpose?: string;
    status: 'completed' | 'cancelled';
}

export interface ActivityData {
    type: 'events' | 'rentals' | 'sessions';
    events?: ListingEvent[];
    rentals?: RentalHistoryItem[];
    totalCount?: number;
}

// =============================================================================
// Booking Configuration
// =============================================================================

export interface BookingConfig {
    enabled: boolean;
    mode: BookingMode;
    approval: ApprovalMode;
    paymentRequired: boolean;
    paymentMethods?: string[];
    minLeadTimeHours?: number;
    maxAdvanceDays?: number;
    cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
    freeCancellationHours?: number;
    depositRequired?: boolean;
    depositAmount?: number;
    termsUrl?: string;
    slotDurationMinutes?: number;
}

// =============================================================================
// Key Facts & Metadata
// =============================================================================

export interface KeyFacts {
    capacity?: number;
    capacityLabel?: string;
    area?: number;
    areaUnit?: 'sqm' | 'sqft';
    floors?: number;
    quantity?: number;
    unitLabel?: string;
    condition?: 'new' | 'good' | 'fair';
    duration?: string;
    sessions?: number;
    wheelchairAccessible?: boolean;
    accessibilityFeatures?: string[];
    bookingMode?: BookingMode;
    approvalRequired?: boolean;
}

export interface ListingDetailsMetadata {
    description?: string;
    shortDescription?: string;
    amenities: AmenityDisplay[];
    includedFacilities: IncludedFacility[];
    rules: Rule[];
    faq: FAQItem[];
    tags?: string[];
    highlights?: string[];
    /** Pricing info text (e.g. "Priser varierer etter type arrangement…") */
    pricingInfo?: string;
    /** Parking details text */
    parkingInfo?: string;
    /** Artist/performer booking email */
    artistBookingEmail?: string;
    /** Rental inquiry form URL */
    rentalFormUrl?: string;
}

// =============================================================================
// Address (Extended for Listing Details)
// =============================================================================

export interface AddressFormatted {
    street?: string;
    streetNumber?: string;
    postalCode?: string;
    city?: string;
    municipality?: string;
    county?: string;
    country?: string;
    formatted: string;
    coordinates?: GeoCoordinates;
}

// =============================================================================
// Full Listing (Listing Details View)
// =============================================================================

export interface ListingDetails {
    id: string;
    tenantId: string;
    type: DigdirListingType;
    name: string;
    categoryKey?: string;
    category?: string;
    subcategory?: string;
    subcategories?: string[];
    subtitle?: string;
    status: 'draft' | 'published' | 'archived';
    images: ListingImage[];
    address?: AddressFormatted;
    contact?: ContactInfo;
    openingHours?: OpeningHoursFull;
    keyFacts: KeyFacts;
    metadata: ListingDetailsMetadata;
    bookingConfig?: BookingConfig;
    activityData?: ActivityData;
    pricing?: {
        basePrice?: number;
        currency?: string;
        unit?: string;
        displayPrice?: string;
    };
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
    allowSeasonRental?: boolean;
    allowRecurringBooking?: boolean;
    // Venue/space details
    fullDescription?: string;
    pricingDescription?: string;
    areaSquareMeters?: number;
    floors?: number;
    technicalInfo?: {
        capacityDetails?: Record<string, string | number>;
        sceneInfo?: Record<string, string>;
        equipment?: Record<string, unknown> | string[];
    };
    technicalSpecs?: Record<string, string>;
    venueDimensions?: Record<string, number>;
    documents?: Array<{ name: string; url: string; type?: string; size?: number; description?: string }>;
    // Event-specific fields
    ticketBaseUrl?: string;
    eventDate?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    ageLimit?: number;
    priceMax?: number;
    artists?: string[];
    genre?: string | string[];
    venueSlug?: string;
    venueName?: string;
    venueImage?: string;
    venueCapacity?: number;
    venueWheelchairSpots?: number;
    venueParkingInfo?: string;
    venueDescription?: string;
    shows?: Array<{ id: string; date: string; startTime: string; endTime: string; status: string; note?: string }>;
    ticketTypes?: Array<{ id: string; name: string; price: number; maxPerPurchase?: number; totalInventory?: number; soldCount?: number; description?: string; isActive?: boolean }>;
    ticketProvider?: { type: string; externalUrl?: string; externalEventId?: string; handlingFee?: number; refundPolicy?: string };
    ticketUrl?: string;
    tags?: string[];
    relatedEvents?: Array<{ id: string; slug?: string; name: string; subtitle?: string; image?: string; eventDate?: string; startTime?: string; venueName?: string; price?: number; priceMax?: number; genre?: string; artists?: string[] }>;
}
