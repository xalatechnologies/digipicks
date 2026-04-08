/**
 * Hooks - App Shell
 *
 * Exports all hooks for DigilistSaaS applications.
 */

export { useAuditLog } from './useAuditLog';
export { useDashboardStats } from './useDashboardStats';
export { useUsers } from './useUsers';
export { useTenants } from './useTenants';
export { useModules } from './useModules';
export { usePlans } from './usePlans';
export {
  useRBAC,
  type Permission,
  type UseRBACOptions,
} from './useRBAC';
export {
  useFeatureModule,
  MODULE_IDS,
  type UseFeatureModuleResult,
  type ModuleId,
} from './useFeatureModule';
export {
  useCapabilities,
  useHasCapability,
  useHasAllCapabilities,
  useHasAnyCapability,
  type UseCapabilitiesReturn,
} from './useCapabilities';
export { useBundledTheme } from './useBundledTheme';
export { useTenantContext, type TenantContextValue } from './useTenantContext';