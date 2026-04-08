/**
 * DigilistSaaS SDK - Listing Hooks (Tier 1 Adapter)
 *
 * Provides React Query-shaped hooks (`{ data, isLoading, error }` for queries,
 * `{ mutate, mutateAsync, isLoading, error, isSuccess }` for mutations) backed
 * by the Convex real-time engine.
 *
 * These hooks mirror the function signatures of the digdir client-sdk
 * `use-listings.ts` so that consuming apps can swap implementations without
 * touching component code.
 *
 * Internally each hook delegates to Convex `useQuery` / `useMutation` and
 * transforms the Convex `Resource` document shape into the canonical `Listing`
 * shape expected by the UI layer.
 */

import { useQuery as useConvexQueryRaw, useMutation as useConvexMutationRaw } from "./convex-utils";
import { api, type TenantId, type ResourceId } from "../convex-api";
import { useCallback, useRef, useState } from "react";
import { toPaginatedResponse, toSingleResponse, type PaginatedResponse, type SingleResponse } from "../transforms/common";
import { useResolveTenantId } from "./use-tenant-id";
import { useAuth } from "./use-auth";
import type {
  ListingType,
  ListingStatus,
  BookingModel,
  PricingUnit,
  ListingPricing,
  ListingLocation,
  ListingMetadata,
  TechnicalSpecs,
  VenueDimensions,
  BookingConfig,
  FAQItem,
  RuleItem,
  DocumentItem,
  OpeningHoursEntry,
  CreateListingDTO,
  UpdateListingDTO,
  ListingQueryParams,
  AvailabilityQueryParams,
  PublicListingParams,
  ConvexResource,
} from "../transforms/listing";

// Re-export canonical types from transforms (single source of truth)
export type {
  ListingType, ListingStatus, BookingModel, PricingUnit,
  ListingPricing, ListingLocation, ListingMetadata,
  TechnicalSpecs, VenueDimensions, BookingConfig,
  FAQItem, RuleItem, DocumentItem, OpeningHoursEntry,
  CreateListingDTO, UpdateListingDTO,
  ListingQueryParams, AvailabilityQueryParams, PublicListingParams,
};

// ============================================================================
// Listing Domain Types (hook-specific: extend transforms where needed)
// ============================================================================

export interface ListingImage {
  id?: string;
  url: string;
  alt?: string;
  isPrimary?: boolean;
  order?: number;
  storageId?: string;
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
  description?: string;
  subtitle?: string;
  fullDescription?: string;
  highlights?: string[];
  images: ListingImage[];
  visibility?: 'public' | 'unlisted' | 'private';
  pricing: ListingPricing;
  capacity?: number;
  quantity?: number;
  location?: ListingLocation;
  areaSquareMeters?: number;
  floors?: number;
  capacityDetails?: Array<{ label: string; capacity: number }> | Record<string, number>;
  technicalSpecs?: TechnicalSpecs;
  venueDimensions?: VenueDimensions;
  parkingInfo?: string;
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
  galleryMedia?: Array<{ url: string; type?: 'image' | 'video'; caption?: string }>;
  pricingDescription?: string;
  faq?: FAQItem[];
  rules?: RuleItem[];
  documents?: DocumentItem[];
  bookingConfig?: BookingConfig;
  slotDurationMinutes?: number;
  customSlots?: Array<{ label?: string; startTime: string; endTime: string; price?: number }>;
  enabledPackageIds?: string[];
  openingHours?: OpeningHoursEntry[];
  allowSeasonRental?: boolean;
  allowRecurringBooking?: boolean;
  duration?: number;
  priceMax?: number;
  ticketUrl?: string;
  ageLimit?: number;
  tags?: string[];
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  shows?: Array<{ id: string; date: string; startTime: string; endTime: string; status: string; note?: string }>;
  ticketTypes?: Array<{ id: string; name: string; price: number; maxPerPurchase?: number; totalInventory?: number; soldCount?: number; description?: string; sortOrder?: number; isActive?: boolean }>;
  ticketProvider?: { type: string; externalUrl?: string; externalEventId?: string; handlingFee?: number; refundPolicy?: string };
  venueId?: string;
  venueSlug?: string;
  venueResourceId?: string;
  venueName?: string;
  venueColor?: string;
  venueColorDark?: string;
  venueImage?: string;
  venueDescription?: string;
  venueCapacity?: number;
  venueWheelchairSpots?: number;
  venueBookingId?: string;
  venueParkingInfo?: string;
  linkedResourceIds?: string[];
  recommendedListingIds?: string[];
  linkedEvents?: Listing[];
  amenities?: string[];
  averageRating?: number;
  reviewCount?: number;
  metadata?: ListingMetadata;
  createdAt: string;
  updatedAt: string;
  // Card projection fields (populated by transformResourceToListing)
  typeLabel?: string;
  city?: string;
  address?: string;
  locationFormatted?: string;
  descriptionExcerpt?: string;
  primaryImageUrl?: string;
  moreAmenitiesCount?: number;
  priceAmount?: number;
  priceUnit?: string;
  priceCurrency?: string;
  latitude?: number;
  longitude?: number;
  isAvailable?: boolean;
}

// ---- Related Types (hook-specific; not in transforms) ----

export interface ListingAvailability {
  listingId: string;
  startDate: string;
  endDate: string;
  blockedSlots: Array<{
    startTime: string;
    endTime: string;
    status: string;
  }>;
}

export interface ListingStats {
  listingId: string;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  utilizationRate: number;
  lastBooking?: string;
}

export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  slug?: string;
  description?: string;
  icon?: string;
  listingCount?: number;
  parentId?: string;
  children?: Category[];
}

export interface City {
  name: string;
  slug: string;
  listingCount?: number;
}

export interface Municipality {
  code: string;
  name: string;
  county: string;
  listingCount?: number;
}

