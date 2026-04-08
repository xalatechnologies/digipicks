/**
 * LazyAccessibilityMonitoringProvider — Code-split provider for tree-shaking compliance.
 * Use when env.accessibilityMonitoringEnabled; avoids loading when feature is disabled.
 */

import React from 'react';

const AccessibilityMonitoringProviderLazy = React.lazy(() =>
  import('./AccessibilityMonitoringProvider').then((m) => ({
    default: m.AccessibilityMonitoringProvider,
  }))
);

export interface LazyAccessibilityMonitoringProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Lazy-loaded AccessibilityMonitoringProvider. Mount only when env.accessibilityMonitoringEnabled.
 */
export function LazyAccessibilityMonitoringProvider({
  children,
  enabled = true,
  fallback = null,
}: LazyAccessibilityMonitoringProviderProps): React.ReactElement {
  return (
    <React.Suspense fallback={fallback}>
      <AccessibilityMonitoringProviderLazy enabled={enabled}>
        {children}
      </AccessibilityMonitoringProviderLazy>
    </React.Suspense>
  );
}
