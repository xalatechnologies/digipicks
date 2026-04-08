/**
 * Sentry Error Tracking
 *
 * Centralized Sentry utilities for DigilistSaaS apps.
 * Uses optional @sentry/react - if not installed, runs in stub mode (console only).
 *
 * Apps with @sentry/react and VITE_SENTRY_DSN get full error tracking.
 * Apps without get no-op behavior.
 */

/* eslint-disable no-console -- Intentional: DEV-only debug/stub and error fallback when Sentry unavailable */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SentryModule: any = null;

function getEnv(): ImportMetaEnv | undefined {
  return typeof import.meta !== 'undefined' ? import.meta.env : undefined;
}

/**
 * Initialize Sentry error tracking and performance monitoring.
 * Only initializes if VITE_SENTRY_DSN is configured and @sentry/react is available.
 */
export function initSentry(): void {
  const env = getEnv();
  const dsn = env?.VITE_SENTRY_DSN;

  if (!dsn) {
    if (env?.DEV) {
      console.info('[Sentry] Skipping initialization - no DSN configured');
    }
    return;
  }

  import('@sentry/react')
    .then((Sentry) => {
      SentryModule = Sentry;
      const environment = env.VITE_SENTRY_ENVIRONMENT || 'development';
      const release = env.VITE_SENTRY_RELEASE;

      Sentry.init({
        dsn,
        environment,
        release,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration(),
        ],
        tracesSampleRate: env.DEV ? 1.0 : 0.1,
        profilesSampleRate: env.DEV ? 1.0 : 0.1,
        ignoreErrors: [
          'top.GLOBALS',
          'NetworkError',
          'Network request failed',
          'chrome-extension://',
          'moz-extension://',
        ],
        beforeSend(event, hint) {
          if (env.DEV && env.VITE_SENTRY_SEND_IN_DEV !== 'true') {
            console.error('[Sentry] Would send error:', event, hint);
            return null;
          }
          return event;
        },
      });

      if (env.DEV) {
        console.info('[Sentry] Initialized successfully', { environment, release: release || 'undefined' });
      }
    })
    .catch(() => {
      if (env?.DEV) {
        console.warn('[Sentry] @sentry/react not installed. Run: pnpm add @sentry/react');
      }
    });
}

/** Set tenant context for error tracking */
export function setTenantContext(tenantId: string, tenantName?: string): void {
  if (SentryModule) {
    SentryModule.setContext('tenant', { id: tenantId, name: tenantName });
    SentryModule.setTag('tenant_id', tenantId);
  } else if (getEnv()?.DEV) {
    console.debug('[Sentry:stub] setTenantContext', { tenantId, tenantName });
  }
}

/** Set user context for error tracking */
export function setUserContext(userId: string, email?: string, role?: string): void {
  if (SentryModule) {
    SentryModule.setUser({ id: userId, email, role });
  } else if (getEnv()?.DEV) {
    console.debug('[Sentry:stub] setUserContext', { userId, email, role });
  }
}

/** Clear user context (e.g., on logout) */
export function clearUserContext(): void {
  if (SentryModule) {
    SentryModule.setUser(null);
  } else if (getEnv()?.DEV) {
    console.debug('[Sentry:stub] clearUserContext');
  }
}

/** Manually capture an exception */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (SentryModule) {
    if (context) {
      SentryModule.withScope((scope: { setContext: (k: string, v: Record<string, unknown>) => void }) => {
        Object.entries(context).forEach(([key, value]) =>
          scope.setContext(key, typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : { value })
        );
        SentryModule!.captureException(error);
      });
    } else {
      SentryModule.captureException(error);
    }
  } else {
    console.error('[Error]', error, context);
  }
}

/** Add breadcrumb for debugging context */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, unknown>
): void {
  if (SentryModule) {
    SentryModule.addBreadcrumb({ message, category, level, data });
  } else if (getEnv()?.DEV) {
    console.debug(`[Breadcrumb:${category}] ${message}`, data);
  }
}
