/**
 * useListingFilters — Admin listing filter state hook
 *
 * Manages filter state for the listings list view (minside, backoffice).
 * Extracted from app-local implementations per CROSS_APP_DEEP_REUSABILITY_ANALYSIS.
 */

import { useState, useCallback, useMemo } from 'react';
import { LISTING_TYPE_OPTIONS } from '../constants';
import type { ListingQueryFilters, ListingAdminViewMode } from '@digilist-saas/shared';
import type { ListingType } from './use-listings';

export interface UseListingFiltersReturn {
  filters: ListingQueryFilters;
  viewMode: ListingAdminViewMode;
  setFilter: <K extends keyof ListingQueryFilters>(key: K, value: ListingQueryFilters[K]) => void;
  setFilters: (filters: Partial<ListingQueryFilters>) => void;
  setViewMode: (mode: ListingAdminViewMode) => void;
  resetFilters: () => void;
  activeFilterCount: number;
}

const DEFAULT_FILTERS: ListingQueryFilters = {
  page: 1,
  limit: 50,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

export function useListingFilters(
  initialFilters?: Partial<ListingQueryFilters>,
  initialViewMode: ListingAdminViewMode = 'table'
): UseListingFiltersReturn {
  const [filters, setFiltersState] = useState<ListingQueryFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [viewMode, setViewMode] = useState<ListingAdminViewMode>(initialViewMode);

  const setFilter = useCallback(<K extends keyof ListingQueryFilters>(
    key: K,
    value: ListingQueryFilters[K]
  ) => {
    setFiltersState((prev: ListingQueryFilters) => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' && key !== 'limit' ? { page: 1 } : {}),
    }));
  }, []);

  const setFilters = useCallback((newFilters: Partial<ListingQueryFilters>) => {
    setFiltersState((prev: ListingQueryFilters) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page ?? 1,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type) count++;
    if (filters.status) count++;
    if (filters.search) count++;
    if (filters.city) count++;
    if (filters.municipality) count++;
    if (filters.organizationId) count++;
    if (filters.minCapacity) count++;
    if (filters.maxCapacity) count++;
    if (filters.hasBookingConfig !== undefined) count++;
    return count;
  }, [filters]);

  return {
    filters,
    viewMode,
    setFilter,
    setFilters,
    setViewMode,
    resetFilters,
    activeFilterCount,
  };
}

/** Type tabs configuration — uses SDK LISTING_TYPE_OPTIONS */
export const TYPE_TABS: Array<{ id: ListingType | 'ALL'; label: string }> = LISTING_TYPE_OPTIONS as Array<{ id: ListingType | 'ALL'; label: string }>;

/** Status filter options (Norwegian) */
export const STATUS_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'Alle statuser' },
  { id: 'draft', label: 'Utkast' },
  { id: 'published', label: 'Publisert' },
  { id: 'archived', label: 'Arkivert' },
];

/** Capacity filter options (Norwegian) */
export const CAPACITY_OPTIONS: Array<{ id: string; label: string; min: number | undefined; max: number | undefined }> = [
  { id: 'all', label: 'Alle størrelser', min: undefined, max: undefined },
  { id: '1-10', label: '1-10 personer', min: 1, max: 10 },
  { id: '11-25', label: '11-25 personer', min: 11, max: 25 },
  { id: '26-50', label: '26-50 personer', min: 26, max: 50 },
  { id: '51-100', label: '51-100 personer', min: 51, max: 100 },
  { id: '100+', label: 'Over 100 personer', min: 101, max: undefined },
];

/** Sort options for listings */
export const SORT_OPTIONS: Array<{ id: string; label: string; field: ListingQueryFilters['sortBy']; order: ListingQueryFilters['sortOrder'] }> = [
  { id: 'updated-desc', label: 'Sist oppdatert', field: 'updatedAt', order: 'desc' },
  { id: 'updated-asc', label: 'Eldst oppdatert', field: 'updatedAt', order: 'asc' },
  { id: 'created-desc', label: 'Nyeste først', field: 'createdAt', order: 'desc' },
  { id: 'created-asc', label: 'Eldste først', field: 'createdAt', order: 'asc' },
  { id: 'name-asc', label: 'Navn A-Å', field: 'name', order: 'asc' },
  { id: 'name-desc', label: 'Navn Å-A', field: 'name', order: 'desc' },
];
