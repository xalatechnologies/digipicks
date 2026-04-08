/**
 * DigilistSaaS SDK - Tenant Onboarding Hooks
 *
 * React hooks for tenant creation and onboarding flow.
 * Query hooks: { data, isLoading, error }
 * Mutation hooks: { mutate, mutateAsync }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";

// ============================================================================
// Types
// ============================================================================

export interface TenantSummary {
    id: string;
    name: string;
    slug: string;
    status: string;
    plan?: string;
    isOwner: boolean;
}

export interface CreateTenantInput {
    userId: Id<"users">;
    name: string;
    slug: string;
    contactEmail?: string;
    contactPhone?: string;
    plan?: string;
    enabledCategories?: string[];
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new tenant and assign the calling user as owner.
 * Connected to: api.domain.tenantOnboarding.createTenantForOwner
 */
export function useCreateTenant() {
    const mutationFn = useConvexMutation(api.domain.tenantOnboarding.createTenantForOwner);

    return {
        mutate: (args: CreateTenantInput) => {
            mutationFn(args);
        },
        mutateAsync: (args: CreateTenantInput) => {
            return mutationFn(args);
        },
    };
}

/**
 * Update onboarding step for a tenant.
 * Connected to: api.domain.tenantOnboarding.updateOnboardingStep
 */
export function useUpdateOnboardingStep() {
    const mutationFn = useConvexMutation(api.domain.tenantOnboarding.updateOnboardingStep);

    return {
        mutate: (args: { tenantId: Id<"tenants">; step: string }) => {
            mutationFn(args);
        },
        mutateAsync: (args: { tenantId: Id<"tenants">; step: string }) => {
            return mutationFn(args);
        },
    };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Check if a tenant slug is available.
 * Connected to: api.domain.tenantOnboarding.checkSlugAvailable
 */
export function useCheckSlugAvailable(slug: string | undefined) {
    const data = useConvexQuery(
        api.domain.tenantOnboarding.checkSlugAvailable,
        slug && slug.length >= 2 ? { slug } : "skip"
    );

    return {
        data: data as { available: boolean; normalizedSlug: string } | undefined,
        isLoading: slug !== undefined && slug.length >= 2 && data === undefined,
        error: null,
    };
}

/**
 * List all tenants owned by the current user.
 * Connected to: api.domain.tenantOnboarding.listMyTenants
 */
export function useMyTenants(userId: Id<"users"> | undefined) {
    const data = useConvexQuery(
        api.domain.tenantOnboarding.listMyTenants,
        userId ? { userId } : "skip"
    );

    const isLoading = userId !== undefined && data === undefined;

    return {
        data: (data ?? []) as TenantSummary[],
        isLoading,
        error: null,
    };
}
