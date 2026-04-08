/**
 * DigilistSaaS SDK — Analytics Hooks
 *
 * React hooks for monitoring and analytics queries.
 * Connected to Convex domain/analytics.ts.
 */

import { useQuery as useConvexQuery } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

export function useAnalyticsSummary(tenantId: string | undefined) {
    const data = useConvexQuery((api.domain.analytics as any).getSummary, tenantId ? { tenantId: tenantId as Id<"tenants"> } : "skip");
    return { data: data ?? null, isLoading: tenantId !== undefined && data === undefined, error: null };
}
