/**
 * ProtectedRoute — Shared route guard for web and minside apps
 *
 * Checks authentication and optional account context (personal vs organization).
 * Uses app-shell AuthProvider and AccountContextProvider.
 *
 * Dashboard uses its own ProtectedRoute (layout/) due to role-selection flow and
 * RoleProvider.
 */

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { useAccountContext } from './providers/AccountContextProvider';
import type { DashboardContext } from './providers/AccountContextProvider';
import styles from './ProtectedRoute.module.css';

export interface ProtectedRoutePaths {
  /** Path to redirect when not authenticated */
  login?: string;
  /** Home path for personal context (when redirecting from org-only route) */
  personal?: string;
  /** Home path for organization context (when redirecting from personal-only route) */
  organization?: string;
}

export interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Required account context. When set, redirects if user's context doesn't match.
   * Requires AccountContextProvider as parent.
   */
  requiredContext?: DashboardContext;
  /**
   * Optional role check. When both provided, user must pass checkRole(requiredRole).
   * Use for app-specific role models (e.g. web admin/user/guest).
   */
  requiredRole?: string;
  checkRole?: (role: string) => boolean;
  /** Redirect paths. Defaults: login=/login, personal=/, organization=/org */
  paths?: ProtectedRoutePaths;
}

const DEFAULT_PATHS: Required<ProtectedRoutePaths> = {
  login: '/login',
  personal: '/',
  organization: '/org',
};

export function ProtectedRoute({
  children,
  requiredContext,
  requiredRole,
  checkRole,
  paths,
}: ProtectedRouteProps): React.ReactElement {
  const { isLoading, isAuthenticated } = useAuth();
  const accountContext = useAccountContext();
  const location = useLocation();

  const resolvedPaths = { ...DEFAULT_PATHS, ...paths };
  const isLoadingOrg = requiredContext && accountContext?.isLoadingOrganizations;

  // Loading state
  if (isLoading || isLoadingOrg) {
    return (
      <div className={styles.loadingContainer} role="status" aria-live="polite" aria-busy="true">
        <div className={styles.loader} aria-label="Laster" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={resolvedPaths.login} state={{ from: location }} replace />;
  }

  // Role check (app-specific)
  if (requiredRole && checkRole && !checkRole(requiredRole)) {
    return (
      <div className={styles.accessDeniedContainer}>
        <h1 className={styles.accessDeniedTitle}>Ingen tilgang</h1>
        <p className={styles.accessDeniedMessage}>
          Du har ikke tilgang til denne siden.
          <br />
          Kontakt administrator hvis du mener dette er feil.
        </p>
      </div>
    );
  }

  // Context check (personal vs organization)
  if (requiredContext && accountContext && accountContext.accountType !== requiredContext) {
    const redirectMessages: Record<DashboardContext, string> = {
      personal: 'Denne siden krever personlig modus. Du har blitt omdirigert.',
      organization: 'Denne siden krever organisasjonsmodus. Du har blitt omdirigert.',
    };
    const redirectTo =
      accountContext.accountType === 'organization'
        ? resolvedPaths.organization
        : resolvedPaths.personal;
    const message = redirectMessages[requiredContext];

    return (
      <Navigate
        to={redirectTo}
        state={{ contextRedirectMessage: message, from: location }}
        replace
      />
    );
  }

  return <>{children}</>;
}
