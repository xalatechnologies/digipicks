/**
 * useTenantConfig / useTenantFeatureFlags Tests
 *
 * Tests for tenant config and feature flags hooks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useTenantConfig,
  useTenantFeatureFlags,
  MODULE_IDS,
  type ModuleId,
} from "@/hooks/use-tenant-config";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

describe("useTenantConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns isSkipped=true and non-loading when tenantId is undefined", () => {
    const { result } = renderHook(() => useTenantConfig(undefined));

    expect(mockUseQuery).toHaveBeenCalledWith(expect.any(Object), "skip");
    expect(result.current.isSkipped).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.config).toBeNull();
    expect(result.current.featureFlags).toEqual({});
    expect(result.current.enabledCategories).toEqual([]);
  });

  it("returns isLoading=true when tenantId is set but data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    const tenantId = "tenants_1";

    const { result } = renderHook(() => useTenantConfig(tenantId));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ tenantId })
    );
    expect(result.current.isSkipped).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.config).toBeNull();
  });

  it("returns config when data is loaded", () => {
    const mockData = {
      settings: { locale: "nb-NO", timezone: "Europe/Oslo" },
      seatLimits: { maxUsers: 10 },
      featureFlags: { messaging: true, analytics: false },
      enabledCategories: ["LOKALER", "SPORT"],
    };
    mockUseQuery.mockReturnValue(mockData);
    const tenantId = "tenants_1";

    const { result } = renderHook(() => useTenantConfig(tenantId));

    expect(result.current.isSkipped).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.config).toMatchObject({
      settings: mockData.settings,
      seatLimits: mockData.seatLimits,
      featureFlags: mockData.featureFlags,
      enabledCategories: mockData.enabledCategories,
    });
    expect(result.current.featureFlags).toEqual(mockData.featureFlags);
    expect(result.current.enabledCategories).toEqual(mockData.enabledCategories);
  });

  it("isModuleEnabled returns true when flag is explicitly true", () => {
    mockUseQuery.mockReturnValue({
      settings: {},
      seatLimits: {},
      featureFlags: { messaging: true },
      enabledCategories: [],
    });

    const { result } = renderHook(() => useTenantConfig("tenants_1"));

    expect(result.current.isModuleEnabled("messaging")).toBe(true);
  });

  it("isModuleEnabled returns false when flag is explicitly false", () => {
    mockUseQuery.mockReturnValue({
      settings: {},
      seatLimits: {},
      featureFlags: { messaging: false },
      enabledCategories: [],
    });

    const { result } = renderHook(() => useTenantConfig("tenants_1"));

    expect(result.current.isModuleEnabled("messaging")).toBe(false);
  });

  it("isModuleEnabled returns true by default when flag is absent", () => {
    mockUseQuery.mockReturnValue({
      settings: {},
      seatLimits: {},
      featureFlags: {},
      enabledCategories: [],
    });

    const { result } = renderHook(() => useTenantConfig("tenants_1"));

    expect(result.current.isModuleEnabled("messaging")).toBe(true);
  });

  it("isModuleEnabled respects legacy seasonal_leases for seasonal-leases", () => {
    mockUseQuery.mockReturnValue({
      settings: {},
      seatLimits: {},
      featureFlags: { seasonal_leases: false },
      enabledCategories: [],
    });

    const { result } = renderHook(() => useTenantConfig("tenants_1"));

    expect(result.current.isModuleEnabled("seasonal-leases")).toBe(false);
  });

  it("isModuleEnabled returns true for seasonal-leases when seasonal_leases is true", () => {
    mockUseQuery.mockReturnValue({
      settings: {},
      seatLimits: {},
      featureFlags: { seasonal_leases: true },
      enabledCategories: [],
    });

    const { result } = renderHook(() => useTenantConfig("tenants_1"));

    expect(result.current.isModuleEnabled("seasonal-leases")).toBe(true);
  });
});

describe("useTenantFeatureFlags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns featureFlags, isLoading, isSkipped, isModuleEnabled from useTenantConfig", () => {
    const mockData = {
      settings: {},
      seatLimits: {},
      featureFlags: { analytics: true },
      enabledCategories: [],
    };
    mockUseQuery.mockReturnValue(mockData);

    const { result } = renderHook(() => useTenantFeatureFlags("tenants_1"));

    expect(result.current.featureFlags).toEqual(mockData.featureFlags);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSkipped).toBe(false);
    expect(result.current.isModuleEnabled("analytics")).toBe(true);
  });
});

describe("MODULE_IDS", () => {
  it("includes all expected module IDs", () => {
    const expected: ModuleId[] = [
      "booking",
      "seasonal-leases",
      "messaging",
      "analytics",
      "integrations",
      "gdpr",
      "reviews",
      "mfa",
      "sso",
    ];
    expect(MODULE_IDS).toEqual(expected);
  });
});
