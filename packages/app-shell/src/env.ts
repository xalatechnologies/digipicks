/**
 * Typed environment config
 *
 * Single source for VITE_* variables with defaults.
 * Use this instead of import.meta.env directly for consistent typing and defaults.
 *
 * Only safe to import in Vite/browser context (import.meta.env is replaced at build time).
 */

const e = import.meta.env;

function get(key: string): string | undefined {
  const v = e[key as keyof typeof e];
  return typeof v === 'string' ? v : undefined;
}

function getBool(key: string, defaultValue: boolean): boolean {
  const v = e[key as keyof typeof e];
  if (v === undefined) return defaultValue;
  if (typeof v === 'boolean') return v;
  return v === 'true' || v === '1';
}

export const env = {
  /** Convex deployment URL */
  convexUrl: get('VITE_CONVEX_URL') ?? '',
  /** Multi-tenant context */
  tenantId: get('VITE_TENANT_ID') ?? '',
  /** API base URL (legacy/realtime) */
  apiUrl: get('VITE_API_URL') ?? '',
  /** WebSocket URL for Convex realtime (backoffice) */
  wsUrl: get('VITE_WS_URL') ?? '',
  /** Mapbox token for maps */
  mapboxToken: get('VITE_MAPBOX_TOKEN') ?? '',
  /** Sentry DSN */
  sentryDsn: get('VITE_SENTRY_DSN') ?? '',
  /** Sentry environment tag */
  sentryEnvironment: get('VITE_SENTRY_ENVIRONMENT') ?? '',
  /** Sentry release */
  sentryRelease: get('VITE_SENTRY_RELEASE') ?? '',
  /** Link to web app */
  webAppUrl: get('VITE_WEB_APP_URL') ?? 'http://localhost:5190',
  /** Link to dashboard (unified portal — replaces backoffice, minside, saas-admin) */
  dashboardUrl: get('VITE_DASHBOARD_URL') ?? 'http://localhost:5180',
  /** @deprecated Use dashboardUrl + '/my' instead. Kept for backward compat. */
  minsideUrl: get('VITE_DASHBOARD_URL') ? `${get('VITE_DASHBOARD_URL')}/my` : 'http://localhost:5180/my',
  /** Google Places API key */
  googlePlacesApiKey: get('VITE_GOOGLE_PLACES_API_KEY') ?? '',
  /** Dev auth bypass */
  devAuth: getBool('VITE_DEV_AUTH', !!e.DEV),
  /** Backoffice mock auth */
  useMockAuth: get('VITE_USE_MOCK_AUTH') !== 'false',
  /** Altinn integration */
  altinnEnabled: getBool('VITE_ALTINN_ENABLED', false),
  /** Accessibility monitoring (metrics, keyboard nav, etc.) */
  accessibilityMonitoringEnabled: getBool('VITE_ACCESSIBILITY_MONITORING_ENABLED', false),
  altinnTokenExchangeUrl: get('VITE_ALTINN_TOKEN_EXCHANGE_URL') ?? '',
  altinnAuthorizationUrl: get('VITE_ALTINN_AUTHORIZATION_URL') ?? '',
} as const;