// ============================================================================
// Wrapper shapes (React Query compatible)
// ============================================================================

interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
  isSuccess: boolean;
}

interface MutationResult<TArgs, TData = unknown> {
  mutate: (args: TArgs) => void;
  mutateAsync: (args: TArgs) => Promise<TData>;
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

// ============================================================================
// Convex -> Listing Transform
// ============================================================================

/** Map Convex categoryKey to ListingType */
function categoryKeyToListingType(categoryKey?: string): ListingType {
  if (!categoryKey) return "OTHER";
  const map: Record<string, ListingType> = {
    // Convex seed category keys (matching seeds/categories.ts)
    lokaler: "SPACE",
    sport: "RESOURCE",
    arrangementer: "EVENT",
    torget: "SERVICE",
    // Venue-specific keys
    naering: "SERVICE",
    kultur: "EVENT",
    selskap: "EVENT",
    // Legacy keys
    arrangement: "EVENT",
    torg: "SERVICE",
    boat: "VEHICLE",
    cabin: "SPACE",
    equipment: "RESOURCE",
    facility: "SPACE",
    vehicle: "VEHICLE",
    space: "SPACE",
    resource: "RESOURCE",
    service: "SERVICE",
    event: "EVENT",
    other: "OTHER",
    // Arrangement subcategory keys (safety net: if categoryKey is set to subcategory)
    konsert: "EVENT",
    konserter: "EVENT",
    standup: "EVENT",
    teater_revy: "EVENT",
    festivaler: "EVENT",
    utstilling: "EVENT",
    foredrag: "EVENT",
    foredrag_konferanser: "EVENT",
    visning: "EVENT",
    annet: "EVENT",
    kurs: "EVENT",
    workshop: "EVENT",
  };
  return map[categoryKey.toLowerCase()] ?? "OTHER";
}

/** Norwegian labels for category keys */
function categoryKeyToLabel(categoryKey?: string): string {
  if (!categoryKey) return "Annet";
  const map: Record<string, string> = {
    lokaler: "Lokaler",
    sport: "Sport",
    arrangementer: "Arrangementer",
    torget: "Torget",
    // Venue-specific keys
    naering: "Næring",
    kultur: "Kultur",
    selskap: "Selskap",
    // Legacy keys
    arrangement: "Arrangement",
    torg: "Torg & Utleie",
    space: "Lokale",
    resource: "Utstyr",
    service: "Tjeneste",
    event: "Arrangement",
    vehicle: "Kjøretøy",
    other: "Annet",
  };
  return map[categoryKey.toLowerCase()] ?? categoryKey;
}

/** Norwegian translations for feature/amenity names */
const featureNameNorwegian: Record<string, string> = {
  projector: "Projektor",
  audio_system: "Lydanlegg",
  sound_system: "Lydanlegg",
  video_conference: "Videokonferanse",
  whiteboard: "Tavle",
  kitchen: "Kjøkken",
  outdoor_area: "Uteareal",
  indoor: "Innendørs",
  outdoor: "Utendørs",
  heated: "Oppvarmet",
  basketball_court: "Basketballbane",
  handball_court: "Håndballbane",
  artificial_turf: "Kunstgress",
  floodlights: "Flomlys",
  grandstand: "Tribune",
  backstage: "Backstage",
  lighting_rig: "Lysrigg",
  market_stalls_available: "Markedsboder",
  wifi: "WiFi",
  wheelchair: "Rullestoltilgang",
  parking: "Parkering",
  elevator: "Heis",
  garderobe: "Garderobe",
  shower: "Dusj",
  coffee: "Kaffemaskin",
  // Venue-specific features
  stage: "Scene",
  stage_small: "Scene",
  accessible: "HC-tilgang",
  bar: "Bar",
  catering_kitchen: "Catering",
  mini_kitchen: "Minikjøkken",
  hearing_loop: "Teleslynge",
  river_view: "Elveutsikt",
  black_box: "Black Box",
  contemporary_art: "Kunstgalleri",
  extra_ceiling_height: "Takhøyde",
  teams_setup: "Teams",
  flexible_seating: "Fleksibelt",
};

/** Translate a feature name to Norwegian */
function translateFeature(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, "_");
  return featureNameNorwegian[key] ?? name.replace(/_/g, " ");
}

/** Map ListingType back to a Convex categoryKey for mutations */
function listingTypeToCategoryKey(type: ListingType): string {
  const map: Record<ListingType, string> = {
    SPACE: "LOKALER",
    RESOURCE: "SPORT",
    SERVICE: "TORGET",
    EVENT: "ARRANGEMENTER",
    VEHICLE: "vehicle",
    OTHER: "other",
  };
  return map[type] ?? "other";
}

/**
 * Transform a raw Convex resource document into the canonical Listing shape.
 * Safe to call with any Convex resource row.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
/** Convex resource with optional facade-enriched fields */
type EnrichedResource = ConvexResource & {
  venueName?: string;
  venueColor?: string;
  venueColorDark?: string;
  venueImage?: string;
  venueDescription?: string;
  venueCapacity?: number;
  venueWheelchairSpots?: number;
  venueParkingInfo?: string;
  venueBookingId?: string;
  reviewStats?: { averageRating?: number; total?: number };
  linkedEvents?: unknown[];
  amenities?: string[];
};

