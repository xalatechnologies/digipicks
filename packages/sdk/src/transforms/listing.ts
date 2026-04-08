/**
 * DigilistSaaS SDK - Listing Transforms
 *
 * Maps between the Convex "resource" shape (as stored in the database and
 * returned by Convex queries) and the digdir "Listing" shape expected by
 * the client-sdk / UI layer.
 *
 * Convex resources have:
 *   _id, _creationTime, tenantId, name, slug, description, categoryKey,
 *   subcategoryKeys, timeMode, features, status, requiresApproval, capacity,
 *   inventoryTotal, images (array of objects), pricing (object), metadata, ...
 *
 * Digdir Listings expect:
 *   id, tenantId, name, slug, type, status, description, images (string[]),
 *   pricing (ListingPricing), capacity, address, location, metadata,
 *   createdAt (ISO), updatedAt (ISO), ...
 */

// =============================================================================
// Digdir-Compatible Types
// =============================================================================

export type ListingType = 'SPACE' | 'RESOURCE' | 'SERVICE' | 'EVENT' | 'VEHICLE' | 'OTHER';
export type ListingStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'changes_requested' | 'published' | 'paused' | 'expired' | 'archived' | 'delisted' | 'maintenance';
export type BookingModel = 'TIME_RANGE' | 'SLOT' | 'ALL_DAY' | 'QUANTITY' | 'CAPACITY' | 'PACKAGE' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
export type PricingUnit = 'hour' | 'day' | 'booking' | 'week' | 'month';

export interface ListingPricing {
    basePrice: number;
    currency: string;
    unit: PricingUnit;
    weekendMultiplier?: number;
    peakHoursMultiplier?: number;
}

export interface ListingLocation {
    address?: string;
    city?: string;
    postalCode?: string;
    municipality?: string;
    country?: string;
    lat?: number;
    lng?: number;
}

export interface TechnicalSpecs {
    audio?: string;
    lighting?: string;
    backline?: string;
    haze?: string;
    other?: string;
}

export interface VenueDimensions {
    stageWidth?: number;
    stageOpening?: number;
    stageDepth?: number;
    depthToBackdrop?: number;
    ceilingHeight?: number;
    riggingBars?: number;
}

export interface BookingConfig {
    bookingModel?: string;
    slotDurationMinutes?: number;
    minLeadTimeHours?: number;
    maxAdvanceDays?: number;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
    approvalRequired?: boolean;
    paymentRequired?: boolean;
    depositPercent?: number;
    cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
    allowRecurring?: boolean;
    allowSeasonalLease?: boolean;
}

export interface FAQItem {
    question: string;
    answer: string;
}

export interface RuleItem {
    title: string;
    description?: string;
    type?: string;
}

export interface DocumentItem {
    name: string;
    url: string;
    type?: string;
    size?: number;
    description?: string;
}

export interface OpeningHoursEntry {
    dayIndex: number;
    day: string;
    open: string;
    close: string;
    isClosed?: boolean;
}

export interface ListingMetadata {
    [key: string]: unknown;
}

export interface Listing {
    id: string;
    tenantId: string;
    organizationId?: string;
    name: string;
    slug: string;
    type: ListingType;
    categoryKey?: string;
    subcategoryKeys?: string[];
    bookingModel?: BookingModel;
    status: ListingStatus;

    // Display
    description?: string;
    subtitle?: string;
    fullDescription?: string;
    highlights?: string[];
    images: string[];
    visibility?: 'public' | 'unlisted' | 'private';

    // Location
    location?: ListingLocation;
    address?: string;

    // Capacity & Dimensions
    capacity?: number;
    quantity?: number;
    areaSquareMeters?: number;
    floors?: number;
    capacityDetails?: Array<{ label: string; capacity: number }> | Record<string, number>;

