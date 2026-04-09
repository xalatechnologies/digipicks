/**
 * useRBAC - Unified role-based access control.
 *
 * Bridges the legacy Permission system with the Capability system.
 * Use `hasPermission()` for backward-compat, or prefer `useCapabilities()` directly.
 *
 * @example
 * const { hasPermission } = useRBAC();
 * hasPermission('listings.view')  // delegates to CAP_LISTING_READ
 */

import { useAuth as useSdkAuth } from '@digipicks/sdk';
import type { Capability } from '../capabilities';
import { useCapabilities } from './useCapabilities';

export type Permission =
  | 'listings.view'
  | 'listings.create'
  | 'listings.edit'
  | 'listings.delete'
  | 'users.view'
  | 'users.manage'
  | 'settings.view'
  | 'settings.edit'
  | 'reports.view'
  | 'reports.export';

/**
 * Maps legacy Permission strings to Capability constants.
 * This is the bridge between the two systems — single source of truth.
 */
const PERMISSION_TO_CAPABILITY: Record<Permission, Capability> = {
  'listings.view': 'CAP_LISTING_READ',
  'listings.create': 'CAP_LISTING_CREATE',
  'listings.edit': 'CAP_LISTING_EDIT',
  'listings.delete': 'CAP_LISTING_EDIT', // delete uses same cap as edit
  'users.view': 'CAP_USER_VIEW',
  'users.manage': 'CAP_USER_ADMIN',
  'settings.view': 'CAP_SETTINGS_VIEW',
  'settings.edit': 'CAP_SETTINGS_ADMIN',
  'reports.view': 'CAP_REPORTS_VIEW',
  'reports.export': 'CAP_REPORTS_EXPORT',
};

export interface UseRBACOptions {
  /** Override user (e.g. from custom AuthProvider). If not provided, uses SDK useAuth. */
  user?: { role?: string } | null;
  /** Optional tenant ID for future tenant-scoped permission checks. No behavior change yet. */
  tenantId?: string | null;
}

export function useRBAC(options?: UseRBACOptions) {
  const sdkAuth = useSdkAuth();
  const user = options?.user !== undefined ? options.user : sdkAuth.user;
  const capabilities = useCapabilities();

  const hasPermission = (permission: Permission): boolean => {
    // Delegate to capability system if role context is available
    const cap = PERMISSION_TO_CAPABILITY[permission];
    if (cap && capabilities.effectiveRole) {
      return capabilities.hasCapability(cap);
    }
    // Fallback for apps without RoleProvider (e.g. standalone SDK auth)
    if (!user) return false;
    const role = (user.role ?? '').toLowerCase();
    if (['superadmin', 'admin'].includes(role)) return true;
    // Minimal fallback for non-admin roles
    const fallbackPerms: Record<string, Permission[]> = {
      creator: ['listings.view', 'listings.create', 'listings.edit'],
      subscriber: ['listings.view'],
    };
    return (fallbackPerms[role] ?? []).includes(permission);
  };

  /** Returns permission result with optional reason for auditability. */
  const hasPermissionWithReason = (permission: Permission): { allowed: boolean; reason?: string } => {
    const allowed = hasPermission(permission);
    if (!user) return { allowed: false, reason: 'Not authenticated' };
    const role = (user.role ?? '').toLowerCase();
    return {
      allowed,
      reason: allowed ? `Granted via role "${role}"` : `Role "${role}" lacks permission "${permission}"`,
    };
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every((p) => hasPermission(p));
  };

  const requirePermission = (permission: Permission): void => {
    if (!hasPermission(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  };

  return {
    hasPermission,
    hasPermissionWithReason,
    hasAnyPermission,
    hasAllPermissions,
    requirePermission,
    /** The mapped capabilities for the current role */
    capabilities: capabilities.capabilities,
    /** Direct access to capability checks */
    hasCapability: capabilities.hasCapability,
    hasAnyCapability: capabilities.hasAnyCapability,
    hasAllCapabilities: capabilities.hasAllCapabilities,
  };
}
