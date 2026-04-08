/**
 * FeatureGate — Conditionally render children based on tenant feature flags.
 *
 * Hides content when the module is disabled. When loading, shows children
 * by default to avoid flicker; set hideWhileLoading to hide until resolved.
 */

import type { ReactNode } from "react";
import { useFeatureModule, type ModuleId } from "../hooks/useFeatureModule";

export interface FeatureGateProps {
  /** Module ID to check (e.g. "messaging", "reviews", "seasonal-leases") */
  module: ModuleId | string;
  /** Content to render when module is enabled */
  children: ReactNode;
  /** Content when disabled (default: null) */
  fallback?: ReactNode;
  /** When true, hide children while loading (default: false — show to avoid flicker) */
  hideWhileLoading?: boolean;
  /** Optional appId for tenant resolution */
  appId?: string;
}

/**
 * Renders children only when the given module is enabled for the tenant.
 * Uses useSessionTenantId + useTenantFeatureFlags from SDK.
 */
export function FeatureGate({
  module,
  children,
  fallback = null,
  hideWhileLoading = false,
  appId,
}: FeatureGateProps): React.ReactElement {
  const { isEnabled, isLoading } = useFeatureModule(module, { appId });

  if (hideWhileLoading && isLoading) {
    return <>{fallback}</>;
  }

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