    // Venue-specific
    technicalSpecs?: TechnicalSpecs;
    venueDimensions?: VenueDimensions;
    parkingInfo?: string;
    galleryMedia?: Array<{ url: string; type?: 'image' | 'video'; caption?: string }>;
    contactEmail?: string;
    contactName?: string;
    contactPhone?: string;
    contactWebsite?: string;
    socialLinks?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        youtube?: string;
        tiktok?: string;
    };
    pricingDescription?: string;

    // Content
    faq?: FAQItem[];
    rules?: RuleItem[];
    documents?: DocumentItem[];

    // Pricing
    pricing: ListingPricing;

    // Booking
    bookingConfig?: BookingConfig;
    openingHours?: OpeningHoursEntry[];
    allowSeasonRental?: boolean;
    allowRecurringBooking?: boolean;

    // Custom booking slots
    customSlots?: Array<{ label?: string; startTime: string; endTime: string; price?: number }>;

    // Event-specific
    duration?: number;
    priceMax?: number;
    ticketUrl?: string;
    ageLimit?: number;
    tags?: string[];
    eventDate?: string;
    startTime?: string;
    endTime?: string;

    // Ticketing
    shows?: Array<{
        id: string;
        date: string;
        startTime: string;
        endTime: string;
        status: string;
        note?: string;
    }>;
    ticketTypes?: Array<{
        id: string;
        name: string;
        price: number;
        maxPerPurchase?: number;
        totalInventory?: number;
        soldCount?: number;
        description?: string;
        sortOrder?: number;
        isActive?: boolean;
    }>;
    ticketProvider?: {
        type: string;
        externalUrl?: string;
        externalEventId?: string;
        handlingFee?: number;
        refundPolicy?: string;
    };

    // ─── Relationships (typed IDs) ───
    venueId?: string;
    venueSlug?: string;
    venueResourceId?: string;
    linkedResourceIds?: string[];
    recommendedListingIds?: string[];
    linkedEvents?: Listing[];

    // Moderation (read-only, from moderation workflow)
    listingStatus?: string;
    moderationNote?: string;
    moderatedBy?: string;
    moderatedAt?: string;
    riskLevel?: string;
    autoApproved?: boolean;

    // Enriched (read-only, from other components)
    amenities?: string[];
    averageRating?: number;
    reviewCount?: number;

    // Timestamps
    createdAt: string;
    updatedAt: string;

    // Legacy catch-all
    metadata?: ListingMetadata;
}

// =============================================================================
// DTOs
// =============================================================================

export interface CreateListingDTO {
    // Required
    name: string;
    type: ListingType;

    // Optional identity
    slug?: string;
    organizationId?: string;
    subcategoryKeys?: string[];

    // Display
    description?: string;
    subtitle?: string;
    fullDescription?: string;
    highlights?: string[];
    images?: string[];
    visibility?: 'public' | 'unlisted' | 'private';

    // Location
    location?: ListingLocation;

    // Capacity
    capacity?: number;
    areaSquareMeters?: number;
    floors?: number;
    capacityDetails?: Array<{ label: string; capacity: number }> | Record<string, number>;

    // Venue-specific
    technicalSpecs?: TechnicalSpecs;
    venueDimensions?: VenueDimensions;
    parkingInfo?: string;
    galleryMedia?: Array<{ url: string; type?: 'image' | 'video'; caption?: string }>;
    contactEmail?: string;
    contactName?: string;
    contactPhone?: string;
    contactWebsite?: string;
    socialLinks?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        youtube?: string;
        tiktok?: string;
    };
    pricingDescription?: string;

    // Content
    faq?: FAQItem[];
    rules?: RuleItem[];
    documents?: DocumentItem[];

    // Pricing
    pricing?: Partial<ListingPricing>;
    bookingModel?: BookingModel;

    // Booking
    bookingConfig?: BookingConfig;
    openingHours?: OpeningHoursEntry[];
    slotDurationMinutes?: number;
    customSlots?: Array<{ label?: string; startTime: string; endTime: string; price?: number }>;
    allowSeasonRental?: boolean;
    allowRecurringBooking?: boolean;

    // Amenities
    amenities?: string[];

    // Event-specific
    venueSlug?: string;
    venueId?: string;
    duration?: number;
    priceMax?: number;
    ticketUrl?: string;
    ageLimit?: number;
    tags?: string[];
    eventDate?: string;
    startTime?: string;
    endTime?: string;

    // Ticketing
    shows?: Listing['shows'];
    ticketTypes?: Listing['ticketTypes'];
    ticketProvider?: Listing['ticketProvider'];

    // Relationships
    linkedResourceIds?: string[];
    recommendedListingIds?: string[];

    // Dynamic data
    metadata?: ListingMetadata;
}

export interface UpdateListingDTO extends Partial<CreateListingDTO> {
    status?: ListingStatus;
}

