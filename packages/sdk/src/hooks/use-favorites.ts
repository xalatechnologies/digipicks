/**
 * DigilistSaaS SDK - Favorites Hook
 *
 * Unified favorites management that works for both:
 * - Guest users: localStorage-based favorites
 * - Logged-in users: Convex database-based favorites
 *
 * Provides seamless experience with toast notifications for guest users.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex-api";
import { Id } from "../convex-api";

// localStorage key for guest favorites
const FAVORITES_STORAGE_KEY = "digilist_saas_favorites";

export interface FavoriteItem {
  resourceId: string;
  addedAt: number; // timestamp
  notes?: string;
  tags?: string[];
}

export interface UseFavoritesOptions {
  /** User ID for logged-in users (from Convex) */
  userId?: string;
  /** Tenant ID for logged-in users */
  tenantId?: string;
  /** Callback when guest adds favorite (show toast) */
  onGuestFavoriteAdd?: () => void;
  /** Callback when logged-in user successfully adds favorite */
  onFavoriteAdd?: () => void;
  /** Callback when favorite is toggled */
  onToggle?: (resourceId: string, isFavorite: boolean) => void;
}

export interface UseFavoritesResult {
  /** List of favorited resource IDs */
  favoriteIds: string[];
  /** Check if a specific resource is favorited */
  isFavorite: (resourceId: string) => boolean;
  /** Toggle favorite status */
  toggleFavorite: (resourceId: string) => Promise<void>;
  /** Add to favorites */
  addFavorite: (resourceId: string, notes?: string, tags?: string[]) => Promise<void>;
  /** Remove from favorites */
  removeFavorite: (resourceId: string) => Promise<void>;
  /** Get all favorites with metadata */
  favorites: FavoriteItem[];
  /** Whether user is logged in (uses database) */
  isLoggedIn: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Number of favorites */
  count: number;
  /** Sync localStorage favorites to database after login */
  syncLocalToDatabase: () => Promise<number>;
  /** Clear all local favorites */
  clearLocalFavorites: () => void;
}

/**
 * Read favorites from localStorage
 */
function readLocalFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Write favorites to localStorage
 */