function transformResourceToListing(r: EnrichedResource): Listing {
  // Extract image objects, prioritizing the primary image first
  let images: ListingImage[] = [];
  if (Array.isArray(r.images)) {
    images = r.images.map((img: unknown, idx: number) => {
      if (typeof img === "string") return { id: `img-${idx}`, url: img, alt: r.name ?? "", isPrimary: idx === 0, order: idx };
      if (img && typeof img === "object") {
        const o = img as Record<string, unknown>;
        return {
          id: (o.id as string) ?? `img-${idx}`,
          url: (o.url as string) ?? "",
          alt: (o.alt as string) ?? r.name ?? "",
          isPrimary: !!o.isPrimary,
          order: (o.sort_order as number) ?? (o.order as number) ?? idx,
          storageId: o.storageId as string | undefined,
        };
      }
      return { id: `img-${idx}`, url: "", alt: "", isPrimary: false, order: idx };
    }).filter((o: ListingImage) => o.url);
    // Sort primary images first, then by order
    images.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }

  const rawPricing = (r.pricing ?? {}) as Record<string, any>;
  const priceAmount: number =
    typeof rawPricing === "object"
      ? (rawPricing.basePrice ?? rawPricing.pricePerHour ?? 0) as number
      : 0;
  const priceCurrency: string =
    typeof rawPricing === "object" ? (rawPricing.currency ?? "NOK") as string : "NOK";
  const priceUnit: string =
    typeof rawPricing === "object"
      ? (rawPricing.unit ?? (rawPricing.pricePerHour ? "time" : "booking")) as string
      : "booking";

  const pricing: ListingPricing = {
    basePrice: priceAmount,
    currency: priceCurrency,
    unit: (rawPricing.unit as PricingUnit) ?? "hour",
    weekendMultiplier:
      typeof rawPricing === "object" ? rawPricing.weekendMultiplier : undefined,
    peakHoursMultiplier:
      typeof rawPricing === "object" ? rawPricing.peakHoursMultiplier : undefined,
  };

  const metadata: ListingMetadata | undefined = r.metadata
    ? (r.metadata as ListingMetadata)
    : undefined;

  const createdAt = r._creationTime
    ? new Date(r._creationTime).toISOString()
    : new Date().toISOString();

  // Extract amenities: prefer promoted top-level field, fall back to features array
  const promotedAmenities = Array.isArray(r.amenities) ? r.amenities as string[] : [];
  const featureAmenities: string[] = Array.isArray(r.features)
    ? r.features
      .filter((f: { name: string; value: unknown }) => f.value === true)
      .map((f: { name: string }) => translateFeature(f.name))
    : [];
  const amenities: string[] = promotedAmenities.length > 0 ? promotedAmenities : featureAmenities;

  // Extract location: prefer top-level promoted field, fall back to metadata
  const meta = r.metadata as Record<string, unknown> | undefined;
  const topLocation = r.location as Record<string, unknown> | undefined;
  const metaLocation = (meta?.location ?? {}) as Record<string, unknown>;
  const metaCoords = (meta?.coordinates ?? {}) as Record<string, unknown>;
  const addrRaw = meta?.address;
  const city = (topLocation?.city ?? metaLocation?.city ?? meta?.city ?? "") as string;
  const addressStr = (topLocation?.address ?? metaLocation?.address ?? (typeof addrRaw === "string" ? addrRaw : (addrRaw as Record<string, unknown>)?.street)) as string ?? "";
  const postalCode = (topLocation?.postalCode ?? metaLocation?.postalCode ?? meta?.postalCode ?? "") as string;
  // Avoid duplicating postal/city if already in the address string
  const addrHasPostal = postalCode && addressStr.includes(postalCode);
  const addrHasCity = city && addressStr.toLowerCase().includes(city.toLowerCase());
  const locationFormatted = addrHasPostal || addrHasCity
    ? addressStr || [postalCode, city].filter(Boolean).join(' ') || city
    : [addressStr, postalCode, city].filter(Boolean).join(', ') || city || '';

  const listingType = categoryKeyToListingType(r.categoryKey);
  const typeLabel = categoryKeyToLabel(r.categoryKey);

  // Build object satisfying both Listing AND ListingCardProjectionDTO
  return {
    // Listing fields
    id: r._id as string,
    tenantId: r.tenantId as string,
    organizationId: r.organizationId as string | undefined,
    name: r.name ?? "",
    slug: r.slug ?? "",
    type: listingType,
    categoryKey: r.categoryKey as string | undefined,
    subcategoryKeys: Array.isArray(r.subcategoryKeys) ? r.subcategoryKeys : [],
    bookingModel: r.timeMode as BookingModel | undefined,
    status: (r.status ?? "draft") as ListingStatus,
    description: r.description,
    images,
    pricing,
    capacity: r.capacity ?? 0,
    quantity: r.inventoryTotal,
    metadata,
    createdAt,
    updatedAt: createdAt,
    // Promoted fields (top-level first, metadata fallback)
    subtitle: (r.subtitle ?? meta?.subtitle) as string | undefined,
    fullDescription: (r.fullDescription ?? meta?.fullDescription) as string | undefined,
    highlights: (r.highlights ?? meta?.highlights) as string[] | undefined,
    visibility: (r.visibility ?? meta?.visibility) as 'public' | 'unlisted' | 'private' | undefined,
    location: topLocation ? {
      address: topLocation.address as string | undefined,
      city: topLocation.city as string | undefined,
      postalCode: topLocation.postalCode as string | undefined,
      municipality: topLocation.municipality as string | undefined,
      country: topLocation.country as string | undefined,
      lat: (topLocation.lat ?? topLocation.latitude) as number | undefined,
      lng: (topLocation.lng ?? topLocation.longitude) as number | undefined,
    } : (metaLocation && Object.keys(metaLocation).length > 0 ? metaLocation : undefined) as ListingLocation | undefined,
    areaSquareMeters: (r.areaSquareMeters ?? meta?.areaSquareMeters) as number | undefined,
    floors: (r.floors ?? meta?.floors) as number | undefined,
    capacityDetails: (r.capacityDetails ?? meta?.capacityDetails) as Array<{ label: string; capacity: number }> | Record<string, number> | undefined,
    technicalSpecs: (r.technicalSpecs ?? meta?.technicalSpecs) as TechnicalSpecs | undefined,
    venueDimensions: (r.venueDimensions ?? meta?.venueDimensions) as VenueDimensions | undefined,
    parkingInfo: (r.parkingInfo ?? meta?.parkingInfo) as string | undefined,
    contactEmail: (r.contactEmail ?? meta?.contactEmail) as string | undefined,
    contactName: (r.contactName ?? meta?.contactName) as string | undefined,
    contactPhone: (r.contactPhone ?? meta?.contactPhone) as string | undefined,
    contactWebsite: r.contactWebsite as string | undefined,
    socialLinks: r.socialLinks as Listing['socialLinks'] | undefined,
    galleryMedia: r.galleryMedia as Listing['galleryMedia'] | undefined,
    pricingDescription: (r.pricingDescription ?? meta?.pricingDescription) as string | undefined,
    faq: (r.faq ?? meta?.faq) as FAQItem[] | undefined,
    rules: (r.rules ?? meta?.rules) as RuleItem[] | undefined,
    documents: (r.documents ?? meta?.documents) as DocumentItem[] | undefined,
    bookingConfig: (r.bookingConfig ?? meta?.bookingConfig) as BookingConfig | undefined,
    slotDurationMinutes: (r.slotDurationMinutes ?? meta?.slotDurationMinutes) as number | undefined,
    customSlots: r.customSlots as Listing['customSlots'],
    enabledPackageIds: (r as any).enabledPackageIds as string[] | undefined,
    packagePriceOverrides: (r as any).packagePriceOverrides as Record<string, number> | undefined,
    pricingRules: (r as any).pricingRules as Record<string, any> | undefined,
    openingHours: r.openingHours as OpeningHoursEntry[] | undefined,
    duration: (r.duration ?? meta?.duration) as number | undefined,
    priceMax: (r.priceMax ?? meta?.priceMax) as number | undefined,
    ticketUrl: (r.ticketUrl ?? meta?.ticketUrl) as string | undefined,
    ageLimit: (r.ageLimit ?? meta?.ageLimit) as number | undefined,
    tags: (r.tags ?? meta?.tags) as string[] | undefined,
    eventDate: r.eventDate as string | undefined,
    startTime: r.startTime as string | undefined,
    endTime: r.endTime as string | undefined,
    venueId: r.venueId as string | undefined,
    recommendedListingIds: r.recommendedListingIds as string[] | undefined,
    // Ticketing fields
    shows: r.shows,
    ticketTypes: r.ticketTypes,
    ticketProvider: r.ticketProvider,
    // ListingCardProjectionDTO fields (used by ListingCard component)
    typeLabel,
    city,
    locationFormatted,
    venueName: r.venueName ?? (meta?.venueName as string) ?? undefined,
    venueColor: r.venueColor,
    venueColorDark: r.venueColorDark,
    descriptionExcerpt: r.description ? r.description.substring(0, 120) : undefined,
    primaryImageUrl: images[0]?.url || undefined,
    amenities,
    moreAmenitiesCount: Math.max(0, amenities.length - 3),
    priceAmount: priceAmount > 0
      ? priceAmount
      : (typeof meta?.ticketPrice === 'number' && meta.ticketPrice > 0 ? meta.ticketPrice : undefined),
    priceUnit: priceAmount > 0
      ? priceUnit
      : (typeof meta?.ticketPrice === 'number' && meta.ticketPrice > 0 ? 'billett' : undefined),
    priceCurrency: priceAmount > 0 ? priceCurrency : (typeof meta?.ticketPrice === 'number' && meta.ticketPrice > 0 ? priceCurrency : undefined),
    averageRating: r.reviewStats?.averageRating ?? undefined,
    reviewCount: r.reviewStats?.total ?? 0,
    latitude: (topLocation?.lat ?? topLocation?.latitude ?? metaCoords?.lat ?? meta?.latitude) as number | undefined,
    longitude: (topLocation?.lng ?? topLocation?.longitude ?? metaCoords?.lng ?? meta?.longitude) as number | undefined,
    isAvailable: r.status === "published",
    // Booking mode settings
    allowSeasonRental: r.allowSeasonRental ?? false,
    allowRecurringBooking: r.allowRecurringBooking ?? false,
    // Resource linking fields
    linkedResourceIds: Array.isArray(r.linkedResourceIds) ? r.linkedResourceIds : undefined,
    venueResourceId: r.venueResourceId as string | undefined,
    venueSlug: r.venueSlug as string | undefined,
    // Venue enrichment (populated by getBySlugPublic facade for event detail pages)
    venueImage: r.venueImage,
    venueDescription: r.venueDescription,
    venueCapacity: r.venueCapacity,
    venueWheelchairSpots: r.venueWheelchairSpots,
    venueParkingInfo: r.venueParkingInfo,
    // Linked events (enriched by getBySlugPublic facade for venue detail pages)
    linkedEvents: Array.isArray(r.linkedEvents) ? r.linkedEvents : undefined,
  } as Listing;
}

