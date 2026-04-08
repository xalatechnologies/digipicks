/**
 * Provider registry for DigilistSaaS applications.
 *
 * Documents the canonical provider stack and import sources.
 * Apps must use shared infrastructure from @digilist-saas/app-shell or @digilist-saas/sdk.
 *
 * @see docs/SHARED_INFRASTRUCTURE.md
 */

export interface ProviderInfo {
  id: string;
  name: string;
  package: string;
  description: string;
  required?: boolean;
  whenToUse?: string[];
  order?: number;
}

export const providers: Record<string, ProviderInfo> = {
  // Convex (required for all apps using backend)
  xalaConvexProvider: {
    id: 'xala-convex-provider',
    name: 'XalaConvexProvider',
    package: '@digilist-saas/sdk',
    description: 'Wraps app with ConvexProvider and query cache. Provides Convex URL from VITE_CONVEX_URL.',
    required: true,
    order: 1,
    whenToUse: ['All apps using Convex backend'],
  },

  // Theme & styling
  themeProvider: {
    id: 'theme-provider',
    name: 'ThemeProvider',
    package: '@digilist-saas/app-shell',
    description: 'Manages color scheme (light/dark/auto) and theme context.',
    order: 2,
    whenToUse: ['All apps with UI'],
  },
  designsystemetProvider: {
    id: 'designsystemet-provider',
    name: 'DesignsystemetProvider',
    package: '@digilist-saas/ds',
    description: 'Digdir Designsystemet provider for theme, size, typography. Use via @digilist-saas/ds.',
    order: 3,
    whenToUse: ['All Digilist and platform apps'],
  },

  // i18n
  i18nProvider: {
    id: 'i18n-provider',
    name: 'I18nProvider',
    package: '@digilist-saas/i18n',
    description: 'i18next with nb, en, ar locales. RTL support for ar.',
    order: 4,
    whenToUse: ['All user-facing apps'],
  },

  // Dialogs & toasts
  dialogProvider: {
    id: 'dialog-provider',
    name: 'DialogProvider',
    package: '@digilist-saas/ds',
    description: 'Provides useDialog for ConfirmDialog and AlertDialog.',
    order: 5,
    whenToUse: ['Apps with modals'],
  },
  toastProvider: {
    id: 'toast-provider',
    name: 'ToastProvider',
    package: '@digilist-saas/ds',
    description: 'Toast notifications.',
    order: 6,
    whenToUse: ['Apps with notification feedback'],
  },

  // Auth (canonical - no app-local auth)
  authProvider: {
    id: 'auth-provider',
    name: 'AuthProvider',
    package: '@digilist-saas/app-shell',
    description: 'Session, user, sign-in/out. Wraps SDK. Required for SSO across apps.',
    required: true,
    order: 7,
    whenToUse: ['web', 'minside', 'backoffice'],
  },
  backofficeAuthBridge: {
    id: 'backoffice-auth-bridge',
    name: 'AuthBridge',
    package: '@digilist-saas/app-shell',
    description: 'Wraps AuthProvider with role derivation (admin, case_handler).',
    order: 8,
    whenToUse: ['backoffice only'],
  },

  // Realtime
  realtimeProvider: {
    id: 'realtime-provider',
    name: 'RealtimeProvider',
    package: '@digilist-saas/app-shell',
    description: 'WebSocket-based realtime. For web and minside.',
    order: 9,
    whenToUse: ['web', 'minside'],
  },
  convexRealtimeProvider: {
    id: 'convex-realtime-provider',
    name: 'ConvexRealtimeProvider',
    package: '@digilist-saas/app-shell',
    description: 'Convex reactive queries for realtime. For backoffice.',
    order: 10,
    whenToUse: ['backoffice'],
  },

  // Notifications
  notificationCenterProvider: {
    id: 'notification-center-provider',
    name: 'NotificationCenterProvider',
    package: '@digilist-saas/app-shell',
    description: 'In-app notification center panel.',
    order: 11,
    whenToUse: ['minside', 'backoffice'],
  },
};

/** Standard provider order (outside-in) for Digilist apps */
export const DIGILIST_PROVIDER_ORDER = [
  'xalaConvexProvider',
  'themeProvider',
  'i18nProvider',
  'designsystemetProvider',
  'dialogProvider',
  'toastProvider',
  'authProvider',
  'realtimeProvider',
  'notificationCenterProvider',
] as const;
