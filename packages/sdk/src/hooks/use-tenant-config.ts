/**
 * useTenantConfig / useTenantFeatureFlags / useResourceConfig
 *
 * Fetches tenant settings, feature flags, and enabled categories from Convex.
 * Used to gate UI by module (messaging, analytics, seasonal-leases, etc.)
 * and to drive filter options (enabledCategories).
 *
 * Single source: api.tenants.index.getSettings
 */

import { useMemo } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { api, type Id } from "../convex-api";

/** Module IDs from convex/modules MODULE_CATALOG */
export const MODULE_IDS = [
  "booking",
  "seasonal-leases",
  "messaging",
  "analytics",
  "integrations",
  "gdpr",
  "reviews",
  "mfa",
  "sso",
] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export interface TenantConfig {
  settings: Record<string, unknown>;
  seatLimits: Record<string, unknown>;
  featureFlags: Record<string, boolean>;
  enabledCategories: string[];
  /** When set, only these subcategory keys are shown. When undefined, all subcategories of enabled categories are shown. */
  enabledSubcategories: string[] | undefined;
  /** Per-tenant filter UI config */
  filterConfig: {
    /** Show location dropdown (default: true). Set false for single-venue tenants. */
    showLocation?: boolean;
    /** Show price slider (default: true). Set false for tenants without public pricing. */
    showPrice?: boolean;
    /** Show capacity slider (default: true). Set false when not relevant. */
    showCapacity?: boolean;
  };
  /** Per-tenant card display config */
  cardConfig: {
    /** Which field to show in the location line on cards. Default: "address" */
    locationField?: "address" | "subtitle" | "venueName";
  };
  /** Per-tenant resource display config (explicit overrides for auto-derived visibility) */
  resourceConfig: ResourceConfig;
  /** Default category tab to select on page load (e.g. 'ALLE') */
  defaultCategory?: string;
  /** Navigation items to hide for this tenant (by item ID) */
  hiddenNavItems?: string[];
}

/** Controls visibility of category/type/column UI elements.
 *  All fields are optional: when omitted, auto-derived from enabledCategories. */
export interface ResourceConfig {
  /** Show category filter tabs. Auto: hidden when ≤1 category. */
  showCategoryTabs?: boolean;
  /** Show type selector (Lokale/Arrangement) in wizard. Auto: hidden when all categories map to single type. */
  showTypeSelector?: boolean;
  /** Show Kategori column in admin table. Auto: hidden when ≤1 category. */
  showCategoryColumn?: boolean;
  /** Show Kapasitet column in admin table. Default: true. */
  showCapacityColumn?: boolean;
  /** Show Lokasjon column in admin table. Default: true. */
  showLocationColumn?: boolean;
}

export interface UseTenantConfigResult {
  /** Full tenant config (settings, seatLimits, featureFlags, enabledCategories) */
  config: TenantConfig | null;
  /** Shorthand for featureFlags */
  featureFlags: Record<string, boolean>;
  /** Shorthand for enabledCategories */
  enabledCategories: string[];
  /** Shorthand for enabledSubcategories (undefined = show all) */
  enabledSubcategories: string[] | undefined;
  /** Per-tenant filter UI config */
  filterConfig: TenantConfig['filterConfig'];
  /** Per-tenant card display config */
  cardConfig: TenantConfig['cardConfig'];
  /** Per-tenant resource display config */
  resourceConfig: ResourceConfig;
  /** Default category tab from tenant config */
  defaultCategory?: string;
  /** Navigation items to hide for this tenant */
  hiddenNavItems: string[];
  /** True while loading */
  isLoading: boolean;
  /** True when tenantId is missing (query skipped) */
  isSkipped: boolean;
  /** Check if a module is enabled */
  isModuleEnabled: (moduleId: string) => boolean;
}

const EMPTY_FLAGS: Record<string, boolean> = {};
const EMPTY_CATEGORIES: string[] = [];
const EMPTY_RESOURCE_CONFIG: ResourceConfig = {};

/**
 * Fetch tenant config (settings, feature flags, enabled categories).
 *
 * @param tenantId - Convex tenant document ID. Skip when undefined.
 */