// ============================================================================
// Query Wrapper
// ============================================================================

// ============================================================================
// Mutation Wrapper
// ============================================================================

/**
 * Wraps Convex `useMutation` to produce a React-Query-shaped mutation object
 * with `mutate`, `mutateAsync`, `isLoading`, `error`, `isSuccess`, `reset`.
 */
function useConvexMutation<TArgs, TData = unknown>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutationRef: any,
  /** Optional transform applied to args before calling the Convex mutation */
  transformArgs?: (args: TArgs) => unknown,
): MutationResult<TArgs, TData> {
  const rawMutation = useConvexMutationRaw(mutationRef);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const mountedRef = useRef(true);

  // Track unmount to avoid state-updates-after-unmount warnings
  // (useEffect cleanup is fine for this lightweight ref)

  const mutateAsync = useCallback(
    async (args: TArgs): Promise<TData> => {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      try {
        const convexArgs = transformArgs ? transformArgs(args) : args;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (rawMutation as any)(convexArgs);
        if (mountedRef.current) {
          setIsSuccess(true);
          setIsLoading(false);
        }
        return result as TData;
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
        throw err;
      }
    },
    [rawMutation, transformArgs],
  );

  const mutate = useCallback(
    (args: TArgs) => {
      mutateAsync(args).catch(() => {
        /* error already captured in state */
      });
    },
    [mutateAsync],
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setIsSuccess(false);
  }, []);

  return {
    mutate,
    mutateAsync,
    isLoading,
    error,
    isSuccess,
    isError: error !== null,
    reset,
  };
}