export interface ListingQueryParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    type?: ListingType;
    status?: ListingStatus;
    organizationId?: string;
    search?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    minCapacity?: number;
    maxCapacity?: number;
    amenities?: string;
    tenantId?: string;
}

export interface AvailabilityQueryParams {
    startDate: string;
    endDate: string;
    duration?: number;
}

export interface PublicListingParams {
    tenantId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    type?: ListingType;
    city?: string;
    municipality?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    capacity?: number;
    date?: string;
    search?: string;
}

// =============================================================================
// Convex Raw Shape (loose – matches what Convex queries actually return)
// =============================================================================

/** Minimal shape of a Convex resource document as returned by a query. */
export interface ConvexResource {
    _id: string;
    _creationTime: number;
    tenantId: string;
    organizationId?: string;
    name: string;
    slug: string;
    description?: string;
    categoryKey: string;
    subcategoryKeys?: string[];
    timeMode?: string;
    features?: Array<{ name: string; value: unknown }>;
    ruleSetKey?: string;
    status: string;
    requiresApproval?: boolean;
    capacity?: number;
    inventoryTotal?: number;
    images?: Array<{ url: string; alt?: string; isPrimary?: boolean } | string>;
    pricing?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    /** If the resource carries an explicit updatedAt epoch. */
    updatedAt?: number;
    // Promoted fields
    subtitle?: string;
    fullDescription?: string;
    highlights?: string[];
    visibility?: string;
    location?: Record<string, unknown>;
    areaSquareMeters?: number;
    floors?: number;
    capacityDetails?: Array<{ label: string; capacity: number }> | Record<string, number>;
    technicalSpecs?: Record<string, unknown>;
    venueDimensions?: Record<string, unknown>;
    parkingInfo?: string;
    galleryMedia?: Array<{ url: string; type?: 'image' | 'video'; caption?: string }>;
    contactEmail?: string;
    contactName?: string;
    contactPhone?: string;
    contactWebsite?: string;
    socialLinks?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        youtube?: string;
        tiktok?: string;
    };
    pricingDescription?: string;
    faq?: Array<{ question: string; answer: string }>;
    rules?: Array<{ title: string; description?: string; type?: string }>;
    documents?: Array<{ name: string; url: string; type?: string; size?: number; description?: string }>;
    bookingConfig?: Record<string, unknown>;
    // Event fields
    duration?: number;
    priceMax?: number;
    ticketUrl?: string;
    ageLimit?: number;
    tags?: string[];
    eventDate?: string;
    startTime?: string;
    endTime?: string;
    // Ticketing fields
    shows?: Array<{ id: string; date: string; startTime: string; endTime: string; status: string; note?: string }>;
    ticketTypes?: Array<{ id: string; name: string; price: number; maxPerPurchase?: number; totalInventory?: number; soldCount?: number; description?: string; sortOrder?: number; isActive?: boolean }>;
    ticketProvider?: { type: string; externalUrl?: string; externalEventId?: string; handlingFee?: number; refundPolicy?: string };
    // Relationships
    venueId?: string;
    venueSlug?: string;
    venueResourceId?: string;
    linkedResourceIds?: string[];
    recommendedListingIds?: string[];
    venueBookingId?: string;
    allowSeasonRental?: boolean;
    allowRecurringBooking?: boolean;
    openingHours?: Array<{ dayIndex: number; day: string; open: string; close: string; isClosed?: boolean }>;
    slotDurationMinutes?: number;
    customSlots?: Array<{ label?: string; startTime: string; endTime: string; price?: number }>;
    minBookingDuration?: number;
    maxBookingDuration?: number;
    // Moderation fields
    listingStatus?: string;
    moderationNote?: string;
    moderatedBy?: string;
    moderatedAt?: number;
    riskLevel?: string;
    autoApproved?: boolean;
}

// =============================================================================
// Category Key -> ListingType Mapping
// =============================================================================

/**
 * Maps known Convex `categoryKey` values (Norwegian and English) to the
 * digdir `ListingType` enum.  Unknown keys fall back to `'OTHER'`.
 */