export function useTenantConfig(
  tenantId: string | undefined
): UseTenantConfigResult {
  const data = useConvexQuery(
    api.tenants.index.getSettings,
    tenantId ? { tenantId: tenantId as Id<"tenants"> } : "skip"
  );
  const platformConfig = useConvexQuery(api.ops.platformConfig.get);

  const isSkipped = !tenantId;
  const isLoading = !isSkipped && data === undefined;

  const config: TenantConfig | null = data
    ? {
      settings: (data as { settings?: Record<string, unknown> }).settings ?? {},
      seatLimits:
        (data as { seatLimits?: Record<string, unknown> }).seatLimits ?? {},
      featureFlags:
        (data as { featureFlags?: Record<string, boolean> }).featureFlags ??
        EMPTY_FLAGS,
      enabledCategories:
        (data as { enabledCategories?: string[] }).enabledCategories ??
        EMPTY_CATEGORIES,
      enabledSubcategories:
        (data as { enabledSubcategories?: string[] }).enabledSubcategories,
      filterConfig:
        ((data as { settings?: Record<string, unknown> }).settings as { filterConfig?: TenantConfig['filterConfig'] })?.filterConfig ?? {},
      cardConfig:
        ((data as { settings?: Record<string, unknown> }).settings as { cardConfig?: TenantConfig['cardConfig'] })?.cardConfig ?? {},
      resourceConfig:
        ((data as { settings?: Record<string, unknown> }).settings as { resourceConfig?: ResourceConfig })?.resourceConfig ?? EMPTY_RESOURCE_CONFIG,
      defaultCategory:
        (data as { defaultCategory?: string }).defaultCategory,
      hiddenNavItems:
        ((data as { settings?: Record<string, unknown> }).settings as { hiddenNavItems?: string[] })?.hiddenNavItems ?? [],
    }
    : null;

  const featureFlags = config?.featureFlags ?? EMPTY_FLAGS;
  const enabledCategories = config?.enabledCategories ?? EMPTY_CATEGORIES;
  const enabledSubcategories = config?.enabledSubcategories;
  const filterConfig = config?.filterConfig ?? {};
  const cardConfig = config?.cardConfig ?? {};
  const resourceConfig = config?.resourceConfig ?? EMPTY_RESOURCE_CONFIG;
  const defaultCategory = config?.defaultCategory;
  const hiddenNavItems = config?.hiddenNavItems ?? [];

  const isModuleEnabled = (moduleId: string): boolean => {
    // 1. Platform-level override (highest precedence)
    const platformFlags = platformConfig?.featureFlags as Record<string, boolean> | undefined;
    if (platformFlags && platformFlags[moduleId] === false) {
      return false;
    }

    // 2. Tenant-level override
    if (!featureFlags || typeof featureFlags !== "object") return true;
    if (featureFlags[moduleId] === false) return false;
    if (featureFlags[moduleId] === true) return true;
    
    // Legacy: seasonal_leases <-> seasonal-leases
    if (moduleId === "seasonal-leases" && featureFlags.seasonal_leases === false)
      return false;
    if (moduleId === "seasonal-leases" && featureFlags.seasonal_leases === true)
      return true;
      
    return true; // Default: enabled if not explicitly disabled
  };

  return {
    config,
    featureFlags,
    enabledCategories,
    enabledSubcategories,
    filterConfig,
    cardConfig,
    resourceConfig,
    defaultCategory,
    hiddenNavItems,
    isLoading,
    isSkipped,
    isModuleEnabled,
  };
}

/**
 * Shorthand: fetch only feature flags for a tenant.
 * Uses useTenantConfig under the hood.
 */
export function useTenantFeatureFlags(tenantId: string | undefined) {
  const { featureFlags, isLoading, isSkipped, isModuleEnabled } =
    useTenantConfig(tenantId);
  return {
    featureFlags,
    isLoading,
    isSkipped,
    isModuleEnabled,
  };
}

/** Resolved resource config — all fields are concrete booleans (auto-derived + overrides merged). */
export interface ResolvedResourceConfig {
  showCategoryTabs: boolean;
  showTypeSelector: boolean;
  showCategoryColumn: boolean;
  showCapacityColumn: boolean;
  showLocationColumn: boolean;
}

/**
 * Auto-derives visibility from enabledCategories, then merges
 * explicit overrides from tenant.settings.resourceConfig.
 *
 * - ≤1 enabledCategory → hide category tabs, category column, type selector
 * - Explicit overrides in tenant.settings.resourceConfig always win.
 */
export function useResourceConfig(
  tenantId: string | undefined
): ResolvedResourceConfig & { isLoading: boolean } {
  const { enabledCategories, resourceConfig, isLoading } = useTenantConfig(tenantId);

  const resolved = useMemo<ResolvedResourceConfig>(() => {
    const hasMultipleCategories = enabledCategories.length > 1;

    return {
      showCategoryTabs: resourceConfig.showCategoryTabs ?? hasMultipleCategories,
      showTypeSelector: resourceConfig.showTypeSelector ?? hasMultipleCategories,
      showCategoryColumn: resourceConfig.showCategoryColumn ?? hasMultipleCategories,
      showCapacityColumn: resourceConfig.showCapacityColumn ?? true,
      showLocationColumn: resourceConfig.showLocationColumn ?? true,
    };
  }, [enabledCategories.length, resourceConfig]);

  return { ...resolved, isLoading };
}