// ============================================================================
// Authenticated Listing Hooks (Queries)
// ============================================================================

/**
 * Get paginated listings for the current tenant (admin/backoffice use).
 * Requires user to be logged in with a tenant association.
 * Wraps `api.domain.resources.list` (tenant-scoped).
 * 
 * For public apps (web/minside), use `usePublicListings` instead.
 */
export function useListings(params?: ListingQueryParams): QueryResult<PaginatedResponse<Listing>> {
  const tenantId = useResolveTenantId(params?.tenantId as TenantId | undefined);

  const raw = useConvexQueryRaw(
    api.domain.resources.list,
    tenantId
      ? {
        tenantId,
        categoryKey: params?.type ? listingTypeToCategoryKey(params.type) : undefined,
        status: params?.status,
        limit: params?.limit,
      }
      : "skip",
  );

  // Show loading only when we have a tenantId but data hasn't arrived yet
  // If no tenantId, we're not loading - user needs to log in
  const isLoading = tenantId !== undefined && raw === undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: Listing[] | undefined = raw ? (raw as EnrichedResource[]).map(transformResourceToListing) : undefined;
  const data = items ? toPaginatedResponse(items) : undefined;

  return {
    data,
    isLoading,
    error: tenantId === undefined ? new Error("No tenant associated with current user. Please log in.") : null,
    isError: tenantId === undefined,
    isSuccess: data !== undefined,
  };
}

/**
 * Get ALL paginated listings across the platform (superadmin / admin only).
 * Omits the standard tenantId constraint from the query.
 * Throws backend error if user lacks platform permissions.
 */
export function usePlatformListings(params?: ListingQueryParams): QueryResult<PaginatedResponse<Listing>> {
  const isSkip = params?.status === ('skip' as any);
  const raw = useConvexQueryRaw(
    api.domain.resources.listPlatform,
    isSkip ? 'skip' : {
      categoryKey: params?.type ? listingTypeToCategoryKey(params.type) : undefined,
      status: params?.status,
      limit: params?.limit,
    }
  );

  const isLoading = raw === undefined;

  const items: Listing[] | undefined = raw ? (raw as EnrichedResource[]).map(transformResourceToListing) : undefined;
  const data = items ? toPaginatedResponse(items) : undefined;

  return {
    data,
    isLoading,
    error: null,
    isError: false,
    isSuccess: data !== undefined,
  };
}

/**
 * Get a single listing by ID.
 * Wraps `api.domain.resources.get`.
 */
export function useListing(
  id: string | undefined,
  options?: { enabled?: boolean },
): QueryResult<SingleResponse<Listing>> {
  const enabled = options?.enabled ?? true;
  const shouldFetch = !!id && enabled;

  const raw = useConvexQueryRaw(
    api.domain.resources.get,
    shouldFetch ? { id: id as ResourceId } : "skip",
  );

  const isLoading = shouldFetch && raw === undefined;
  const item = raw ? transformResourceToListing(raw) : undefined;
  const data = item ? toSingleResponse(item) : undefined;

  return {
    data,
    isLoading,
    error: null,
    isError: false,
    isSuccess: data !== undefined,
  };
}

/**
 * Get listing by slug.
 * When tenantId is provided, scopes the lookup to that tenant (avoids cross-tenant slug collisions).
 * Falls back to `api.domain.resources.get` if slug lookup is unavailable.
 */
export function useListingBySlug(
  slug: string,
  options?: { enabled?: boolean; tenantId?: string },
): QueryResult<SingleResponse<Listing>> {
  const enabled = options?.enabled ?? true;
  const shouldFetch = !!slug && enabled;
  // IMPORTANT: Do NOT infer tenant from session for slug lookups in public contexts.
  // Public web listing detail pages must remain cross-tenant unless caller explicitly scopes tenantId.
  const resolvedTenantId = options?.tenantId as TenantId | undefined;

  // When tenantId is available (admin/backoffice), use getBySlug which returns
  // resources regardless of status (draft, published, etc.).
  // For public contexts (no tenantId), use getBySlugPublic which filters to published only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminQueryRef = (api.domain.resources as any).getBySlug ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const publicQueryRef = (api.domain.resources as any).getBySlugPublic ?? null;
  const queryRef = resolvedTenantId && adminQueryRef ? adminQueryRef : publicQueryRef ?? adminQueryRef;

  const raw = useConvexQueryRaw(
    queryRef ?? api.domain.resources.get,
    shouldFetch
      ? queryRef
        ? { slug, ...(resolvedTenantId ? { tenantId: resolvedTenantId } : {}) }
        : { id: slug as unknown as ResourceId }
      : "skip",
  );

  const isLoading = shouldFetch && raw === undefined;
  const item = raw ? transformResourceToListing(raw) : undefined;
  const data = item ? toSingleResponse(item) : undefined;

  return {
    data,
    isLoading,
    error: null,
    isError: false,
    isSuccess: data !== undefined,
  };
}

/**
 * Get listing statistics.
 * Wraps `api.domain.resources.getListingStats`.
 */