export const CATEGORY_TO_LISTING_TYPE: Record<string, ListingType> = {
    // Norwegian keys used in the Convex schema (matching seeds/categories.ts)
    'LOKALER': 'SPACE',
    'SPORT': 'RESOURCE',
    'ARRANGEMENTER': 'EVENT',
    'TORGET': 'SERVICE',
    // Venue-specific keys
    'NAERING': 'SERVICE',
    'KULTUR': 'EVENT',
    'SELSKAP': 'EVENT',
    // Legacy keys (keep for backward compatibility)
    'ARRANGEMENT': 'EVENT',
    'TORG': 'SERVICE',
    // English aliases
    'space': 'SPACE',
    'SPACE': 'SPACE',
    'resource': 'RESOURCE',
    'RESOURCE': 'RESOURCE',
    'event': 'EVENT',
    'EVENT': 'EVENT',
    'service': 'SERVICE',
    'SERVICE': 'SERVICE',
    'vehicle': 'VEHICLE',
    'VEHICLE': 'VEHICLE',
    // Common SDK ResourceCategory values
    'boat': 'VEHICLE',
    'cabin': 'SPACE',
    'equipment': 'RESOURCE',
    'facility': 'SPACE',
    'other': 'OTHER',
    'OTHER': 'OTHER',
};

/** Map ListingType → Convex categoryKey (canonical for filter aggregation, single source of truth) */
export const LISTING_TYPE_TO_CATEGORY: Record<string, string> = {
    SPACE: 'LOKALER',
    RESOURCE: 'SPORT',
    EVENT: 'ARRANGEMENTER',
    SERVICE: 'TORGET',
    VEHICLE: 'OTHER',
    OTHER: 'OTHER',
};

/** Inverse: categoryKey → ListingType (for filter logic).
 *  Only includes categories that map 1:1 to a listing type.
 *  Grouped parent categories (NAERING, KULTUR, SELSKAP, ARRANGEMENT)
 *  rely on subcategory-parent matching instead. */
export const CATEGORY_TO_TYPE: Record<string, string> = {
    LOKALER: 'SPACE',
    SPORT: 'RESOURCE',
    ARRANGEMENTER: 'EVENT',
    TORGET: 'SERVICE',
    OTHER: 'OTHER',
};

function categoryKeyToListingType(categoryKey: string): ListingType {
    return CATEGORY_TO_LISTING_TYPE[categoryKey] ?? 'OTHER';
}

// =============================================================================
// Status Mapping
// =============================================================================

/**
 * Maps Convex resource statuses to the narrower digdir ListingStatus set.
 * Convex allows: draft | published | active | archived | maintenance | deleted
 * Digdir allows: draft | published | archived | maintenance
 */
function statusToListingStatus(status: string): ListingStatus {
    const validStatuses: ListingStatus[] = [
        'draft', 'pending_review', 'approved', 'rejected', 'changes_requested',
        'published', 'paused', 'expired', 'archived', 'delisted', 'maintenance',
    ];
    if (validStatuses.includes(status as ListingStatus)) {
        return status as ListingStatus;
    }
    switch (status) {
        case 'active':
            return 'published';
        case 'deleted':
            return 'archived';
        default:
            return 'draft';
    }
}

// =============================================================================
// Convex Resource -> Listing
// =============================================================================

/**
 * Transform a raw Convex resource document into the digdir `Listing` shape.
 *
 * - `_id` is mapped to `id`
 * - `categoryKey` is mapped to `type` (ListingType) and also kept as-is
 * - Epoch timestamps (`_creationTime`, optional `updatedAt`) become ISO strings
 * - `images` are normalised to `string[]` (Convex may store objects with `url`)
 * - `pricing` is normalised to `ListingPricing`
 * - Location information is extracted from `metadata` when available
 */
