/**
 * Listings Admin Types
 *
 * Types for admin/backoffice listing list views, filters, and wizard.
 * Used by minside and backoffice. Extracted from app-local types per
 * CROSS_APP_DEEP_REUSABILITY_ANALYSIS.
 */

import type { ListingType } from './listing';

// =============================================================================
// Query Filters (admin list view)
// =============================================================================

export interface ListingQueryFilters {
  type?: ListingType;
  status?: string;
  search?: string;
  city?: string;
  municipality?: string;
  organizationId?: string;
  minCapacity?: number;
  maxCapacity?: number;
  hasBookingConfig?: boolean;
  updatedBy?: string;
  sortBy?: 'updatedAt' | 'createdAt' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// =============================================================================
// View Mode (admin list/grid/table)
// =============================================================================

export type ListingAdminViewMode = 'grid' | 'table' | 'list' | 'map' | 'split';

// =============================================================================
// Permissions
// =============================================================================

export interface ListingPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  canViewAudit: boolean;
}