export function useListingStats(id: string): QueryResult<{ data: ListingStats }> {
  if (!id) {
    return { data: undefined, isLoading: false, error: null, isError: false, isSuccess: false };
  }

  const raw = useConvexQueryRaw(
    api.domain.resources.getListingStats,
    id ? { resourceId: id } : "skip",
  );

  const isLoading = !!id && raw === undefined;
  const data = raw ? { data: raw as unknown as ListingStats } : undefined;

  return {
    data,
    isLoading,
    error: null,
    isError: false,
    isSuccess: data !== undefined,
  };
}

// ============================================================================
// Public Listing Hooks (No Auth)
// ============================================================================

/**
 * Get public listings.
 * Wraps `api.domain.resources.listPublic`.
 */
export function usePublicListings(params?: PublicListingParams): QueryResult<PaginatedResponse<Listing>> {
  const raw = useConvexQueryRaw(api.domain.resources.listPublic, {
    tenantId: params?.tenantId,
    categoryKey: params?.type ? listingTypeToCategoryKey(params.type) : params?.category,
    status: "published",
    limit: params?.limit,
  });

  const isLoading = raw === undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: Listing[] | undefined = raw ? (raw as EnrichedResource[]).map(transformResourceToListing) : undefined;
  const data = items ? toPaginatedResponse(items) : undefined;

  return {
    data,
    isLoading,
    error: null,
    isError: false,
    isSuccess: data !== undefined,
  };
}

/**
 * Get a single public listing by ID.
 * Wraps `api.domain.resources.get`.
 */
export function usePublicListing(id: string): QueryResult<SingleResponse<Listing>> {
  const shouldFetch = !!id;

  const raw = useConvexQueryRaw(
    api.domain.resources.get,
    shouldFetch ? { id: id as ResourceId } : "skip",
  );

  const isLoading = shouldFetch && raw === undefined;
  const item = raw ? transformResourceToListing(raw) : undefined;
  const data = item ? toSingleResponse(item) : undefined;

  return {
    data,
    isLoading,
    error: null,
    isError: false,
    isSuccess: data !== undefined,
  };
}

/**
 * Get public categories.
 * Wraps `api.domain.categories.list` if available; otherwise returns stub.
 */
export function usePublicCategories(): QueryResult<PaginatedResponse<Category>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoriesApi = (api.domain as any).categories;
  const queryRef = categoriesApi?.list ?? null;

  // If the Convex function does not exist, return a static stub.
  if (!queryRef) {
    return { data: toPaginatedResponse<Category>([]), isLoading: false, error: null, isError: false, isSuccess: true };
  }

  const raw = useConvexQueryRaw(queryRef, {});
  const isLoading = raw === undefined;

  const items: Category[] | undefined = raw
    ? (raw as Array<Record<string, unknown>>).map((c) => ({
      id: ((c._id ?? c.id) as string),
      name: (c.name as string) ?? "",
      nameEn: c.nameEn as string | undefined,
      slug: c.slug as string | undefined,
      description: c.description as string | undefined,
      icon: c.icon as string | undefined,
      listingCount: c.listingCount as number | undefined,
      parentId: c.parentId as string | undefined,
      children: c.children as Category[] | undefined,
    }))
    : undefined;

  const data = items ? toPaginatedResponse(items) : undefined;

  return {
    data,
    isLoading,
    error: null,
    isError: false,
    isSuccess: data !== undefined,
  };
}

/**
 * Get cities with listings.
 * Wraps `api.domain.resources.listCities`.
 */
export function usePublicCities(): QueryResult<{ data: City[] }> {
  const raw = useConvexQueryRaw(api.domain.resources.listCities, {});
  const isLoading = raw === undefined;
  const data = raw ? { data: raw as unknown as City[] } : undefined;

  return {
    data,
    isLoading,
    error: null,
    isError: false,
    isSuccess: data !== undefined,
  };
}

/**
 * Get municipalities.
 * Wraps `api.domain.resources.listMunicipalities`.
 */
export function usePublicMunicipalities(): QueryResult<{ data: Municipality[] }> {
  const raw = useConvexQueryRaw(api.domain.resources.listMunicipalities, {});
  const isLoading = raw === undefined;
  const data = raw ? { data: raw as unknown as Municipality[] } : undefined;

  return {
    data,
    isLoading,
    error: null,
    isError: false,
    isSuccess: data !== undefined,
  };
}

/**
 * Get featured listings.
 * Wraps `api.domain.resources.listPublic` with a limited result set.
 */
