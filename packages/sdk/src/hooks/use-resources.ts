/**
 * DigilistSaaS SDK - Resources Hooks
 *
 * Fetch and manage resources using Convex backend.
 * Uses proper Convex React hooks for real-time updates.
 */

import { useQuery, useMutation } from "./convex-utils";
import { api, type TenantId, type ResourceId, type OrganizationId } from "../convex-api";
import type { Resource, ResourceStatus } from "../types";
import { toPaginatedResponse, toSingleResponse } from "../transforms/common";
import { useResolveTenantId } from "./use-tenant-id";
import { useAuth } from "./use-auth";
import { asId } from "../utils/type-bridge";

interface UseResourcesOptions {
    tenantId?: TenantId;
    categoryKey?: string;
    status?: string;
    limit?: number;
}

interface UseResourcesResult {
    resources: Resource[];
    data: { data: Resource[]; meta: { total: number; page: number; limit: number; totalPages: number } };
    isLoading: boolean;
    error: Error | null;
}

/**
 * Fetch resources from Convex with real-time updates
 */
export function useResources(
    options: UseResourcesOptions = {}
): UseResourcesResult {
    const { tenantId: explicitTenantId, categoryKey, status, limit } = options;
    const tenantId = useResolveTenantId(explicitTenantId);

    // Skip query if tenantId is not available (not logged in or no tenant)
    const data = useQuery(
        api.domain.resources.list,
        tenantId ? { tenantId, categoryKey, status, limit } : "skip"
    );

    const isLoading = tenantId !== undefined && data === undefined;
    const error = null; // Convex handles errors via error boundaries

    const resources: Resource[] = (data ?? []).map((r) => ({
        id: r._id as string,
        tenantId: r.tenantId as string,
        organizationId: r.organizationId as string | undefined,
        name: r.name,
        slug: r.slug,
        description: r.description,
        categoryKey: r.categoryKey,
        timeMode: r.timeMode,
        features: r.features,
        status: r.status as ResourceStatus,
        requiresApproval: r.requiresApproval,
        capacity: r.capacity,
        inventoryTotal: r.inventoryTotal,
        images: r.images,
        pricing: r.pricing,
        metadata: r.metadata,
        createdAt: new Date(r._creationTime).toISOString(),
        updatedAt: new Date(r._creationTime).toISOString(),
    }));

    return {
        resources,
        data: toPaginatedResponse(resources),
        isLoading,
        error,
    };
}

/**
 * Get a single resource by ID with real-time updates
 */
export function useResource(resourceId: ResourceId | undefined): {
    resource: Resource | null;
    data: { data: Resource } | null;
    isLoading: boolean;
    error: Error | null;
} {
    const data = useQuery(
        api.domain.resources.get,
        resourceId ? { id: resourceId } : "skip"
    );

    const isLoading = resourceId !== undefined && data === undefined;
    const error = null;

    const resource: Resource | null = data
        ? {
            id: data._id as string,
            tenantId: data.tenantId as string,
            organizationId: data.organizationId as string | undefined,
            name: data.name,
            slug: data.slug,
            description: data.description,
            categoryKey: data.categoryKey,
            timeMode: data.timeMode,
            features: data.features,
            status: data.status as ResourceStatus,
            requiresApproval: data.requiresApproval,
            capacity: data.capacity,
            inventoryTotal: data.inventoryTotal,
            images: data.images,
            pricing: data.pricing as unknown as Record<string, unknown>,
            metadata: data.metadata,
            createdAt: new Date(data._creationTime).toISOString(),
            updatedAt: new Date(data._creationTime).toISOString(),
        }
        : null;

    return { resource, data: resource ? toSingleResponse(resource) : null, isLoading, error };
}

/**
 * Create a new resource
 */
