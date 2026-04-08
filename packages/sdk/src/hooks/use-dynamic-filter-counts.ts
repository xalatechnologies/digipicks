/**
 * useDynamicFilterCounts
 *
 * A hook that computes dynamic filter counts based on the current filter state.
 * When one filter changes, all other filter counts update to reflect what's available.
 *
 * Key principle: For each filter dimension, we compute counts by applying all OTHER
 * filters but not the filter for that dimension. This shows users what options are
 * available if they change that specific filter.
 *
 * @example
 * ```tsx
 * const { categories, subcategories, facilities, cities } = useDynamicFilterCounts({
 *   listings,
 *   filters,
 *   categoryMapping: TYPE_TO_CATEGORY,
 *   allSubcategories: SUBCATEGORY_OPTIONS,
 *   allFacilities: FACILITY_OPTIONS,
 * });
 *
 * <ListingFilter
 *   categories={categories}
 *   subcategories={subcategories}
 *   facilities={facilities}
 *   cities={cities}
 *   // ...
 * />
 * ```
 */

import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface DynamicFilterListing {
  /** Listing ID */
  id: string;
  /** Listing type (e.g., 'SPACE', 'RESOURCE', 'EVENT') */
  type: string;
  /** Subcategory keys */
  subcategoryKeys?: string[];
  /** Amenities/facilities list */
  amenities?: string[];
  /** City name */
  city?: string;
  /** Price amount */
  priceAmount?: number;
  /** Capacity */
  capacity?: number;
  /** Created timestamp */
  createdAt?: string | number;
}

export interface DynamicFilterState {
  category?: string;
  subcategories?: string[];
  facilities?: string[];
  location?: string;
  maxPrice?: number;
  minCapacity?: number;
  newThisWeek?: boolean;
}

export interface CategoryOption {
  id: string;
  key: string;
  label: string;
  icon?: React.ReactNode;
  count: number;
  color?: string;
  colorDark?: string;
}

export interface SubcategoryOption {
  id: string;
  key: string;
  label: string;
  parentKey: string;
  icon?: string;
  color?: string;
  colorDark?: string;
  count?: number;
}

export interface FacilityOption {
  id: string;
  key: string;
  label: string;
  icon?: string;
  count?: number;
}

export interface CityOption {
  name: string;
  count: number;
}

export interface DynamicFilterConfig<T extends DynamicFilterListing> {
  /** All listings (unfiltered) */
  listings: T[];
  /** Current filter state */
  filters: DynamicFilterState;
  /** Map from listing.type to category key */
  categoryMapping: Record<string, string>;
  /** Reverse map from category key to listing.type */
  categoryToTypeMapping: Record<string, string>;
  /** All category definitions with labels and icons */
  allCategories: Omit<CategoryOption, 'count'>[];
  /** All subcategory definitions grouped by parent category */
  allSubcategories: Record<string, Omit<SubcategoryOption, 'count'>[]>;
  /** All facility definitions */
  allFacilities: Omit<FacilityOption, 'count'>[];
}

export interface DynamicFilterResult {
  /** Categories with dynamic counts */
  categories: CategoryOption[];
  /** Subcategories for selected category with counts */
  subcategories: SubcategoryOption[];
  /** Facilities with dynamic counts */
  facilities: FacilityOption[];
  /** Cities with dynamic counts */
  cities: CityOption[];
  /** Total count of filtered listings */
  totalCount: number;
  /** Price range in filtered listings */
  priceRange: { min: number; max: number };
  /** Capacity range in filtered listings */
  capacityRange: { min: number; max: number };
}

// =============================================================================
// Amenity Matching Helper
// =============================================================================

/**
 * Normalize a string for amenity matching:
 * - Lowercase
 * - Replace Norwegian special characters (ø→o, æ→ae, å→a)
 * - Strip non-alphanumeric characters
 */
