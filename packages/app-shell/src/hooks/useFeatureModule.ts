/**
 * useFeatureModule — Check if a feature module is enabled for the current tenant.
 *
 * Uses useSessionTenantId + useTenantFeatureFlags from SDK.
 * Returns isEnabled and isLoading for conditional rendering of nav items, routes, and UI.
 *
 * @example
 * const { isEnabled: messagingEnabled } = useFeatureModule('messaging');
 * if (messagingEnabled) { ... }
 *
 * <FeatureGate module="reviews" fallback={null}>
 *   <ReviewList />
 * </FeatureGate>
 */

import {
  useSessionTenantId,
  useTenantFeatureFlags,
} from "@digilist-saas/sdk";
import { MODULE_IDS, type ModuleId } from "@digilist-saas/sdk";

export type { ModuleId };
export { MODULE_IDS };

export interface UseFeatureModuleResult {
  /** True when the module is enabled for the tenant */
  isEnabled: boolean;
  /** True while tenant config is loading (default: enable to avoid flicker) */
  isLoading: boolean;
  /** True when tenantId is missing (e.g. logged out) — isEnabled will be false */
  isSkipped: boolean;
}

/**
 * Check if a feature module is enabled for the current session's tenant.
 * When tenantId is missing (logged out), returns isEnabled: false.
 * When loading, returns isEnabled: true by default to avoid hiding content prematurely.
 */
export function useFeatureModule(
  moduleId: ModuleId | string,
  options?: { appId?: string }
): UseFeatureModuleResult {
  const tenantId = useSessionTenantId(options?.appId);
  const { isModuleEnabled, isLoading, isSkipped } = useTenantFeatureFlags(
    tenantId ?? undefined
  );

  return {
    isEnabled: !isSkipped && isModuleEnabled(moduleId),
    isLoading,
    isSkipped,
  };
}