export function useFeaturedListings(tenantId?: string): QueryResult<PaginatedResponse<Listing>> {
  const raw = useConvexQueryRaw(api.domain.resources.listPublic, {
    tenantId,
    status: "published",
    limit: 6,
  });

  const isLoading = raw === undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: Listing[] | undefined = raw ? (raw as EnrichedResource[]).map(transformResourceToListing) : undefined;
  const data = items ? toPaginatedResponse(items) : undefined;

  return {
    data,
    isLoading,
    error: null,
    isError: false,
    isSuccess: data !== undefined,
  };
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new listing.
 * Wraps `api.domain.resources.create` with DTO-to-Convex input transform.
 */
export function useCreateListing(): MutationResult<CreateListingDTO, { id: string }> {
  const tenantId = useResolveTenantId(undefined);
  return useConvexMutation<CreateListingDTO, { id: string }>(
    api.domain.resources.create,
    (dto: CreateListingDTO) => {
      return {
        tenantId, // auto-resolved from session
        organizationId: dto.organizationId,
        name: dto.name,
        slug: dto.slug ?? dto.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        description: dto.description,
        categoryKey: listingTypeToCategoryKey(dto.type),
        subcategoryKeys: dto.subcategoryKeys,
        timeMode: dto.bookingModel,
        status: "draft",
        capacity: dto.capacity,
        images: dto.images,
        pricing: dto.pricing
          ? {
            basePrice: dto.pricing.basePrice ?? 0,
            currency: dto.pricing.currency ?? "NOK",
            unit: dto.pricing.unit ?? "hour",
            weekendMultiplier: dto.pricing.weekendMultiplier,
            peakHoursMultiplier: dto.pricing.peakHoursMultiplier,
          }
          : undefined,
        // Pass promoted fields directly (no more metadata extraction)
        subtitle: dto.subtitle,
        fullDescription: dto.fullDescription,
        highlights: dto.highlights,
        amenities: dto.amenities,
        visibility: dto.visibility,
        location: dto.location,
        areaSquareMeters: dto.areaSquareMeters,
        floors: dto.floors,
        capacityDetails: dto.capacityDetails,
        technicalSpecs: dto.technicalSpecs,
        venueDimensions: dto.venueDimensions,
        parkingInfo: dto.parkingInfo,
        contactEmail: dto.contactEmail,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        contactWebsite: dto.contactWebsite,
        socialLinks: dto.socialLinks,
        galleryMedia: dto.galleryMedia,
        pricingDescription: dto.pricingDescription,
        faq: dto.faq,
        rules: dto.rules,
        documents: dto.documents,
        bookingConfig: dto.bookingConfig,
        openingHours: dto.openingHours,
        slotDurationMinutes: dto.slotDurationMinutes,
        customSlots: dto.customSlots,
        enabledPackageIds: (dto as any).enabledPackageIds,
        packagePriceOverrides: (dto as any).packagePriceOverrides,
        pricingRules: (dto as any).pricingRules,
        allowSeasonRental: dto.allowSeasonRental,
        allowRecurringBooking: dto.allowRecurringBooking,
        venueSlug: dto.venueSlug,
        venueId: dto.venueId,
        duration: dto.duration,
        priceMax: dto.priceMax,
        ticketUrl: dto.ticketUrl,
        ageLimit: dto.ageLimit,
        tags: dto.tags,
        eventDate: dto.eventDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        linkedResourceIds: dto.linkedResourceIds,
        recommendedListingIds: dto.recommendedListingIds,
        // Ticketing fields
        shows: dto.shows,
        ticketTypes: dto.ticketTypes,
        ticketProvider: dto.ticketProvider,
        metadata: dto.metadata,
      };
    },
  );
}

/**
 * Update an existing listing.
 * Wraps `api.domain.resources.update`.
 */
export function useUpdateListing(): MutationResult<
  { id: string; data: UpdateListingDTO },
  { success: boolean }
> {
  return useConvexMutation<{ id: string; data: UpdateListingDTO }, { success: boolean }>(
    api.domain.resources.update,
    ({ id, data }) => {
      return {
        id: id as unknown as ResourceId,
        name: data.name,
        description: data.description,
        categoryKey: data.type ? listingTypeToCategoryKey(data.type) : undefined,
        timeMode: data.bookingModel,
        capacity: data.capacity,
        subcategoryKeys: data.subcategoryKeys,
        images: data.images,
        // Pass promoted fields directly
        subtitle: data.subtitle,
        fullDescription: data.fullDescription,
        highlights: data.highlights,
        amenities: data.amenities,
        visibility: data.visibility,
        location: data.location,
        areaSquareMeters: data.areaSquareMeters,
        floors: data.floors,
        capacityDetails: data.capacityDetails,
        technicalSpecs: data.technicalSpecs,
        venueDimensions: data.venueDimensions,
        parkingInfo: data.parkingInfo,
        contactEmail: data.contactEmail,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactWebsite: data.contactWebsite,
        socialLinks: data.socialLinks,
        galleryMedia: data.galleryMedia,
        pricingDescription: data.pricingDescription,
        faq: data.faq,
        rules: data.rules,
        documents: data.documents,
        bookingConfig: data.bookingConfig,
        openingHours: data.openingHours,
        slotDurationMinutes: data.slotDurationMinutes,
        customSlots: data.customSlots,
        enabledPackageIds: (data as any).enabledPackageIds,
        packagePriceOverrides: (data as any).packagePriceOverrides,
        pricingRules: (data as any).pricingRules,
        allowSeasonRental: data.allowSeasonRental,
        allowRecurringBooking: data.allowRecurringBooking,
        venueSlug: data.venueSlug,
        venueId: data.venueId,
        duration: data.duration,
        priceMax: data.priceMax,
        ticketUrl: data.ticketUrl,
        ageLimit: data.ageLimit,
        tags: data.tags,
        eventDate: data.eventDate,
        startTime: data.startTime,
        endTime: data.endTime,
        linkedResourceIds: data.linkedResourceIds,
        recommendedListingIds: data.recommendedListingIds,
        pricing: data.pricing
          ? {
            basePrice: data.pricing.basePrice,
            currency: data.pricing.currency,
            unit: data.pricing.unit,
            weekendMultiplier: data.pricing.weekendMultiplier,
            peakHoursMultiplier: data.pricing.peakHoursMultiplier,
          }
          : undefined,
        // Ticketing fields
        shows: data.shows,
        ticketTypes: data.ticketTypes,
        ticketProvider: data.ticketProvider,
        metadata: data.metadata,
      };
    },
  );
}

/**
 * Delete a listing (soft-delete).
 * Wraps `api.domain.resources.remove`.
 */
export function useDeleteListing(): MutationResult<string, { success: boolean }> {
  return useConvexMutation<string, { success: boolean }>(
    api.domain.resources.remove,
    (id: string) => ({ id: id as unknown as ResourceId }),
  );
}

/**
 * Resolve authenticated user ID from any app context (web, backoffice, minside).
 * Tries SDK useAuth() first, then falls back to common localStorage keys.
 */
function useResolveUserId(): string | null {
  const { user } = useAuth();
  if (user?.id) return user.id;

  // Fallback: check common localStorage keys for all app contexts
  if (typeof window !== "undefined") {
    const keys = [
      "digilist_saas_backoffice_user",
      "digilist_saas_digilist_user",
      "digilist_saas_default_user",
      "digilist_saas_user",
      "backoffice_mock_user",
    ];
    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.id) return String(parsed.id);
        }
      } catch { /* skip */ }
    }
  }
  return null;
}

