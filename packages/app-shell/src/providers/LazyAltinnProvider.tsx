/**
 * LazyAltinnProvider — Code-split Altinn provider for tree-shaking compliance.
 * Use when env.altinnEnabled; avoids loading Altinn code when feature is disabled.
 */

import React from 'react';

const AltinnProviderLazy = React.lazy(() =>
  import('./AltinnProvider').then((m) => ({ default: m.AltinnProvider }))
);

export interface LazyAltinnProviderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Lazy-loaded AltinnProvider. Mount only when env.altinnEnabled.
 * Keeps Altinn code in separate chunk until actually used.
 */
export function LazyAltinnProvider({
  children,
  fallback = null,
}: LazyAltinnProviderProps): React.ReactElement {
  return (
    <React.Suspense fallback={fallback}>
      <AltinnProviderLazy>{children}</AltinnProviderLazy>
    </React.Suspense>
  );
}
