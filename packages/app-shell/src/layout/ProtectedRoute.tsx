/**
 * ProtectedRoute
 * Role-aware route guard. Host provides guard state from useAuth + useRole.
 * Keeps auth/role logic in app; digilist provides UI and redirect flow.
 *
 * @formerly BackofficeProtectedRoute (renamed during app consolidation)
 */

import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner, useToast } from '@digipicks/ds';
import type { PlatformRole } from '@digipicks/app-shell';

import styles from './ProtectedRoute.module.css';

export interface ProtectedRouteGuard {
  isLoading: boolean;
  isAuthenticated: boolean;
  needsRoleSelection: boolean;
  hasRequiredRole: boolean;
  getHomeRoute: () => string;
}
/** @deprecated Use ProtectedRouteGuard */
export type BackofficeProtectedRouteGuard = ProtectedRouteGuard;

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: PlatformRole;
  guard: ProtectedRouteGuard;
  loginPath?: string;
}
/** @deprecated Use ProtectedRouteProps */
export type BackofficeProtectedRouteProps = ProtectedRouteProps;

export function ProtectedRoute({
  children,
  requiredRole: _requiredRole,
  guard,
  loginPath = '/login',
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, needsRoleSelection, hasRequiredRole, getHomeRoute } = guard;
  const location = useLocation();
  const { error } = useToast();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRequiredRole && !hasShownToast.current) {
      hasShownToast.current = true;
      error('Ingen tilgang', 'Du har ikke tilgang til denne siden. Kontakt administrator hvis du mener dette er feil.');
    }
  }, [isLoading, isAuthenticated, hasRequiredRole, error]);

  useEffect(() => {
    hasShownToast.current = false;
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner aria-label="Laster..." data-data-size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (needsRoleSelection) {
    return <Navigate to="/role-selection" state={{ from: location }} replace />;
  }

  if (!hasRequiredRole) {
    return <Navigate to={getHomeRoute()} replace />;
  }

  return <>{children}</>;
}

/** @deprecated Use ProtectedRoute */
export const BackofficeProtectedRoute = ProtectedRoute;