/**
 * Publish a listing.
 * Wraps `api.domain.resources.publish`. Requires authenticated user.
 */
export function usePublishListing(): MutationResult<string, { success: boolean }> {
  const userId = useResolveUserId();
  return useConvexMutation<string, { success: boolean }>(
    api.domain.resources.publish,
    (id: string) => {
      if (!userId) throw new Error("Authentication required to publish");
      return { id: id as unknown as ResourceId, publishedBy: userId };
    },
  );
}

/**
 * Unpublish a listing.
 * Wraps `api.domain.resources.unpublish`. Requires authenticated user.
 */
export function useUnpublishListing(): MutationResult<string, { success: boolean }> {
  const userId = useResolveUserId();
  return useConvexMutation<string, { success: boolean }>(
    api.domain.resources.unpublish,
    (id: string) => {
      if (!userId) throw new Error("Authentication required to unpublish");
      return { id: id as unknown as ResourceId, unpublishedBy: userId };
    },
  );
}

/**
 * Archive a listing.
 * Wraps `api.domain.resources.archive`.
 * Cascades: cancels future bookings, deactivates blocks.
 */
export function useArchiveListing(): MutationResult<string, { success: boolean }> {
  return useConvexMutation<string, { success: boolean }>(
    api.domain.resources.archive,
    (id: string) => ({ id: id as unknown as ResourceId }),
  );
}

/**
 * Restore an archived listing.
 * Wraps `api.domain.resources.restore`.
 */
export function useRestoreListing(): MutationResult<string, { success: boolean }> {
  return useConvexMutation<string, { success: boolean }>(
    api.domain.resources.restore,
    (id: string) => ({ id: id as unknown as ResourceId }),
  );
}

/**
 * Duplicate a listing.
 * Wraps `api.domain.resources.clone`.
 * Clones: base resource, amenities, addons, pricing.
 */
export function useDuplicateListing(): MutationResult<string, { id: string; slug: string }> {
  return useConvexMutation<string, { id: string; slug: string }>(
    api.domain.resources.clone,
    (id: string) => ({ id: id as unknown as ResourceId }),
  );
}

/**
 * Upload media to a listing.
 * Reads files, compresses, uploads to Convex storage,
 * then appends the URLs to the listing's images array.
 * Returns the uploaded URLs so callers can update local state.
 */
export function useUploadListingMedia(): MutationResult<
  { id: string; files: File[]; options?: { compress?: boolean } },
  { urls: string[] }
> {
  const generateUploadUrl = useConvexMutationRaw(api.storage.generateUploadUrl);
  const storeFile = useConvexMutationRaw(api.storage.storeFile);
  const updateResource = useConvexMutationRaw(api.domain.resources.update);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mutateAsync = useCallback(
    async (args: { id: string; files: File[]; options?: { compress?: boolean } }): Promise<{ urls: string[] }> => {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      try {
        const uploadedUrls: string[] = [];

        for (const file of args.files) {
          // Read file as data URI for canvas compression
          const dataUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
            reader.readAsDataURL(file);
          });

          // Compress image via canvas
          let blob: Blob;
          if (file.type.startsWith("image/")) {
            blob = await new Promise<Blob>((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                let { width, height } = img;
                const MAX = 1920;
                if (width > MAX || height > MAX) {
                  const ratio = Math.min(MAX / width, MAX / height);
                  width = Math.round(width * ratio);
                  height = Math.round(height * ratio);
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) { reject(new Error("Canvas unavailable")); return; }
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                  (b) => b ? resolve(b) : reject(new Error("toBlob failed")),
                  "image/jpeg",
                  0.82,
                );
              };
              img.onerror = () => reject(new Error("Image load failed"));
              img.src = dataUri;
            });
          } else {
            blob = file;
          }

          // Upload to Convex storage
          const uploadUrl = await generateUploadUrl();
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": blob.type },
            body: blob,
          });
          if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
          const { storageId } = await response.json();

          // Resolve to public URL
          const result = await storeFile({
            storageId,
            filename: file.name,
            contentType: blob.type,
            size: blob.size,
          });
          if (!result?.url) throw new Error("Failed to get public URL");
          uploadedUrls.push(result.url);
        }

        // Update listing: append new images to existing ones
        if (uploadedUrls.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
          await updateResource({
            id: args.id as unknown as ResourceId,
            images: uploadedUrls,
            appendImages: true,
          } as any);
        }

        setIsSuccess(true);
        return { urls: uploadedUrls };
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [generateUploadUrl, storeFile, updateResource],
  );

  const mutate = useCallback(
    (args: { id: string; files: File[]; options?: { compress?: boolean } }) => {
      mutateAsync(args).catch(() => { /* error captured in state */ });
    },
    [mutateAsync],
  );

  return { mutate, mutateAsync, isLoading, error, isSuccess, isError: !!error, reset: () => { setError(null); setIsSuccess(false); } };
}

/**
 * Delete media from a listing.
 * Wraps `api.domain.resources.deleteMedia`.
 * mediaId is treated as the numeric index of the image to remove.
 */
export function useDeleteListingMedia(): MutationResult<
  { listingId: string; mediaId: string },
  void
> {
  const tenantId = useResolveTenantId(undefined);
  return useConvexMutation<{ listingId: string; mediaId: string }, void>(
    api.domain.resources.deleteMedia,
    ({ listingId, mediaId }) => ({
      tenantId,
      resourceId: listingId,
      mediaIndex: parseInt(mediaId, 10) || 0,
    }),
  );
}

// ============================================================================
// Re-export transform utility (useful for tests / one-off transforms)
// ============================================================================

export { transformResourceToListing, categoryKeyToListingType, listingTypeToCategoryKey };