export function convexResourceToListing(resource: ConvexResource): Listing {
    const meta = (resource.metadata ?? {}) as Record<string, unknown>;
    const pricingRaw = resource.pricing ?? {};

    // --- images: normalise to string[] ---
    const images: string[] = (resource.images ?? []).map((img) => {
        if (typeof img === 'string') return img;
        if (img && typeof img === 'object' && 'url' in img) return (img as { url: string }).url;
        return '';
    }).filter(Boolean);

    // --- pricing ---
    const pricing: ListingPricing = {
        basePrice: Number((pricingRaw as Record<string, unknown>).basePrice ?? (pricingRaw as Record<string, unknown>).pricePerHour ?? 0),
        currency: String((pricingRaw as Record<string, unknown>).currency ?? 'NOK'),
        unit: ((pricingRaw as Record<string, unknown>).unit as PricingUnit) ?? 'hour',
        weekendMultiplier: (pricingRaw as Record<string, unknown>).weekendMultiplier as number | undefined,
        peakHoursMultiplier: (pricingRaw as Record<string, unknown>).peakHoursMultiplier as number | undefined,
    };

    // --- location (from resource-level or metadata fields) ---
    const resLocation = (resource.location ?? {}) as Record<string, unknown>;
    const metaCoords = (meta.coordinates ?? {}) as Record<string, unknown>;
    const metaLocation = (meta.location ?? {}) as Record<string, unknown>;
    const location: ListingLocation | undefined = (
        resLocation.lat != null ||
        resLocation.lng != null ||
        resLocation.latitude != null ||
        resLocation.longitude != null ||
        metaLocation.lat != null ||
        metaLocation.lng != null ||
        metaLocation.latitude != null ||
        metaLocation.longitude != null ||
        metaCoords.lat != null ||
        metaCoords.lng != null ||
        metaLocation.address != null ||
        metaLocation.city != null ||
        meta.address != null ||
        meta.city != null
    )
        ? {
            lat: (resLocation.lat ?? resLocation.latitude ?? metaLocation.lat ?? metaLocation.latitude ?? metaCoords.lat) as number | undefined,
            lng: (resLocation.lng ?? resLocation.longitude ?? metaLocation.lng ?? metaLocation.longitude ?? metaCoords.lng) as number | undefined,
            address: (resLocation.address as string) ?? (metaLocation.address as string) ?? (meta.address as string) ?? undefined,
            postalCode: (resLocation.postalCode as string) ?? (metaLocation.postalCode as string) ?? (meta.postalCode as string) ?? undefined,
            city: (resLocation.city as string) ?? (metaLocation.city as string) ?? (meta.city as string) ?? undefined,
            country: (resLocation.country as string) ?? (metaLocation.country as string) ?? undefined,
            municipality: (resLocation.municipality as string) ?? (metaLocation.municipality as string) ?? undefined,
        }
        : undefined;

    // --- metadata (pass through, cast to ListingMetadata) ---
    const metadata: ListingMetadata | undefined = Object.keys(meta).length > 0
        ? (meta as unknown as ListingMetadata)
        : undefined;

    // --- timestamps ---
    const createdAt = new Date(resource._creationTime).toISOString();
    const updatedAt = resource.updatedAt
        ? new Date(resource.updatedAt).toISOString()
        : createdAt;

    // --- address (root-level convenience) ---
    const address = location?.address ?? (meta.address as string | undefined);

    return {
        id: resource._id,
        tenantId: resource.tenantId,
        organizationId: resource.organizationId,
        name: resource.name,
        slug: resource.slug,
        type: categoryKeyToListingType(resource.categoryKey),
        categoryKey: resource.categoryKey,
        subcategoryKeys: resource.subcategoryKeys,
        status: statusToListingStatus(resource.status),
        description: resource.description,
        images,
        pricing,
        capacity: resource.capacity,
        quantity: resource.inventoryTotal,
        address,
        location,
        metadata,
        createdAt,
        updatedAt,
        // Custom booking slots
        customSlots: resource.customSlots,
        // Moderation fields (pass through from resource)
        listingStatus: resource.listingStatus,
        moderationNote: resource.moderationNote,
        moderatedBy: resource.moderatedBy,
        moderatedAt: resource.moderatedAt ? new Date(resource.moderatedAt).toISOString() : undefined,
        riskLevel: resource.riskLevel,
        autoApproved: resource.autoApproved,
    };
}

// =============================================================================
// CreateListingDTO -> Convex Create Args
// =============================================================================

/**
 * Transform a `CreateListingDTO` (digdir shape) into the arguments expected
 * by the Convex `domain.resources.create` mutation.
 *
 * The caller is responsible for supplying `tenantId` separately — this
 * function only maps the DTO fields that originate from user input.
 */
// =============================================================================
// Listing -> UI ListingCard Props (transformListing)
// =============================================================================

/** Shape expected by DS ListingCard component. */
export interface UiListing {
    id: string;
    name: string;
    slug: string;
    type: string;
    listingType: string;
    status: string;
    description: string;
    image?: string;
    location: string;
    facilities: string[];
    moreFacilities: number;
    capacity: number;
    price: number;
    priceUnit: string;
    currency: string;
}

