/**
 * DigilistSaaS SDK - Report Hooks (Tier 2)
 *
 * React hooks for analytics, dashboard KPIs, and reporting.
 * Returns React Query-compatible shapes: { data, isLoading, error } for queries,
 * { mutate, mutateAsync, isLoading, error, isSuccess } for mutations.
 */

import { useMemo } from "react";
import { useQuery as useCachedQuery } from "./convex-utils";
import { api, type Id } from "../convex-api";

// =============================================================================
// Query Key Factory (inert — kept for future React Query migration)
// =============================================================================

export const reportKeys = {
  all: ["reports"] as const,
  dashboard: () => [...reportKeys.all, "dashboard"] as const,
  kpis: () => [...reportKeys.all, "kpis"] as const,
  stats: () => [...reportKeys.all, "stats"] as const,
  activity: (limit?: number) => [...reportKeys.all, "activity", { limit }] as const,
  pending: () => [...reportKeys.all, "pending"] as const,
  quickActions: () => [...reportKeys.all, "quick-actions"] as const,
  revenue: (params?: Record<string, unknown>) => [...reportKeys.all, "revenue", params] as const,
  usage: (params?: Record<string, unknown>) => [...reportKeys.all, "usage", params] as const,
  heatmap: (params?: Record<string, unknown>) => [...reportKeys.all, "heatmap", params] as const,
  seasonal: (params?: Record<string, unknown>) => [...reportKeys.all, "seasonal", params] as const,
  comparison: (params?: Record<string, unknown>) => [...reportKeys.all, "comparison", params] as const,
};

// =============================================================================
// =============================================================================
// Dashboard Query Hooks (stubs)
// =============================================================================

/**
 * Fetch dashboard KPIs (total bookings, revenue, utilization, etc.)
 * Stub — returns zeroed KPI shape until a dashboard stats endpoint is restored.
 */
export function useDashboardKPIs(_params?: { tenantId?: string }) {
  return {
    data: {
      data: {
        totalBookings: 0,
        totalRevenue: 0,
        utilizationRate: 0,
        activeResources: 0,
      },
    },
    isLoading: false,
    error: null,
  };
}

/**
 * Fetch dashboard statistics (bookings, revenue, listings, users)
 * Stub — returns undefined until a dashboard stats endpoint is restored.
 */
export function useDashboardStats(_tenantId?: string) {
  return undefined;
}

/**
 * Fetch recent dashboard activity feed.
 * Wraps `api.domain.audit.listForTenant` and maps to activity shape.
 */
export function useDashboardActivity(params?: { tenantId?: string; limit?: number }) {
  const raw = useCachedQuery(
    api.domain.audit.listForTenant,
    params?.tenantId
      ? { tenantId: params.tenantId as Id<"tenants">, limit: params.limit ?? 20 }
      : "skip"
  );

  const isLoading = params?.tenantId !== undefined && raw === undefined;
  const items = (raw ?? []).map((a: any) => ({
    id: String(a._id ?? a.id ?? ""),
    type: String(a.action ?? a.entityType ?? ""),
    message: `${a.action ?? ""} ${a.entityType ?? ""} ${a.entityId ?? ""}`.trim(),
    timestamp: a._creationTime
      ? new Date(a._creationTime).toISOString()
      : new Date().toISOString(),
  }));

  return {
    data: { data: items },
    isLoading,
    error: null,
  };
}

/**
 * Fetch pending items count (bookings, messages, approvals)
 * Stub — returns undefined until a dashboard stats endpoint is restored.
 */
export function usePendingItems(_tenantId?: string) {
  return undefined;
}

/**
 * Quick actions for the admin dashboard.
 * Client-side static array — no backend query needed.
 */
export function useQuickActions() {
  const actions = useMemo(() => [
    { id: "new-booking", label: "Ny bestilling", icon: "plus", href: "/bookings/new" },
    { id: "pending-bookings", label: "Ventende bestillinger", icon: "clock", href: "/bookings?status=pending" },
    { id: "reports", label: "Rapporter", icon: "chart", href: "/reports" },
    { id: "resources", label: "Ressurser", icon: "building", href: "/resources" },
  ], []);
  return { data: actions, isLoading: false, error: null };
}

// =============================================================================
// Analytics Report Query Hooks (stubs)
// =============================================================================

/**
 * Fetch revenue report for a given period.
 * Wired to api.domain.analytics.getRevenueReport.
 */
export function useRevenueReport(params?: { tenantId?: string; startDate?: string; endDate?: string }) {
  const result = useCachedQuery(
    api.domain.analytics.getRevenueReport,
    params?.tenantId
      ? {
          tenantId: params.tenantId as Id<"tenants">,
          startDate: params.startDate,
          endDate: params.endDate,
        }
      : "skip",
  );
  return {
    data: result ?? undefined,
    isLoading: result === undefined && !!params?.tenantId,
    error: null,
  };
}


