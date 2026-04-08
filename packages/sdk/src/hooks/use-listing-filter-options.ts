/**
 * useListingFilterOptions — Convex-backed filter options for listing pages
 *
 * Single source of truth: categories and amenities come from Convex catalog.
 * Mappings (ListingType ↔ categoryKey) come from SDK transforms.
 * Replaces hardcoded digilist constants for production BaaS.
 *
 * Respects tenant.enabledCategories: only categories enabled for the tenant
 * are shown in filters.
 *
 * Fallback: When catalog is empty (new tenant, not yet seeded), returns
 * empty arrays. No hardcoded defaults — all categories come from the DB.
 */

import { useMemo } from 'react';
import {
  LISTING_TYPE_TO_CATEGORY,
  CATEGORY_TO_TYPE,
} from '../transforms/listing';
import type {
  CategoryOption,
  SubcategoryOption,
  FacilityOption,
} from './use-dynamic-filter-counts';

export interface UseListingFilterOptionsResult {
  /** Map listing.type → categoryKey (for filter counts) */
  categoryMapping: Record<string, string>;
  /** Map categoryKey → listing.type (for filter logic) */
  categoryToTypeMapping: Record<string, string>;
  /** Root categories from Convex catalog */
  allCategories: Omit<CategoryOption, 'count'>[];
  /** Subcategories by parent category key */
  allSubcategories: Record<string, Omit<SubcategoryOption, 'count'>[]>;
  /** Facilities/amenities from Convex catalog */
  allFacilities: Omit<FacilityOption, 'count'>[];
  /** True while catalog data is loading */
  isLoading: boolean;
  /** True when tenantId is missing (queries skipped) */
  isSkipped: boolean;
}

/**
 * Fetch listing filter options from Convex (categories, subcategories, amenities).
 * Uses env tenantId when user is not authenticated for public listing pages.
 *
 * @param tenantId - From auth or env.tenantId. Skip query when undefined.
 */
export function useListingFilterOptions(
  tenantId: string | undefined
): UseListingFilterOptionsResult {
  const isSkipped = !tenantId;

  // Catalog components (categories, amenities) have been removed.
  // Return empty arrays — consumers should provide their own filter options.
  return useMemo(() => ({
    categoryMapping: LISTING_TYPE_TO_CATEGORY,
    categoryToTypeMapping: CATEGORY_TO_TYPE,
    allCategories: [],
    allSubcategories: {},
    allFacilities: [],
    isLoading: false,
    isSkipped,
  }), [isSkipped]);
}
