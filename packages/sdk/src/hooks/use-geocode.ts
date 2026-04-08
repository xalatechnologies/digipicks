/**
 * DigilistSaaS SDK - Geocoding Hooks (Tier 3)
 *
 * Client-side React hooks for geocoding addresses to coordinates.
 * Uses Google Places API as primary geocoder, falls back to Mapbox.
 * Processes items in batches to avoid rate limiting. Caches results locally.
 */

import { useState, useEffect, useCallback, useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  confidence?: number;
}

export interface GeocodeConfig {
  /** Google Places API key (primary geocoder) */
  googleApiKey?: string;
  /** Mapbox access token (fallback geocoder) */
  mapboxToken?: string;
  /** Country code for geocoding bias (default: "NO") */
  country?: string;
  /** Language for results (default: "no") */
  language?: string;
}

export interface GeocodedItem<T> {
  item: T;
  geocoded: GeocodedLocation | null;
  isGeocoding: boolean;
}

export interface UseGeocodeListingsOptions<T> {
  /** Array of items to geocode */
  items: T[];
  /** Function to extract address string from item */
  getAddress: (item: T) => string;
  /** Function to check if item already has coordinates */
  hasCoordinates?: (item: T) => boolean;
  /** Google Places API key (primary geocoder) */
  googleApiKey?: string;
  /** Mapbox access token (fallback geocoder) */
  mapboxToken?: string;
  /** Country code for geocoding bias (default: "NO") */
  country?: string;
  /** Whether to enable geocoding (default: true) */
  enabled?: boolean;
}

export interface UseGeocodeListingsResult<T> {
  /** Items with geocoded coordinates */
  geocodedItems: Array<T & { latitude: number; longitude: number }>;
  /** Whether any items are still being geocoded */
  isGeocoding: boolean;
  /** Number of items successfully geocoded */
  geocodedCount: number;
  /** Number of items that failed to geocode */
  failedCount: number;
  /** Retry geocoding for failed items */
  retry: () => void;
}

// =============================================================================
// In-Memory Geocode Cache
// =============================================================================

const geocodeCache = new Map<string, GeocodedLocation | null>();

function getCacheKey(address: string, country: string): string {
  return `${country}:${address.toLowerCase().trim()}`;
}

// =============================================================================
// Geocoding Functions
// =============================================================================

/**
 * Geocode an address using Google Places API.
 * Returns null if geocoding fails.
 */
