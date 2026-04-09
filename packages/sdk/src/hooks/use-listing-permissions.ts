/**
 * useListingPermissions — RBAC-aware permission checks for listing operations
 *
 * Extracted from minside/backoffice per CROSS_APP_DEEP_REUSABILITY_ANALYSIS.
 * Uses SDK useAuth when no override provided; supports custom auth via options.
 */

import { useMemo } from 'react';
import { useAuth } from './use-auth';
import type { ListingPermissions } from '@digipicks/shared';
import type { ListingStatus } from './use-listings';

export interface UseListingPermissionsOptions {
  /** Override isAdmin (e.g. from custom AuthProvider) */
  isAdmin?: boolean;
  /** Override user (e.g. from custom AuthProvider) */
  user?: { id: string } | null;
}

export interface UseListingPermissionsReturn {
  permissions: ListingPermissions;
  canPerformAction: (action: keyof ListingPermissions) => boolean;
  canEditListing: (status: ListingStatus) => boolean;
  canPublishListing: (status: ListingStatus) => boolean;
  canArchiveListing: (status: ListingStatus) => boolean;
  canDeleteListing: (status: ListingStatus) => boolean;
}

function normalizeStatus(status: ListingStatus): string {
  return (typeof status === 'string' ? status : '')?.toLowerCase() ?? '';
}

export function useListingPermissions(options?: UseListingPermissionsOptions): UseListingPermissionsReturn {
  const sdkAuth = useAuth();
  const isAdmin = options?.isAdmin ?? sdkAuth.isAdmin;
  const user = options?.user ?? sdkAuth.user;

  const permissions = useMemo<ListingPermissions>(
    () => ({
      canView: !!user,
      canCreate: !!user,
      canEdit: !!user,
      canPublish: isAdmin,
      canArchive: isAdmin,
      canDelete: isAdmin,
      canDuplicate: !!user,
      canViewAudit: isAdmin,
    }),
    [isAdmin, user],
  );

  const canPerformAction = useMemo(() => (action: keyof ListingPermissions) => permissions[action], [permissions]);

  const canEditListing = useMemo(
    () => (status: ListingStatus) => {
      if (!user) return false;
      if (isAdmin) return true;
      return normalizeStatus(status) === 'draft';
    },
    [isAdmin, user],
  );

  const canPublishListing = useMemo(
    () => (status: ListingStatus) => {
      if (!isAdmin) return false;
      const s = normalizeStatus(status);
      return s === 'draft' || s === 'archived';
    },
    [isAdmin],
  );

  const canArchiveListing = useMemo(
    () => (status: ListingStatus) => {
      if (!isAdmin) return false;
      return normalizeStatus(status) === 'published';
    },
    [isAdmin],
  );

  const canDeleteListing = useMemo(() => (_status: ListingStatus) => isAdmin, [isAdmin]);

  return {
    permissions,
    canPerformAction,
    canEditListing,
    canPublishListing,
    canArchiveListing,
    canDeleteListing,
  };
}