function writeLocalFavorites(favorites: FavoriteItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Unified favorites hook for guest and logged-in users
 */
export function useFavorites(options: UseFavoritesOptions = {}): UseFavoritesResult {
  const { userId, tenantId, onGuestFavoriteAdd, onFavoriteAdd, onToggle } = options;

  // Track if DB auth has failed — once it fails, stay in localStorage mode
  const [dbAuthFailed, setDbAuthFailed] = useState(false);

  const isLoggedIn = !!(userId && tenantId) && !dbAuthFailed;

  // Local state for guest favorites
  const [localFavorites, setLocalFavorites] = useState<FavoriteItem[]>(() => readLocalFavorites());

  // Database favorites for logged-in users
  const dbFavorites = useQuery(
    api.domain.favorites.list,
    isLoggedIn ? { userId: userId as Id<"users"> } : "skip"
  );

  // Mutations for database
  const addToDb = useMutation(api.domain.favorites.add);
  const removeFromDb = useMutation(api.domain.favorites.remove);

  // Sync local state with localStorage on mount
  useEffect(() => {
    setLocalFavorites(readLocalFavorites());
  }, []);

  // Persist local favorites to localStorage
  useEffect(() => {
    if (!isLoggedIn) {
      writeLocalFavorites(localFavorites);
    }
  }, [localFavorites, isLoggedIn]);

  // Combined favorites list
  const favorites: FavoriteItem[] = useMemo(() => {
    if (isLoggedIn && dbFavorites) {
      return dbFavorites.map((f: any) => ({
        resourceId: f.resourceId,
        addedAt: f._creationTime,
        notes: f.notes,
        tags: f.tags,
      }));
    }
    return localFavorites;
  }, [isLoggedIn, dbFavorites, localFavorites]);

  // Favorite IDs for quick lookup
  const favoriteIds = useMemo(() => favorites.map((f) => f.resourceId), [favorites]);

  // Check if resource is favorited
  const isFavorite = useCallback(
    (resourceId: string): boolean => favoriteIds.includes(resourceId),
    [favoriteIds]
  );

  // Helper: save to localStorage as guest fallback
  const addToLocal = useCallback(
    (resourceId: string, notes?: string, tags?: string[]) => {
      setLocalFavorites((prev) => {
        if (prev.some((f) => f.resourceId === resourceId)) return prev;
        const updated = [...prev, { resourceId, addedAt: Date.now(), notes, tags }];
        writeLocalFavorites(updated);
        return updated;
      });
      onGuestFavoriteAdd?.();
    },
    [onGuestFavoriteAdd]
  );

  // Add to favorites
  const addFavorite = useCallback(
    async (resourceId: string, notes?: string, tags?: string[]) => {
      if (isLoggedIn) {
        try {
          await addToDb({
            tenantId: tenantId as Id<"tenants">,
            userId: userId as Id<"users">,
            resourceId: resourceId as Id<"resources">,
            notes,
            tags,
          });
          onFavoriteAdd?.();
        } catch {
          // Auth session expired or invalid — switch to localStorage mode
          setDbAuthFailed(true);
          addToLocal(resourceId, notes, tags);
        }
      } else {
        addToLocal(resourceId, notes, tags);
      }
      onToggle?.(resourceId, true);
    },
    [isLoggedIn, userId, tenantId, addToDb, addToLocal, onFavoriteAdd, onToggle]
  );

  // Remove from favorites
  const removeFavorite = useCallback(
    async (resourceId: string) => {
      if (isLoggedIn) {
        try {
          await removeFromDb({
            userId: userId as Id<"users">,
            resourceId: resourceId as Id<"resources">,
          });
        } catch {
          // Auth session expired or invalid — switch to localStorage mode
          setDbAuthFailed(true);
          setLocalFavorites((prev) => {
            const updated = prev.filter((f) => f.resourceId !== resourceId);
            writeLocalFavorites(updated);
            return updated;
          });
        }
      } else {
        setLocalFavorites((prev) => {
          const updated = prev.filter((f) => f.resourceId !== resourceId);
          writeLocalFavorites(updated);
          return updated;
        });
      }
      onToggle?.(resourceId, false);
    },
    [isLoggedIn, userId, removeFromDb, onToggle]
  );

  // Toggle favorite
  const toggleFavorite = useCallback(
    async (resourceId: string) => {
      const currentlyFavorite = isFavorite(resourceId);
      if (currentlyFavorite) {
        await removeFavorite(resourceId);
      } else {
        await addFavorite(resourceId);
      }
    },
    [isFavorite, addFavorite, removeFavorite]
  );

  // Sync local favorites to database after login
  const syncLocalToDatabase = useCallback(async (): Promise<number> => {
    if (!isLoggedIn) return 0;

    const localItems = readLocalFavorites();
    if (localItems.length === 0) return 0;

    let synced = 0;
    for (const item of localItems) {
      try {
        await addToDb({
          tenantId: tenantId as Id<"tenants">,
          userId: userId as Id<"users">,
          resourceId: item.resourceId as Id<"resources">,
          notes: item.notes,
          tags: item.tags,
        });
        synced++;
      } catch {
        // Already exists or invalid, skip
      }
    }

    // Clear local storage after successful sync
    if (synced > 0) {
      writeLocalFavorites([]);
      setLocalFavorites([]);
    }

    return synced;
  }, [isLoggedIn, userId, tenantId, addToDb]);

  // Clear all local favorites
  const clearLocalFavorites = useCallback(() => {
    writeLocalFavorites([]);
    setLocalFavorites([]);
  }, []);

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    favorites,
    isLoggedIn,
    isLoading: isLoggedIn && dbFavorites === undefined,
    count: favorites.length,
    syncLocalToDatabase,
    clearLocalFavorites,
  };
}

/**
 * Hook to get favorite resource IDs only (lighter version)
 */
export function useFavoriteIds(options: UseFavoritesOptions = {}): {
  favoriteIds: string[];
  isFavorite: (resourceId: string) => boolean;
  isLoading: boolean;
} {
  const { favoriteIds, isFavorite, isLoading } = useFavorites(options);
  return { favoriteIds, isFavorite, isLoading };
}