function normalizeAmenity(s: string): string {
  return s.toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Check if a listing amenity label matches a facility key (catalog slug).
 * Uses normalized bidirectional substring matching to handle:
 * - Norwegian special characters (kjøkken vs kjokken)
 * - Singular/plural differences (garderobe vs garderober)
 */
function amenityMatchesKey(amenityLabel: string, facilityKey: string): boolean {
  const a = normalizeAmenity(amenityLabel);
  const b = normalizeAmenity(facilityKey);
  return a.includes(b) || b.includes(a);
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function extractPlaceFromLocationFormatted(locationFormatted?: string): string | undefined {
  if (!locationFormatted) return undefined;
  const parts = locationFormatted
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  const last = parts[parts.length - 1];
  const postalMatch = last.match(/^\d{4}\s+(.+)$/);
  const candidate = (postalMatch ? postalMatch[1] : last).trim();
  if (!candidate) return undefined;
  // Avoid returning street-like strings.
  if (/\d/.test(candidate) && candidate.length > 6) return undefined;
  return candidate;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type LocationLike = {
  city?: string;
  municipality?: string;
  address?: string;
  lat?: number | string;
  lng?: number | string;
  latitude?: number | string;
  longitude?: number | string;
};

function getListingCoords(listing: unknown): { lat?: number; lng?: number } {
  const l = listing as {
    latitude?: number | string;
    longitude?: number | string;
    location?: LocationLike;
  };
  const loc = l.location;
  const lat = toFiniteNumber(l.latitude ?? loc?.lat ?? loc?.latitude);
  const lng = toFiniteNumber(l.longitude ?? loc?.lng ?? loc?.longitude);
  return { lat, lng };
}

function getExplicitPlace(listing: unknown): string | undefined {
  const l = listing as {
    city?: string;
    location?: LocationLike;
    locationFormatted?: string;
  };
  return (
    l.city ||
    l.location?.city ||
    l.location?.municipality ||
    extractPlaceFromLocationFormatted(l.locationFormatted) ||
    extractPlaceFromLocationFormatted(l.location?.address as string | undefined)
  );
}

// =============================================================================
// Filter Functions
// =============================================================================

/**
 * Apply all filters except the specified dimension
 */
function applyFiltersExcept<T extends DynamicFilterListing>(
  listings: T[],
  filters: DynamicFilterState,
  categoryToType: Record<string, string>,
  allSubcategories: Record<string, Omit<SubcategoryOption, 'count'>[]>,
  exclude: 'category' | 'subcategories' | 'facilities' | 'location' | 'price' | 'capacity' | 'newThisWeek'
): T[] {
  // Build a set of child subcategory keys for the selected category
  const categoryChildKeys = (filters.category && allSubcategories[filters.category])
    ? new Set(allSubcategories[filters.category].map(s => s.key))
    : null;
  return listings.filter(listing => {
    const listingLocation = (listing as unknown as {
      location?: { city?: string; municipality?: string; address?: string };
      locationFormatted?: string;
      metadata?: { amenities?: string[] };
    }).location;
    const listingLocationFormatted = (listing as unknown as { locationFormatted?: string }).locationFormatted;
    // Category filter (ALLE = show all, no category filtering)
    if (exclude !== 'category' && filters.category && filters.category !== 'ALLE') {
      const expectedType = categoryToType[filters.category];
      if (expectedType) {
        // Traditional type-based matching (e.g. LOKALER → listing.type)
        if (listing.type !== expectedType) return false;
      } else if (categoryChildKeys && categoryChildKeys.size > 0) {
        // Grouped parent category: match if listing has any child subcategory key
        if (!listing.subcategoryKeys?.some(sk => categoryChildKeys.has(sk))) return false;
      } else {
        // Flat event-type category: match via subcategoryKeys directly
        if (!listing.subcategoryKeys?.includes(filters.category)) return false;
      }
    }

    // Subcategories filter
    if (exclude !== 'subcategories' && filters.subcategories && filters.subcategories.length > 0) {
      if (!filters.subcategories.some(s => listing.subcategoryKeys?.includes(s))) return false;
    }

    // Location filter
    if (exclude !== 'location' && filters.location) {
      const locationLower = filters.location.toLowerCase();
      const cityMatch = listing.city?.toLowerCase().includes(locationLower)
        || listingLocation?.city?.toLowerCase().includes(locationLower);
      const municipalityMatch = listingLocation?.municipality?.toLowerCase().includes(locationLower);
      const addressMatch = listingLocation?.address?.toLowerCase().includes(locationLower)
        || listingLocationFormatted?.toLowerCase().includes(locationLower);
      if (!cityMatch && !municipalityMatch && !addressMatch) return false;
    }

    // Price filter
    if (exclude !== 'price' && filters.maxPrice != null) {
      if ((listing.priceAmount ?? 0) > filters.maxPrice) return false;
    }

    // Capacity filter
    if (exclude !== 'capacity' && filters.minCapacity != null && filters.minCapacity > 0) {
      if ((listing.capacity ?? 0) < filters.minCapacity) return false;
    }

    // Facilities filter (OR — listing must have at least one selected facility)
    if (exclude !== 'facilities' && filters.facilities && filters.facilities.length > 0) {
      const metadataAmenities = ((listing as unknown as { metadata?: { amenities?: string[] } }).metadata?.amenities) ?? [];
      const listingAmenities = [...(listing.amenities || []), ...metadataAmenities];
      const hasAnyFacility = filters.facilities.some(f =>
        listingAmenities.some(a => amenityMatchesKey(a, f))
      );
      if (!hasAnyFacility) return false;
    }

    // New this week filter
    if (exclude !== 'newThisWeek' && filters.newThisWeek) {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const createdTime = listing.createdAt
        ? (typeof listing.createdAt === 'number' ? listing.createdAt : new Date(listing.createdAt).getTime())
        : 0;
      if (createdTime < weekAgo) return false;
    }

    return true;
  });
}

/**
 * Apply all filters (for total count and ranges)
 */
function applyAllFilters<T extends DynamicFilterListing>(
  listings: T[],
  filters: DynamicFilterState,
  categoryToType: Record<string, string>,
  allSubcategories: Record<string, Omit<SubcategoryOption, 'count'>[]>
): T[] {
  return applyFiltersExcept(listings, filters, categoryToType, allSubcategories, 'newThisWeek')
    .filter(listing => {
      // Also apply newThisWeek since we used it as the "exclude" parameter
      if (filters.newThisWeek) {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const createdTime = listing.createdAt
          ? (typeof listing.createdAt === 'number' ? listing.createdAt : new Date(listing.createdAt).getTime())
          : 0;
        if (createdTime < weekAgo) return false;
      }
      return true;
    });
}

// =============================================================================
// Main Hook
// =============================================================================

export function useDynamicFilterCounts<T extends DynamicFilterListing>(
  config: DynamicFilterConfig<T>
): DynamicFilterResult {
  const {
    listings,
    filters,
    categoryMapping,
    categoryToTypeMapping,
    allCategories,
    allSubcategories,
    allFacilities,
  } = config;

  return useMemo(() => {
    // Build city centroids from listings that already have an explicit place + coordinates.
    const placePoints: Record<string, Array<{ lat: number; lng: number }>> = {};
    listings.forEach((l) => {
      const place = getExplicitPlace(l);
      const { lat, lng } = getListingCoords(l);
      if (!place || lat == null || lng == null) return;
      if (!placePoints[place]) placePoints[place] = [];
      placePoints[place].push({ lat, lng });
    });
    const placeCentroids = Object.entries(placePoints).map(([place, points]) => ({
      place,
      lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
      lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
    }));

    const resolvePlace = (listing: unknown): string | undefined => {
      const explicit = getExplicitPlace(listing);
      if (explicit) return explicit;
      const { lat, lng } = getListingCoords(listing);
      if (lat == null || lng == null || placeCentroids.length === 0) return undefined;
      let bestPlace: string | undefined;
      let bestDistance = Number.POSITIVE_INFINITY;
      placeCentroids.forEach((c) => {
        const d = haversineKm(lat, lng, c.lat, c.lng);
        if (d < bestDistance) {
          bestDistance = d;
          bestPlace = c.place;
        }
      });
      return bestPlace;
    };

    // Compute category counts
    // Apply all filters EXCEPT category to show what's available in each category
    const listingsForCategoryCounts = applyFiltersExcept(
      listings, filters, categoryToTypeMapping, allSubcategories, 'category'
    );

    // Build reverse map: subcategory key → parent category key
    const subToParent: Record<string, string> = {};
    for (const [parentKey, subs] of Object.entries(allSubcategories)) {
      for (const sub of subs) {
        subToParent[sub.key] = parentKey;
      }
    }

    const categoryCounts: Record<string, number> = {};
    // Track which listings have already been counted for each category (avoid double-counting)
    const countedPerCategory: Record<string, Set<string>> = {};

    listingsForCategoryCounts.forEach(l => {
      // Count by primary type mapping (e.g. SPACE → LOKALER, EVENT → ARRANGEMENTER)
      const primaryCategory = categoryMapping[l.type];
      const categoryKey = primaryCategory || l.type;
      if (!countedPerCategory[categoryKey]) countedPerCategory[categoryKey] = new Set();
      if (!countedPerCategory[categoryKey].has(l.id)) {
        categoryCounts[categoryKey] = (categoryCounts[categoryKey] || 0) + 1;
        countedPerCategory[categoryKey].add(l.id);
      }

      // Count by subcategoryKeys → parent category mapping
      // Skip if the listing already has a primary type mapping — prevents venues
      // (type SPACE→LOKALER) from also being counted under ARRANGEMENTER just
      // because they have ARRANGEMENTER subcategory keys like KONSERT.
      if (!primaryCategory) {
        l.subcategoryKeys?.forEach(subKey => {
          const parentCat = subToParent[subKey];
          if (parentCat) {
            if (!countedPerCategory[parentCat]) countedPerCategory[parentCat] = new Set();
            if (!countedPerCategory[parentCat].has(l.id)) {
              categoryCounts[parentCat] = (categoryCounts[parentCat] || 0) + 1;
              countedPerCategory[parentCat].add(l.id);
            }
          } else if (allCategories.some(c => c.key === subKey) && subKey !== categoryKey) {
            if (!countedPerCategory[subKey]) countedPerCategory[subKey] = new Set();
            if (!countedPerCategory[subKey].has(l.id)) {
              categoryCounts[subKey] = (categoryCounts[subKey] || 0) + 1;
              countedPerCategory[subKey].add(l.id);
            }
          }
        });
      }
    });

    // ALLE = "show all" — its count is the total number of listings
    if (allCategories.some(c => c.key === 'ALLE')) {
      categoryCounts['ALLE'] = listingsForCategoryCounts.length;
    }

    const categories: CategoryOption[] = allCategories.map(cat => ({
      ...cat,
      count: categoryCounts[cat.key] || 0,
    }));

    // Compute subcategory counts
    // Only show subcategories for the selected category
    // Apply all filters EXCEPT subcategories to show what's available
    let subcategories: SubcategoryOption[] = [];
    if (filters.category) {
      // For ALLE: merge all subcategories from all parent categories, deduplicated by key
      // For specific categories: only show subcategories for that parent
      let subcategoryDefs = filters.category === 'ALLE'
        ? Object.values(allSubcategories).flat()
        : (allSubcategories[filters.category] ?? []);

      // Deduplicate by key (LOKALER and ARRANGEMENTER may both define similar subcategories)
      if (filters.category === 'ALLE') {
        const seen = new Set<string>();
        subcategoryDefs = subcategoryDefs.filter(sub => {
          if (seen.has(sub.key)) return false;
          seen.add(sub.key);
          return true;
        });
      }

      if (subcategoryDefs.length > 0) {
        const listingsForSubcategoryCounts = applyFiltersExcept(
          listings, filters, categoryToTypeMapping, allSubcategories, 'subcategories'
        );

        const subcategoryCounts: Record<string, number> = {};
        listingsForSubcategoryCounts.forEach(l => {
          l.subcategoryKeys?.forEach(subKey => {
            subcategoryCounts[subKey] = (subcategoryCounts[subKey] || 0) + 1;
          });
        });

        subcategories = subcategoryDefs.map(sub => ({
          ...sub,
          count: subcategoryCounts[sub.key] || 0,
        }));

        // When ALLE is selected, hide subcategories with 0 matching listings
        // to avoid showing confusing cross-category entries
        if (filters.category === 'ALLE') {
          subcategories = subcategories.filter(sub => (sub.count ?? 0) > 0);
        }
      }
    }

    // Compute facility counts
    // Apply all filters EXCEPT facilities to show what's available
    const listingsForFacilityCounts = applyFiltersExcept(
      listings, filters, categoryToTypeMapping, allSubcategories, 'facilities'
    );

    const facilityCounts: Record<string, number> = {};
    listingsForFacilityCounts.forEach(l => {
      l.amenities?.forEach(amenity => {
        // Match facility key to amenity (normalized bidirectional match)
        allFacilities.forEach(fac => {
          if (amenityMatchesKey(amenity, fac.key)) {
            facilityCounts[fac.key] = (facilityCounts[fac.key] || 0) + 1;
          }
        });
      });
    });

    const facilities: FacilityOption[] = allFacilities
      .map(fac => ({
        ...fac,
        count: facilityCounts[fac.key] || 0,
      }))
      .filter(fac => fac.count > 0);

    // Compute city counts
    // Apply all filters EXCEPT location to show what's available
    const listingsForCityCounts = applyFiltersExcept(
      listings, filters, categoryToTypeMapping, allSubcategories, 'location'
    );

    const cityCounts: Record<string, number> = {};
    listingsForCityCounts.forEach(l => {
      const place = resolvePlace(l);
      if (place) {
        cityCounts[place] = (cityCounts[place] || 0) + 1;
      }
    });

    const cities: CityOption[] = Object.entries(cityCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Compute total count and ranges from fully filtered listings
    const filteredListings = applyAllFilters(listings, filters, categoryToTypeMapping, allSubcategories);
    const totalCount = filteredListings.length;

    // Price range
    const prices = filteredListings
      .map(l => l.priceAmount ?? 0)
      .filter(p => p > 0);
    const priceRange = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
    };

    // Capacity range
    const capacities = filteredListings
      .map(l => l.capacity ?? 0)
      .filter(c => c > 0);
    const capacityRange = {
      min: capacities.length > 0 ? Math.min(...capacities) : 0,
      max: capacities.length > 0 ? Math.max(...capacities) : 0,
    };

    return {
      categories,
      subcategories,
      facilities,
      cities,
      totalCount,
      priceRange,
      capacityRange,
    };
  }, [
    listings,
    filters,
    categoryMapping,
    categoryToTypeMapping,
    allCategories,
    allSubcategories,
    allFacilities,
  ]);
}

export default useDynamicFilterCounts;