async function geocodeWithGoogle(
  address: string,
  config: GeocodeConfig
): Promise<GeocodedLocation | null> {
  if (!config.googleApiKey) return null;

  try {
    const params = new URLSearchParams({
      address,
      key: config.googleApiKey,
      language: config.language ?? "no",
      region: config.country?.toLowerCase() ?? "no",
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data.status === "OK" && data.results?.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return {
        latitude: lat,
        longitude: lng,
        formattedAddress: data.results[0].formatted_address,
        confidence: 1.0,
      };
    }
  } catch {
    // Fall through to null
  }

  return null;
}

/**
 * Geocode an address using Mapbox Geocoding API.
 * Returns null if geocoding fails.
 */
async function geocodeWithMapbox(
  address: string,
  config: GeocodeConfig
): Promise<GeocodedLocation | null> {
  if (!config.mapboxToken) return null;

  try {
    const params = new URLSearchParams({
      access_token: config.mapboxToken,
      limit: "1",
      language: config.language ?? "no",
    });

    if (config.country) {
      params.set("country", config.country.toLowerCase());
    }

    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?${params}`
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data.features?.length > 0) {
      const [lng, lat] = data.features[0].center;
      return {
        latitude: lat,
        longitude: lng,
        formattedAddress: data.features[0].place_name,
        confidence: data.features[0].relevance ?? 0.8,
      };
    }
  } catch {
    // Fall through to null
  }

  return null;
}

/**
 * Geocode an address using Google Places API as primary, Mapbox as fallback.
 */
async function geocodeAddress(
  address: string,
  config: GeocodeConfig
): Promise<GeocodedLocation | null> {
  if (!address?.trim()) return null;

  const cacheKey = getCacheKey(address, config.country ?? "NO");
  const cached = geocodeCache.get(cacheKey);
  if (cached !== undefined) return cached;

  // Try Google first
  let result = await geocodeWithGoogle(address, config);

  // Fall back to Mapbox
  if (!result) {
    result = await geocodeWithMapbox(address, config);
  }

  // Cache the result (even null for failures)
  geocodeCache.set(cacheKey, result);

  return result;
}

/**
 * Build a single address string from structured address parts.
 */
export function buildAddressString(parts: {
  street?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  municipality?: string;
  country?: string;
}): string {
  const segments: string[] = [];

  if (parts.street) {
    segments.push(
      parts.streetNumber ? `${parts.street} ${parts.streetNumber}` : parts.street
    );
  }

  if (parts.postalCode || parts.city) {
    segments.push(
      [parts.postalCode, parts.city].filter(Boolean).join(" ")
    );
  }

  if (parts.municipality && parts.municipality !== parts.city) {
    segments.push(parts.municipality);
  }

  if (parts.country) {
    segments.push(parts.country);
  }

  return segments.join(", ");
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to geocode a list of items that have address fields.
 * Uses Google Places API as primary, falls back to Mapbox.
 * Caches results and processes in batches to avoid rate limiting.
 */
export function useGeocodeListings<T extends { id: string }>(
  options: UseGeocodeListingsOptions<T>
): UseGeocodeListingsResult<T> {
  const {
    items,
    getAddress,
    hasCoordinates = () => false,
    googleApiKey,
    mapboxToken,
    country = "NO",
    enabled = true,
  } = options;

  const [geocodedMap, setGeocodedMap] = useState<
    Map<string, GeocodedLocation | null>
  >(new Map());
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Build config for geocoding
  const geocodeConfig = useMemo(
    () => ({
      mapboxToken,
      googleApiKey,
      country,
      language: "no",
    }),
    [mapboxToken, googleApiKey, country]
  );

  // Check if we have any API keys
  const hasApiKeys = Boolean(googleApiKey || mapboxToken);

  // Find items that need geocoding
  const itemsNeedingGeocode = useMemo(() => {
    if (!enabled || !hasApiKeys) return [];
    return items.filter((item) => {
      if (hasCoordinates(item)) return false;
      const address = getAddress(item);
      if (!address) return false;
      // Check if already in cache
      const cacheKey = getCacheKey(address, country);
      if (geocodeCache.has(cacheKey)) return false;
      return true;
    });
  }, [items, getAddress, hasCoordinates, hasApiKeys, country, enabled]);

  // Geocode items that need it
  useEffect(() => {
    if (!enabled || !hasApiKeys || itemsNeedingGeocode.length === 0) {
      return;
    }

    let cancelled = false;
    setIsGeocoding(true);

    const geocodeItems = async () => {
      // Use larger batches with Google (more reliable)
      const batchSize = googleApiKey ? 5 : 3;
      const delayMs = googleApiKey ? 100 : 150;
      const newResults = new Map<string, GeocodedLocation | null>();

      for (
        let i = 0;
        i < itemsNeedingGeocode.length && !cancelled;
        i += batchSize
      ) {
        const batch = itemsNeedingGeocode.slice(i, i + batchSize);

        const batchPromises = batch.map(async (item) => {
          const address = getAddress(item);
          const result = await geocodeAddress(address, geocodeConfig);
          return { address, result };
        });

        const results = await Promise.all(batchPromises);
        results.forEach(({ address, result }) => {
          newResults.set(address, result);
        });

        // Update state incrementally
        if (!cancelled) {
          setGeocodedMap((prev) => {
            const updated = new Map(prev);
            newResults.forEach((value, key) => updated.set(key, value));
            return updated;
          });
        }

        // Small delay between batches
        if (
          i + batchSize < itemsNeedingGeocode.length &&
          !cancelled
        ) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      if (!cancelled) {
        setIsGeocoding(false);
      }
    };

    geocodeItems();

    return () => {
      cancelled = true;
    };
  }, [
    itemsNeedingGeocode,
    geocodeConfig,
    enabled,
    getAddress,
    retryTrigger,
    googleApiKey,
    hasApiKeys,
  ]);

  // Build the final geocoded items list
  const geocodedItems = useMemo(() => {
    return items.map((item) => {
      // If item already has coordinates, use them
      if (hasCoordinates(item)) {
        return item as T & { latitude: number; longitude: number };
      }

      const address = getAddress(item);
      if (!address) {
        return item as T & { latitude: number; longitude: number };
      }

      // Check our local state
      const geocoded = geocodedMap.get(address);
      if (geocoded) {
        return {
          ...item,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
        };
      }

      // Check global cache
      const cacheKey = getCacheKey(address, country);
      const cached = geocodeCache.get(cacheKey);
      if (cached) {
        return {
          ...item,
          latitude: cached.latitude,
          longitude: cached.longitude,
        };
      }

      // Return item as-is (may not have coordinates)
      return item as T & { latitude: number; longitude: number };
    });
  }, [items, getAddress, hasCoordinates, geocodedMap, country]);

  // Count statistics
  const { geocodedCount, failedCount } = useMemo(() => {
    let geocoded = 0;
    let failed = 0;

    items.forEach((item) => {
      if (hasCoordinates(item)) {
        geocoded++;
        return;
      }

      const address = getAddress(item);
      if (!address) return;

      const cacheKey = getCacheKey(address, country);
      const cached = geocodeCache.get(cacheKey);
      if (cached === null) {
        failed++;
      } else if (cached !== undefined) {
        geocoded++;
      }
    });

    return { geocodedCount: geocoded, failedCount: failed };
  }, [items, getAddress, hasCoordinates, country]);

  const retry = useCallback(() => {
    // Clear failed entries from cache before retrying
    items.forEach((item) => {
      const address = getAddress(item);
      if (!address) return;
      const cacheKey = getCacheKey(address, country);
      if (geocodeCache.get(cacheKey) === null) {
        geocodeCache.delete(cacheKey);
      }
    });
    setRetryTrigger((prev) => prev + 1);
  }, [items, getAddress, country]);

  return {
    geocodedItems,
    isGeocoding,
    geocodedCount,
    failedCount,
    retry,
  };
}

/**
 * Simple hook to geocode a single address.
 * Uses Google Places API as primary, falls back to Mapbox.
 */
export function useGeocode(
  address: string | null | undefined,
  config: GeocodeConfig
): {
  location: GeocodedLocation | null;
  isGeocoding: boolean;
  error: boolean;
} {
  const [location, setLocation] = useState<GeocodedLocation | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState(false);

  const hasApiKeys = Boolean(config.googleApiKey || config.mapboxToken);

  useEffect(() => {
    if (!address || !hasApiKeys) {
      setLocation(null);
      return;
    }

    // Check cache first
    const cacheKey = getCacheKey(address, config.country ?? "NO");
    const cached = geocodeCache.get(cacheKey);
    if (cached !== undefined) {
      setLocation(cached);
      setError(cached === null);
      return;
    }

    let cancelled = false;
    setIsGeocoding(true);
    setError(false);

    geocodeAddress(address, config)
      .then((result) => {
        if (!cancelled) {
          setLocation(result);
          setError(result === null);
          setIsGeocoding(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocation(null);
          setError(true);
          setIsGeocoding(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, config, hasApiKeys]);

  return { location, isGeocoding, error };
}
