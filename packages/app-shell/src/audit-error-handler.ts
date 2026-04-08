/**
 * Audit error handler for React Error Boundaries
 *
 * Use with DS ErrorBoundary (or any ErrorBoundary that accepts onError):
 *
 * @example
 * ```tsx
 * import { ErrorBoundary } from '@digilist-saas/ds';
 * import { createAuditableErrorHandler } from '@digilist-saas/app-shell';
 *
 * const onError = createAuditableErrorHandler((error, info) => {
 *   Sentry?.captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
 * });
 *
 * <ErrorBoundary onError={onError}>{children}</ErrorBoundary>
 * ```
 */

import type { ErrorInfo } from 'react';
import { auditService } from '@digilist-saas/sdk';

/**
 * Creates an onError handler that logs to audit and optionally calls a custom handler (e.g. Sentry).
 */
export function createAuditableErrorHandler(
  onCapture?: (error: Error, errorInfo: ErrorInfo) => void
): (error: Error, errorInfo: ErrorInfo) => void {
  return (error: Error, errorInfo: ErrorInfo) => {
    try {
      auditService.logError('react_error_boundary', 'application', error, {
        componentStack: errorInfo.componentStack ?? undefined,
      });
    } catch {
      // Silently fail audit to not mask the original error
    }
    onCapture?.(error, errorInfo);
  };
}