export function useCreateResource(): {
    createResource: (args: {
        tenantId: TenantId;
        organizationId?: OrganizationId;
        name: string;
        slug: string;
        description?: string;
        categoryKey: string;
        timeMode?: string;
        status?: string;
        requiresApproval?: boolean;
        capacity?: number;
        images?: unknown[];
        pricing?: unknown;
        metadata?: unknown;
    }) => Promise<{ id: string }>;
    isLoading: boolean;
} {
    const mutation = useMutation(api.domain.resources.create);
    return {
        createResource: mutation as unknown as (args: {
            tenantId: TenantId;
            organizationId?: OrganizationId;
            name: string;
            slug: string;
            description?: string;
            categoryKey: string;
            timeMode?: string;
            status?: string;
            requiresApproval?: boolean;
            capacity?: number;
            images?: unknown[];
            pricing?: unknown;
            metadata?: unknown;
        }) => Promise<{ id: string }>,
        isLoading: false,
    };
}

/**
 * Update a resource
 */
export function useUpdateResource(): {
    updateResource: (args: {
        id: ResourceId;
        name?: string;
        description?: string;
        status?: string;
        requiresApproval?: boolean;
        capacity?: number;
        images?: unknown[];
        pricing?: unknown;
        metadata?: unknown;
    }) => Promise<{ success: boolean }>;
} {
    const mutation = useMutation(api.domain.resources.update);
    return { updateResource: mutation };
}

/**
 * Delete (soft-delete) a resource
 */
export function useDeleteResource(): {
    deleteResource: (id: ResourceId) => Promise<{ success: boolean }>;
} {
    const { user } = useAuth();
    const mutation = useMutation(api.domain.resources.remove);
    return {
        deleteResource: (id: ResourceId) => {
            if (!user?.id) throw new Error("deleteResource requires an authenticated user");
            return mutation({ id, removedBy: asId<"users">(user.id) });
        },
    };
}

/**
 * Publish a resource.
 * Requires authenticated user with resource:publish permission.
 */
export function usePublishResource(): {
    publishResource: (id: ResourceId) => Promise<{ success: boolean }>;
} {
    const { user } = useAuth();
    const mutation = useMutation(api.domain.resources.publish);
    return {
        publishResource: (id: ResourceId) => {
            if (!user?.id) throw new Error("Authentication required to publish");
            return mutation({ id, publishedBy: asId<"users">(user.id) });
        },
    };
}

/**
 * Unpublish a resource.
 * Requires authenticated user with resource:publish permission.
 */
export function useUnpublishResource(): {
    unpublishResource: (id: ResourceId) => Promise<{ success: boolean }>;
} {
    const { user } = useAuth();
    const mutation = useMutation(api.domain.resources.unpublish);
    return {
        unpublishResource: (id: ResourceId) => {
            if (!user?.id) throw new Error("Authentication required to unpublish");
            return mutation({ id, unpublishedBy: asId<"users">(user.id) });
        },
    };
}

/**
 * Fetch public resources (no tenantId required - for public web apps)
 */
export function usePublicResources(
    options: { categoryKey?: string; status?: string; limit?: number } = {}
): UseResourcesResult {
    const { categoryKey, status, limit } = options;

    const data = useQuery(api.domain.resources.listPublic, {
        categoryKey,
        status,
        limit,
    });

    const isLoading = data === undefined;
    const error = null;

    const resources: Resource[] = (data ?? []).map((r) => ({
        id: r._id as string,
        tenantId: r.tenantId as string,
        organizationId: r.organizationId as string | undefined,
        name: r.name,
        slug: r.slug,
        description: r.description,
        categoryKey: r.categoryKey,
        timeMode: r.timeMode,
        features: r.features,
        status: r.status as ResourceStatus,
        requiresApproval: r.requiresApproval,
        capacity: r.capacity,
        inventoryTotal: r.inventoryTotal,
        images: r.images,
        pricing: r.pricing,
        metadata: r.metadata,
        createdAt: new Date(r._creationTime).toISOString(),
        updatedAt: new Date(r._creationTime).toISOString(),
    }));

    return {
        resources,
        data: toPaginatedResponse(resources),
        isLoading,
        error,
    };
}
