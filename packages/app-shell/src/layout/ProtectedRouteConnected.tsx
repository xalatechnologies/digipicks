/**
 * ProtectedRouteConnected
 * Wires useAuthBridge + useRole (app-shell) to ProtectedRoute.
 *
 * Supports three guard modes (can be combined):
 *   - requiredRole: role-hierarchy check (superadmin > owner > admin > arranger > case_handler > user)
 *   - requiredCapability: single capability check (e.g. 'CAP_LISTING_EDIT')
 *   - requiredAnyCapability: user needs at least one of the listed capabilities
 *
 * @formerly BackofficeProtectedRouteConnected (renamed during app consolidation)
 */

import {
  useAuthBridge,
  useRoleContext,
} from '@digilist-saas/app-shell';
import { ProtectedRoute } from './ProtectedRoute';
import type { PlatformRole } from '@digilist-saas/app-shell';
import type { Capability } from '../capabilities';
import { useCapabilities } from '../hooks/useCapabilities';

export interface ProtectedRouteConnectedProps {
  children: React.ReactNode;
  /** Role-hierarchy guard (original). Higher roles inherit access. */
  requiredRole?: PlatformRole;
  /** Capability guard — user must have this specific capability. */
  requiredCapability?: Capability;
  /** Capability guard — user must have at least one of these capabilities. */
  requiredAnyCapability?: Capability[];
  loginPath?: string;
}
/** @deprecated Use ProtectedRouteConnectedProps */
export type BackofficeProtectedRouteConnectedProps = ProtectedRouteConnectedProps;

export function ProtectedRouteConnected({
  children,
  requiredRole,
  requiredCapability,
  requiredAnyCapability,
  loginPath = '/login',
}: ProtectedRouteConnectedProps) {
  const { isLoading, isAuthenticated } = useAuthBridge();
  const { effectiveRole, getHomeRoute, isInitializing } = useRoleContext();
  const { hasCapability, hasAnyCapability } = useCapabilities();

  // Role hierarchy: superadmin > admin > user
  const hasRequiredRoleCheck = !requiredRole || effectiveRole === requiredRole
    || (requiredRole === 'user' && ['superadmin', 'admin'].includes(effectiveRole!))
    || (requiredRole === 'admin' && effectiveRole === 'superadmin');

  // Capability checks (only applied if specified)
  const hasRequiredCapabilityCheck = !requiredCapability || hasCapability(requiredCapability);
  const hasAnyRequiredCapabilityCheck = !requiredAnyCapability || hasAnyCapability(requiredAnyCapability);

  // All specified guards must pass
  const hasRequiredRole = hasRequiredRoleCheck && hasRequiredCapabilityCheck && hasAnyRequiredCapabilityCheck;

  return (
    <ProtectedRoute
      requiredRole={requiredRole}
      guard={{
        isLoading: isLoading || isInitializing,
        isAuthenticated,
        needsRoleSelection: false, // Role selection disabled — org switching via header dropdown
        hasRequiredRole,
        getHomeRoute,
      }}
      loginPath={loginPath}
    >
      {children}
    </ProtectedRoute>
  );
}

/** @deprecated Use ProtectedRouteConnected */
export const BackofficeProtectedRouteConnected = ProtectedRouteConnected;
