/**
 * DigilistSaaS SDK - useListingCardActions
 *
 * Convenience hook that wires useFavorites + share handler for ListingCard/ListingItem/ListingMap.
 * Use when displaying listings in discovery/browse context (web, minside, backoffice).
 */

import { useCallback } from 'react';
import { useFavorites, type UseFavoritesOptions } from './use-favorites';

export interface ListingShareInfo {
  id: string;
  name: string;
  slug?: string;
}

export interface UseListingCardActionsOptions extends UseFavoritesOptions {
  /**
   * Build the share URL for a listing. Default: `${origin}/listing/${slug || id}`
   */
  getShareUrl?: (listing: ListingShareInfo) => string;
  /**
   * Callback when share completes (for audit logging). Receives listingId and medium.
   */
  onShareComplete?: (listingId: string, medium: 'native' | 'copy') => void;
}

export interface UseListingCardActionsResult {
  /** Check if a listing is favorited */
  isFavorite: (resourceId: string) => boolean;
  /** Toggle favorite for a listing */
  toggleFavorite: (resourceId: string) => Promise<void>;
  /** Loading state for favorites */
  isLoading: boolean;
  /**
   * Create share handler for a listing. Pass to ListingCard: onShare={createShareHandler(listing)}
   */
  createShareHandler: (listing: ListingShareInfo) => (id: string) => void;
  /** Full useFavorites result for advanced usage */
  favorites: ReturnType<typeof useFavorites>;
}

/**
 * Share a listing using native share API or clipboard fallback
 */
async function shareListing(
  data: { title: string; url: string; text?: string }
): Promise<'native' | 'copy'> {
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({
        title: data.title,
        url: data.url,
        ...(data.text ? { text: data.text } : {}),
      });
      return 'native';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'native';
    }
  }

  try {
    await navigator.clipboard?.writeText(data.url);
    return 'copy';
  } catch {
    return 'copy';
  }
}

/**
 * Hook to wire share + favorites for listing cards.
 *
 * @example
 * ```tsx
 * const { isFavorite, toggleFavorite, isLoading, createShareHandler } = useListingCardActions({
 *   tenantId,
 *   userId,
 *   getShareUrl: (l) => `${origin}/listing/${l.slug || l.id}`,
 *   onShareComplete: (id, medium) => logAuditEvent('LISTING_SHARED', tenantId, id, userId, { medium }),
 * });
 *
 * <ListingCard
 *   onFavorite={(id) => toggleFavorite(id)}
 *   onShare={createShareHandler(listing)}
 *   isFavorited={isFavorite(listing.id)}
 *   ...
 * />
 * ```
 */
export function useListingCardActions(
  options: UseListingCardActionsOptions = {}
): UseListingCardActionsResult {
  const { getShareUrl, onShareComplete } = options;
  const favorites = useFavorites(options);

  const createShareHandler = useCallback(
    (listing: ListingShareInfo) =>
      (_id: string) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const url =
          getShareUrl?.(listing) ?? `${origin}/listing/${listing.slug || listing.id}`;

        shareListing({
          title: listing.name,
          url,
        }).then((medium) => {
          onShareComplete?.(listing.id, medium);
        });
      },
    [getShareUrl, onShareComplete]
  );

  return {
    isFavorite: favorites.isFavorite,
    toggleFavorite: favorites.toggleFavorite,
    isLoading: favorites.isLoading,
    createShareHandler,
    favorites,
  };
}