const UI_LISTING_TYPE_LABELS: Record<string, string> = {
    SPACE: 'Lokale',
    RESOURCE: 'Utstyr',
    SERVICE: 'Tjeneste',
    VEHICLE: 'Kjøretøy',
    EVENT: 'Arrangement',
    OTHER: 'Annet',
};

/**
 * Transform a Listing into the shape expected by the DS ListingCard component.
 * This is used by admin grid views in backoffice/minside.
 */
export function transformListing(listing: Listing): UiListing {
    const MAX_FACILITIES = 3;
    const amenities = listing.metadata?.amenities as string[] | undefined ?? [];
    const features = listing.metadata?.features as string[] | undefined ?? [];
    const allFacilities = [...amenities, ...features];

    // Location string - check both listing.location and listing.metadata for address/city
    const loc = listing.location;
    const meta = listing.metadata as Record<string, unknown> | undefined;
    const city = loc?.city ?? (meta?.city as string) ?? '';
    const addrRaw = loc?.address ?? (meta?.address as string | undefined) ?? listing.address;
    const address = typeof addrRaw === 'string' ? addrRaw : '';
    const postalCode = loc?.postalCode ?? (meta?.postalCode as string) ?? '';
    const location = [address, postalCode, city].filter(Boolean).join(', ') || '';

    return {
        id: listing.id,
        name: listing.name,
        slug: listing.slug,
        type: listing.type,
        listingType: UI_LISTING_TYPE_LABELS[listing.type] ?? listing.type,
        status: listing.status,
        description: listing.description ?? '',
        image: listing.images[0],
        location,
        facilities: allFacilities.slice(0, MAX_FACILITIES),
        moreFacilities: Math.max(0, allFacilities.length - MAX_FACILITIES),
        capacity: listing.capacity ?? 0,
        price: listing.pricing?.basePrice ?? 0,
        priceUnit: listing.pricing?.unit ?? 'time',
        currency: listing.pricing?.currency ?? 'NOK',
    };
}

// =============================================================================
// CreateListingDTO -> Convex Create Args
// =============================================================================

export function listingInputToConvexResource(input: CreateListingDTO): {
    name: string;
    slug: string;
    description?: string;
    categoryKey: string;
    timeMode: string;
    status: string;
    requiresApproval: boolean;
    capacity?: number;
    inventoryTotal?: number;
    images: Array<{ url: string; alt?: string; isPrimary?: boolean }>;
    pricing: Record<string, unknown>;
    metadata: Record<string, unknown>;
    organizationId?: string;
} {
    // Reverse-map ListingType back to a categoryKey.  We use the type value
    // directly since the Convex schema accepts arbitrary strings.
    const categoryKey = input.type ?? 'OTHER';

    // Derive a slug when none is provided.
    const slug = input.slug ?? input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Images: convert plain URLs into the Convex image-object shape.
    const images = (input.images ?? []).map((url, i) => ({
        url,
        alt: input.name,
        isPrimary: i === 0,
    }));

    // Pricing
    const pricing: Record<string, unknown> = {};
    if (input.pricing) {
        if (input.pricing.basePrice != null) pricing.basePrice = input.pricing.basePrice;
        if (input.pricing.currency) pricing.currency = input.pricing.currency;
        if (input.pricing.unit) pricing.unit = input.pricing.unit;
        if (input.pricing.weekendMultiplier != null) pricing.weekendMultiplier = input.pricing.weekendMultiplier;
        if (input.pricing.peakHoursMultiplier != null) pricing.peakHoursMultiplier = input.pricing.peakHoursMultiplier;
    }

    // Determine time mode from booking model
    const timeModeMap: Record<string, string> = {
        TIME_RANGE: 'time_range',
        SLOT: 'slot',
        ALL_DAY: 'all_day',
        QUANTITY: 'quantity',
        CAPACITY: 'capacity',
        PACKAGE: 'package',
        WEEKLY: 'weekly',
        MONTHLY: 'monthly',
        CUSTOM: 'CUSTOM',
    };
    const timeMode = input.bookingModel
        ? (timeModeMap[input.bookingModel] ?? 'time_range')
        : 'time_range';

    return {
        name: input.name,
        slug,
        description: input.description,
        categoryKey,
        timeMode,
        status: 'draft',
        requiresApproval: false,
        capacity: input.capacity,
        images,
        pricing,
        metadata: (input.metadata ?? {}) as Record<string, unknown>,
        organizationId: input.organizationId,
    };
}
