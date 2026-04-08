/**
 * DigilistSaaS SDK — GDPR Hooks
 *
 * React hooks for GDPR data export and purge operations.
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import type { Id } from "../convex-api";
import { api } from "../convex-api";

// ============================================================================
// Types
// ============================================================================

export interface UserDataExport {
    exportedAt: string;
    gdprBasis: string;
    user: {
        id: string;
        email: string;
        name?: string;
        displayName?: string;
        phoneNumber?: string;
        nin?: string;
        role: string;
        status: string;
        createdAt: number;
        lastLoginAt?: number;
        metadata: any;
    };
    tenantMemberships: Array<{
        tenantId: string;
        status: string;
        joinedAt?: number;
        invitedAt?: number;
    }>;
}

// ============================================================================
// Query Hooks
// ============================================================================

export function useExportUserData(
    tenantId: Id<"tenants"> | undefined,
    userId: Id<"users"> | undefined
) {
    const data = useConvexQuery(
        api.domain.gdpr.exportUserData,
        tenantId && userId ? { tenantId, userId } : "skip"
    );

    const isLoading = tenantId !== undefined && userId !== undefined && data === undefined;

    return {
        data: data as UserDataExport | null,
        isLoading,
        error: null,
    };
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function usePurgeUserData() {
    const mutation = useConvexMutation(api.domain.gdpr.purgeUserData);

    return {
        mutateAsync: async (args: {
            tenantId: Id<"tenants">;
            userId: Id<"users">;
            requestedBy: Id<"users">;
            reason?: string;
        }) => mutation(args as any),
        isLoading: false,
        error: null,
    };
}

export function usePurgeTenantData() {
    const mutation = useConvexMutation(api.domain.gdpr.purgeTenantData);

    return {
        mutateAsync: async (args: {
            tenantId: Id<"tenants">;
            requestedBy: Id<"users">;
            confirmationCode: string;
        }) => mutation(args as any),
        isLoading: false,
        error: null,
    };
}
