/**
 * @digilist-saas/app-shell
 *
 * Shared app infrastructure for DigilistSaaS applications.
 * Provides provider composition, auth, tenant context, and route guards.
 */

// Environment config (typed VITE_* with defaults)
export { env } from './env';

// Providers
export * from './providers';

// Auth
export { AuthProvider, useAuth } from './auth/AuthProvider';

// Hooks
export * from './hooks';

// Guards
export { RequireAuth } from './guards';
export { FeatureGate, type FeatureGateProps } from './guards/FeatureGate';

// Route guards (requires react-router-dom)
export {
  ProtectedRoute,
  type ProtectedRouteProps,
  type ProtectedRoutePaths,
} from './ProtectedRoute';

// Error handling
export { createAuditableErrorHandler } from './audit-error-handler';

// Sentry (optional @sentry/react)
export {
  initSentry,
  setTenantContext,
  setUserContext,
  clearUserContext,
  captureException,
  addBreadcrumb,
} from './sentry';

// Layout
export { AppLayout } from './layout/AppLayout';
export { PlatformLayout, type PlatformLayoutProps } from '@digilist-saas/ds';
export {
  GlobalSearch,
  type GlobalSearchProps,
  type GlobalSearchContext,
  type GlobalSearchUrlConfig,
} from './layout/GlobalSearch';
export {
  PlatformSidebar,
  type PlatformSidebarProps,
  type PlatformSidebarSection,
  type PlatformSidebarNavItem,
} from './layout/PlatformSidebar';
export { PlatformHeader, type PlatformHeaderProps } from './layout/PlatformHeader';
export {
  DashboardHeaderSlots,
  type DashboardHeaderSlotsProps,
  type DashboardHeaderSlotsVariant,
  type DashboardHeaderUser,
} from './layout/DashboardHeaderSlots';
export { DashboardLayout, type DashboardLayoutProps } from './layout/DashboardLayout';
export { DocsLayout, type DocsLayoutProps } from './layout/DocsLayout';
export {
  ProtectedRoute as BackofficeProtectedRoute,
  type ProtectedRouteProps as BackofficeProtectedRouteProps,
  type ProtectedRouteGuard as BackofficeProtectedRouteGuard,
  type ProtectedRouteGuard,
} from './layout/ProtectedRoute';
export {
  ProtectedRouteConnected,
  ProtectedRouteConnected as BackofficeProtectedRouteConnected,
  type ProtectedRouteConnectedProps,
} from './layout/ProtectedRouteConnected';
export { RoleSelector, type RoleSelectorProps } from './layout/RoleSelector';
export {
  useDashboardNavSections,
  useDashboardBottomNav,
  type UseDashboardNavSectionsOptions,
} from './layout/useDashboardNav';

// Components (multi-tenant account switching, realtime toasts)
export {
  AccountSwitcher,
  AccountSelectionModal,
  RealtimeToast,
  VerificationBadge,
  type AccountSwitcherProps,
  type AccountSelectionModalProps,
  type VerificationBadgeProps,
} from './components';

// Notifications (shared panel + transforms)
export {
  NotificationCenterPanel,
  type NotificationCenterPanelProps,
  mapNotificationType,
  mapPriority,
  formatTimeAgo,
  transformNotificationToDS,
  transformNotificationsToDS,
} from './notifications';

// Types
export * from './types';

// Platform capabilities (unified RBAC)
export {
  type PlatformRole,
  type Capability,
  SUPERADMIN_ROLES,
  ROLE_CAPABILITIES,
  getCapabilitiesForRole,
  roleHasCapability,
  isSuperadminRole,
} from './capabilities';
