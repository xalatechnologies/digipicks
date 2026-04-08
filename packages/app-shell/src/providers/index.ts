/**
 * App Shell Providers
 *
 * Central provider composition for all DigilistSaaS apps.
 */

// Theme (color scheme) for DesignsystemetProvider
export {
  ThemeProvider,
  useTheme,
  type ThemeProviderProps,
  type ThemeContextValue,
  type ColorScheme,
} from './ThemeProvider';

// Opt-in providers — Lazy* for tree-shaking; direct provider/hooks via subpath @digilist-saas/app-shell/altinn | ./accessibility-monitoring
export {
  LazyAccessibilityMonitoringProvider,
  type LazyAccessibilityMonitoringProviderProps,
} from './LazyAccessibilityMonitoringProvider';
export {
  LazyAltinnProvider,
  type LazyAltinnProviderProps,
} from './LazyAltinnProvider';

export {
    XalaProviders,
    useRuntime,
    useLocale,
    useDirection,
    type XalaProvidersProps,
    type RuntimeContext,
    type LocaleContextValue,
} from './XalaProviders';

// Account Context
export {
    AccountContextProvider,
    useAccountContext,
    useRequiredAccountContext,
} from './AccountContextProvider';
export type {
    AccountType,
    DashboardContext,
    AccountContextValue,
    ActiveAccount,
} from './AccountContextProvider';

// Notification Center (for DashboardHeaderSlots variant=minside)
export {
  NotificationCenterProvider,
  useNotificationCenter,
  useNotificationCenterOptional,
  type NotificationCenterContextValue,
  type NotificationCenterProviderProps,
} from './NotificationCenterProvider';

// Auth + Role (canonical names, with backward-compat aliases)
export {
  AuthBridge,
  AuthBridge as BackofficeAuthBridge,
  useAuthBridge,
  useAuthBridge as useBackofficeAuth,
  type AuthUser,
  type AuthUser as BackofficeAuthUser,
  type AuthValue,
  type AuthValue as BackofficeAuthValue,
} from './AuthBridge';
export {
  RoleProvider,
  RoleProvider as BackofficeRoleProvider,
  useRoleContext,
  useRoleContext as useBackofficeRoleContext,
  useBackofficeRole,
  useRole,
  useNeedsRoleSelection,
  useIsOwner,
  useIsNormalUser,
  type RoleContextState,
  type RoleContextState as BackofficeRoleContextState,
  type RoleContextValue,
  type RoleContextValue as BackofficeRoleContextValue,
} from './RoleProvider';

// Mode (leietaker / utleier switching)
export {
  ModeProvider,
  useMode,
  useModeOptional,
  type DashboardMode,
  type ModeContextValue,
} from './ModeProvider';

// Realtime interface (shared contract for swappable implementations)
export type {
  RealtimeProviderInterface,
  RealtimeStatus,
} from './RealtimeProviderInterface';

// Convex realtime (backoffice)
export {
  ConvexRealtimeProvider,
  useConvexRealtimeStatus,
  type ConvexRealtimeProviderProps,
} from './ConvexRealtimeProvider';

// Realtime (shared context + hooks; both RealtimeProvider and ConvexRealtimeProvider provide it)
export {
    useRealtimeContext,
    useRealtime,
    useRealtimeListing,
    useRealtimeAudit,
    useRealtimeNotification,
    useRealtimeMessage,
    useRealtimeAll,
    useRealtimeStatus,
    useRealtimeListingUpdates,
} from './RealtimeContext';
export type {
    RealtimeContextValue,
    UseRealtimeListingUpdatesResult,
} from './RealtimeContext';

// Page title (header ↔ page communication)
export {
  PageTitleProvider,
  useSetPageTitle,
  usePageTitle,
} from './PageTitleContext';

// Realtime (WebSocket provider)
export { RealtimeProvider } from './RealtimeProvider';
export type { RealtimeProviderProps } from './RealtimeProvider';
