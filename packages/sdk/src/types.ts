/**
 * DigilistSaaS SDK - Type Definitions
 */

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthUser {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    tenantId?: string;
    organizationId?: string;
    role?: string;
}

// ============================================================================
// Resource Types (Rental Objects)
// ============================================================================

export interface Resource {
    id: string;
    tenantId: string;
    organizationId?: string;
    name: string;
    slug: string;
    description?: string;
    categoryKey?: string;
    subcategoryKeys?: string[]; // Multiple subcategories per resource
    timeMode?: string;
    category?: ResourceCategory;
    status: ResourceStatus;
    pricePerHour?: number;
    pricePerDay?: number;
    currency?: string;
    capacity?: number;
    inventoryTotal?: number;
    requiresApproval?: boolean;
    location?: ResourceLocation;
    images?: ResourceImage[];
    features?: ResourceFeature[];
    pricing?: Record<string, unknown>;
    amenities?: string[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface ResourceImage {
    url: string;
    alt?: string;
    isPrimary?: boolean;
}

export interface ResourceFeature {
    name: string;
    value: unknown;
}

export type ResourceCategory =
    | 'boat'
    | 'cabin'
    | 'equipment'
    | 'facility'
    | 'vehicle'
    | 'other';

export type ResourceStatus =
    | 'draft'
    | 'published'
    | 'active'
    | 'archived'
    | 'maintenance'
    | 'deleted';

export interface ResourceLocation {
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
}

export interface CreateResourceInput {
    name: string;
    slug?: string;
    description?: string;
    category: ResourceCategory;
    pricePerHour?: number;
    pricePerDay?: number;
    currency?: string;
    capacity?: number;
    location?: ResourceLocation;
    amenities?: string[];
}

export interface UpdateResourceInput extends Partial<CreateResourceInput> {
    status?: ResourceStatus;
}

// ============================================================================
// Booking Types
// ============================================================================

export interface Booking {
    id: string;
    tenantId: string;
    resourceId: string;
    userId: string;
    organizationId?: string;
    startsAt: string;
    endsAt: string;
    status: BookingStatus;
    quantity: number;
    priceTotal: number;
    currency: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    checkinCode?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    // Joined data
    resource?: Resource;
    // Digdir-compatible aliases (same data, different field names)
    /** Alias for `resourceId` (digdir compat) */
    listingId: string;
    /** Alias for `startsAt` (digdir compat) */
    startTime: string;
    /** Alias for `endsAt` (digdir compat) */
    endTime: string;
    /** Alias for `priceTotal` as string (digdir compat) */
    totalPrice: string;
    /** Denormalised listing name (digdir compat) */
    listingName?: string;
    /** Denormalised user name (digdir compat) */
    userName?: string;
    /** Denormalised user email (digdir compat) */
    userEmail?: string;
    /** Denormalised user phone (digdir compat) */
    userPhone?: string;
    /** Denormalised organization name (digdir compat) */
    organizationName?: string;
    /** Payment status */
    paymentStatus?: string;
    /** Booking mode: authenticated or guest */
    bookingMode?: 'authenticated' | 'guest';
    /** Guest info (only present for guest bookings) */
    guestInfo?: {
        name?: string;
        email?: string;
        phone?: string;
        organization?: string;
        emailVerified?: boolean;
    };
}

export type BookingStatus =
    | 'pending'
    | 'confirmed'
    | 'checked_in'
    | 'completed'
    | 'cancelled'
    | 'no_show';

export interface CreateBookingInput {
    resourceId: string;
    startsAt: string;
    endsAt: string;
    quantity?: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    notes?: string;
}

// ============================================================================
// Calendar Types
// ============================================================================

export interface CalendarSlot {
    date: string;
    startTime: string;
    endTime: string;
    available: boolean;
    price?: number;
    bookingId?: string;
}

export interface CalendarDay {
    date: string;
    slots: CalendarSlot[];
    fullyBooked: boolean;
}

// ============================================================================
// User Types
// ============================================================================

export interface TenantUser {
    id: string;
    email: string;
    name?: string;
    role: string;
    status: 'active' | 'invited' | 'disabled';
    createdAt: string;
}

// ============================================================================
// Dashboard / Activity Types
// ============================================================================

export interface RecentActivity {
    id: string;
    action: string;
    description: string;
    type: string;
    timestamp: string;
    userId?: string;
    resourceId?: string;
}

// ============================================================================
// Payment Types
// ============================================================================

export interface PaymentTransaction {
    id: string;
    /** Alias for id (Vipps/Stripe order reference) */
    transactionId?: string;
    bookingId: string;
    type: 'payment' | 'refund' | 'capture' | 'void';
    /** Alias for type */
    transactionType?: 'payment' | 'refund' | 'capture' | 'void' | 'reserve';
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'initiated';
    provider?: string;
    reference?: string;
    /** Alias for reference (Vipps order ID) */
    orderId?: string;
    createdAt: string;
    completedAt?: string;
    failureReason?: string;
    metadata?: Record<string, unknown>;
}

export interface RefundPaymentDTO {
    bookingId: string;
    amount: number;
    currency?: string;
    reason?: string;
}

export interface InitiatePaymentDTO {
    bookingId: string;
    amount: number;
    description: string;
    returnUrl: string;
    currency?: string;
}

// ============================================================================
// Organization Types
// ============================================================================

export interface OrganizationMember {
    id: string;
    userId: string;
    organizationId: string;
    role: 'admin' | 'member';
    joinedAt: string;
    user?: {
        name?: string;
        email?: string;
    };
}

// ============================================================================
// Listing Projection Types (digdir-compatible)
// ============================================================================

export interface ListingCardProjectionDTO {
    id: string;
    name: string;
    slug: string;
    type: string;
    subcategoryKeys?: string[];
    typeLabel: string;
    city: string;
    locationFormatted: string;
    /** Short descriptive subtitle (configurable via cardConfig.locationField) */
    subtitle?: string;
    /** Venue name (enriched from venueSlug relationship) */
    venueName?: string;
    /** Venue card color (enriched from venue resource) */
    venueColor?: string;
    /** Venue card dark color (enriched from venue resource) */
    venueColorDark?: string;
    descriptionExcerpt?: string;
    primaryImageUrl?: string;
    amenities: string[];
    moreAmenitiesCount: number;
    capacity: number;
    priceAmount: number;
    priceUnit: string;
    priceCurrency: string;
    averageRating?: number;
    reviewCount: number;
    latitude?: number;
    longitude?: number;
    isAvailable: boolean;
    /** Pass-through metadata from resource */
    metadata?: Record<string, unknown>;
}

// ============================================================================
// API Response Types (from shared for consistency)
// ============================================================================

export type { PaginatedResponse } from '@digilist-saas/shared';

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

// ============================================================================
// Report Types
// ============================================================================

export type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

// ============================================================================
// Search Types
// ============================================================================

export type SearchEntityType =
    | 'listing'
    | 'booking'
    | 'user'
    | 'organization'
    | 'resource'
    | 'season'
    | 'block'
    | 'all';

export interface SearchFilters {
    query?: string;
    types?: SearchEntityType[];
    status?: string;
    startDate?: string;
    endDate?: string;
    organizationId?: string;
    [key: string]: unknown;
}

// ============================================================================
// Organization Extended Types
// ============================================================================

export type ActorType = 'user' | 'organization' | 'system' | 'service';

export type OrganizationStatus = 'active' | 'pending' | 'suspended' | 'deactivated';

export interface CreateOrganizationDTO {
    name: string;
    orgNumber?: string;
    /** Alias for orgNumber (backoffice form) */
    organizationNumber?: string;
    email?: string;
    phone?: string;
    address?: Address | string;
    type?: string;
    /** Actor/organization type (backoffice form, maps to type) */
    actorType?: string;
    /** Flat address fields for form convenience */
    city?: string;
    postalCode?: string;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// User Extended Types
// ============================================================================

export type UserRole = 'admin' | 'manager' | 'member' | 'viewer' | 'guest';

export type UserStatus = 'active' | 'invited' | 'disabled' | 'suspended';

export interface CreateUserDTO {
    email: string;
    name?: string;
    role?: UserRole;
    organizationId?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// Address Type
// ============================================================================

export interface Address {
    street?: string;
    street2?: string;
    postalCode?: string;
    city?: string;
    municipality?: string;
    county?: string;
    country?: string;
}

// ============================================================================
// Block Types
// ============================================================================

export type BlockType = 'maintenance' | 'holiday' | 'reserved' | 'closed' | 'other';

export interface CreateBlockDTO {
    resourceId: string;
    type: BlockType;
    title?: string;
    startTime: string;
    endTime: string;
    recurrence?: string;
    notes?: string;
}

export interface Conflict {
    id: string;
    resourceId: string;
    type: 'booking' | 'block';
    startTime: string;
    endTime: string;
    title?: string;
    bookingId?: string;
    blockId?: string;
}

// ============================================================================
// Season Types
// ============================================================================

export type SeasonalLeaseStatus =
    | 'draft'
    | 'pending'
    | 'active'
    | 'expired'
    | 'cancelled'
    | 'rejected';

export interface CreateSeasonDTO {
    name: string;
    startDate: string;
    endDate: string;
    type?: string;
    description?: string;
    applicationDeadline?: string;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// Realtime Types
// ============================================================================

export type { RealtimeEventType } from '@digilist-saas/shared/types';
