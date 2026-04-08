/**
 * RoleProvider — Role selection for dual-role users.
 * Supports superadmin, owner, admin, arranger, case_handler, user.
 *
 * @formerly BackofficeRoleProvider (renamed during app consolidation)
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { PlatformRole } from '../capabilities';
import { useAuthBridge } from './AuthBridge';

export interface RoleContextState {
  effectiveRole: PlatformRole | null;
  grantedRoles: PlatformRole[];
  isDualRole: boolean;
  hasSelectedRole: boolean;
  isInitializing: boolean;
}
/** @deprecated Use RoleContextState */
export type BackofficeRoleContextState = RoleContextState;

export interface RoleContextValue extends RoleContextState {
  setEffectiveRole: (role: PlatformRole, remember?: boolean) => void;
  clearEffectiveRole: () => void;
  isSuperadmin: boolean;
  isAdmin: boolean;
  isOwner?: boolean; // Deprecated — kept for backwards compatibility
  isArranger?: boolean; // Deprecated
  isCaseHandler?: boolean; // Deprecated
  isUser: boolean;
  /** True when user has role='user' AND has an approved tenantId (is an owner/utleier) */
  hasOwnerTenant: boolean;
  /** True when user has role='user' AND no tenantId (normal booking user) */
  isNormalUser: boolean;
  getHomeRoute: () => string;
}
/** @deprecated Use RoleContextValue */
export type BackofficeRoleContextValue = RoleContextValue;

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  EFFECTIVE_ROLE: 'backoffice_effective_role',
  REMEMBER_CHOICE: 'backoffice_remember_role_choice',
} as const;

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthBridge();
  const [effectiveRole, setEffectiveRoleState] = useState<PlatformRole | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.EFFECTIVE_ROLE);
    if (stored === 'superadmin' || stored === 'admin' || stored === 'user') return stored as PlatformRole;
    return null;
  });
  const [hasSelectedRole, setHasSelectedRole] = useState(false);
  const [isRoleResolved, setIsRoleResolved] = useState(false);

  // Stay in initializing state while auth is still loading
  const isInitializing = isAuthLoading || (!isRoleResolved && isAuthenticated);

  const grantedRoles = useMemo<PlatformRole[]>(() => {
    if (!user || !isAuthenticated) return [];
    if (user.grantedRoles && user.grantedRoles.length > 0) return user.grantedRoles;
    const role = user.role as string;
    if (role === 'admin') return ['admin'];
    if (role === 'superadmin' || role === 'super_admin') return ['superadmin'];
    // All tenant-level roles (owner, arranger, bruker, member, etc.) map to 'user'
    return ['user'];
  }, [user, isAuthenticated]);

  const isDualRole = grantedRoles.length > 1;

  useEffect(() => {
    // Don't resolve roles until auth finishes loading
    if (isAuthLoading) return;

    if (!isAuthenticated || grantedRoles.length === 0) {
      setIsRoleResolved(true);
      return;
    }
    const storedRole = localStorage.getItem(STORAGE_KEYS.EFFECTIVE_ROLE) as PlatformRole | null;
    const isValidStoredRole = storedRole === 'superadmin' || storedRole === 'admin' || storedRole === 'user';
    const rememberChoice = localStorage.getItem(STORAGE_KEYS.REMEMBER_CHOICE) === 'true';

    if (isValidStoredRole && storedRole && grantedRoles.includes(storedRole) && rememberChoice) {
      setEffectiveRoleState(storedRole);
      setHasSelectedRole(true);
      setIsRoleResolved(true);
      return;
    }
    if (grantedRoles.length === 1) {
      const autoRole = grantedRoles[0];
      setEffectiveRoleState(autoRole);
      setHasSelectedRole(true);
      localStorage.setItem(STORAGE_KEYS.EFFECTIVE_ROLE, autoRole);
      setIsRoleResolved(true);
      return;
    }
    if (isDualRole && !rememberChoice) {
      setEffectiveRoleState(null);
      setHasSelectedRole(false);
      localStorage.removeItem(STORAGE_KEYS.EFFECTIVE_ROLE);
    }
    setIsRoleResolved(true);
  }, [isAuthLoading, isAuthenticated, grantedRoles, isDualRole]);

  useEffect(() => {
    if (!isAuthenticated) {
      setEffectiveRoleState(null);
      setHasSelectedRole(false);
    }
  }, [isAuthenticated]);

  const setEffectiveRole = useCallback(
    (role: PlatformRole, remember = false) => {
      if (!grantedRoles.includes(role)) return;
      setEffectiveRoleState(role);
      setHasSelectedRole(true);
      localStorage.setItem(STORAGE_KEYS.EFFECTIVE_ROLE, role);
      if (remember) localStorage.setItem(STORAGE_KEYS.REMEMBER_CHOICE, 'true');
      else localStorage.removeItem(STORAGE_KEYS.REMEMBER_CHOICE);
    },
    [grantedRoles]
  );

  const clearEffectiveRole = useCallback(() => {
    setEffectiveRoleState(null);
    setHasSelectedRole(false);
    localStorage.removeItem(STORAGE_KEYS.EFFECTIVE_ROLE);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_CHOICE);
  }, []);

  const getHomeRoute = useCallback(() => {
    if (effectiveRole === 'superadmin') return '/platform';
    if (effectiveRole === 'admin') return '/';
    if (effectiveRole === 'user') return '/';
    return '/';
  }, [effectiveRole]);

  const value = useMemo<RoleContextValue>(
    () => ({
      effectiveRole,
      grantedRoles,
      isDualRole,
      hasSelectedRole,
      isInitializing,
      setEffectiveRole,
      clearEffectiveRole,
      isSuperadmin: effectiveRole === 'superadmin',
      isAdmin: effectiveRole === 'admin' || effectiveRole === 'superadmin',
      isArranger: false, // Deprecated
      isCaseHandler: false, // Deprecated
      isUser: effectiveRole === 'user',
      isOwner: effectiveRole === 'user' || effectiveRole === 'admin', // Kept for backwards compatibility
      hasOwnerTenant: effectiveRole === 'user' && !!user?.tenantId,
      isNormalUser: effectiveRole === 'user' && !user?.tenantId,
      getHomeRoute,
    }),
    [
      effectiveRole,
      grantedRoles,
      isDualRole,
      hasSelectedRole,
      isInitializing,
      setEffectiveRole,
      clearEffectiveRole,
      getHomeRoute,
    ]
  );

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export function useRoleContext(): RoleContextValue {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRoleContext must be used within a RoleProvider');
  }
  return context;
}

/** @deprecated Use useRoleContext */
export const useBackofficeRoleContext = useRoleContext;
/** @deprecated Use useRole */
export const useBackofficeRole = useRoleContext;

/** Returns true if dual-role user hasn't selected a role yet */
export function useNeedsRoleSelection(): boolean {
  const { isDualRole, hasSelectedRole, isInitializing } = useRoleContext();
  if (isInitializing) return false;
  return isDualRole && !hasSelectedRole;
}

/** Canonical alias */
export const useRole = useRoleContext;
/** @deprecated Use RoleProvider */
export const BackofficeRoleProvider = RoleProvider;

/** True when the user is a 'user' role with an approved tenant (utleier/owner). */
export function useIsOwner(): boolean {
  return useRoleContext().hasOwnerTenant;
}

/** True when the user is a 'user' role with no tenant (normal booking user). */
export function useIsNormalUser(): boolean {
  return useRoleContext().isNormalUser;
}
