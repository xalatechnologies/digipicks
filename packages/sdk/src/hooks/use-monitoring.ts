/**
 * DigilistSaaS SDK — SLA Monitoring Hooks
 *
 * React hooks for system health and SLA compliance.
 * Connected to Convex domain/monitoring.ts.
 */

import { useQuery as useConvexQuery } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

export function useSlaMetrics(tenantId: string | undefined, period?: string) {
    const data = useConvexQuery(api.domain.monitoring.getSlaMetrics, tenantId ? { tenantId: tenantId as Id<"tenants">, period } : "skip");
    return { data: data ?? null, isLoading: tenantId !== undefined && data === undefined, error: null };
}

export function useSlaCompliance(tenantId: string | undefined) {
    const data = useConvexQuery(api.domain.monitoring.getSlaCompliance, tenantId ? { tenantId: tenantId as Id<"tenants"> } : "skip");
    return { data: data ?? null, isLoading: tenantId !== undefined && data === undefined, error: null };
}

export function useComponentHealth(tenantId: string | undefined) {
    const data = useConvexQuery(api.domain.monitoring.getComponentHealth, tenantId ? { tenantId: tenantId as Id<"tenants"> } : "skip");
    return { data: data ?? null, isLoading: tenantId !== undefined && data === undefined, error: null };
}
