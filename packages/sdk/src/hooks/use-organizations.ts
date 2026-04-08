/**
 * DigilistSaaS SDK - Organization & User Hooks (Tier 2 Adapter)
 *
 * React hooks for organization management, user CRUD, GDPR, and consent.
 * Wraps Convex real-time queries/mutations into a React Query-like API shape
 * compatible with the digdir client-sdk contract.
 *
 * Queries  return `{ data, isLoading, error }`.
 * Mutations return `{ mutate, mutateAsync, isLoading, error, isSuccess }`.
 */

import {
    useQuery as useConvexQuery,
    useMutation as useConvexMutation,
    useAction as useConvexAction,
} from "convex/react";
import { api, type TenantId, type OrganizationId, type UserId } from "../convex-api";
import { useState, useCallback } from "react";
import { toPaginatedResponse, toSingleResponse } from "../transforms/common";
import {
    transformOrganization,
    transformOrganizationWithChildren,
    transformUser,
    transformCurrentUser,
} from "../transforms/organization";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap a Convex useQuery into a React Query-like shape. */
function useWrappedQuery<T>(
    queryRef: any,
    args: any,
): { data: T | undefined; isLoading: boolean; error: Error | null } {
    const raw = useConvexQuery(queryRef, args);
    return {
        data: raw as T | undefined,
        isLoading: raw === undefined && args !== "skip",
        error: null,
    };
}

/** Wrap a Convex useMutation into a React Query-like shape. */
function useWrappedMutation<TArgs = any, TResult = any>(mutationRef: any) {
    const mutate = useConvexMutation(mutationRef);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const mutateAsync = async (args: TArgs): Promise<TResult> => {
        setIsLoading(true);
        setError(null);
        setIsSuccess(false);
        try {
            const result = await (mutate as any)(args);
            setIsSuccess(true);
            return result;
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            setError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess };
}

// ---------------------------------------------------------------------------
// Organization Types
// ---------------------------------------------------------------------------

export interface Organization {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    description?: string;
    type: string;
    parentId?: string;
    status: string;
    settings?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    parent?: Record<string, unknown> | null;
    children?: Organization[];
    createdAt: string;
}

export interface OrganizationQueryParams {
    tenantId?: TenantId;
    status?: string;
    parentId?: OrganizationId;
}

export interface CreateOrganizationInput {
    tenantId: TenantId;
    name: string;
    slug: string;
    description?: string;
    type: string;
    parentId?: OrganizationId;
    settings?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface UpdateOrganizationInput {
    id: OrganizationId;
    name?: string;
    description?: string;
    type?: string;
    parentId?: OrganizationId;
    settings?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    status?: string;
}

// ---------------------------------------------------------------------------
// User Types
// ---------------------------------------------------------------------------

export interface User {
    id: string;
    tenantId: string;
    organizationId?: string;
    email: string;
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    role: string;
    status: string;
    metadata?: Record<string, unknown>;
    tenant?: Record<string, unknown> | null;
    organization?: Record<string, unknown> | null;
    createdAt: string;
}

export interface UserQueryParams {
    tenantId?: TenantId;
    status?: string;
    role?: string;
    limit?: number;
}

export interface CreateUserInput {
    tenantId: TenantId;
    organizationId?: OrganizationId;
    email: string;
    name?: string;
    displayName?: string;
    role: string;
    metadata?: Record<string, unknown>;
}

export interface UpdateUserInput {
    id: UserId;
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    role?: string;
    organizationId?: OrganizationId;
    metadata?: Record<string, unknown>;
}

export interface ConsentSettings {
    marketing: boolean;
    analytics: boolean;
    thirdParty: boolean;
    updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Query key factories (inert — for React Query cache-key compat)
// ---------------------------------------------------------------------------

export const organizationKeys = {
    all: ["organizations"] as const,
    lists: () => [...organizationKeys.all, "list"] as const,
    list: (params?: OrganizationQueryParams) =>
        [...organizationKeys.lists(), params] as const,
    details: () => [...organizationKeys.all, "detail"] as const,
    detail: (id: string) => [...organizationKeys.details(), id] as const,
    members: (id: string) => [...organizationKeys.all, "members", id] as const,
};

export const userKeys = {
    all: ["users"] as const,
    lists: () => [...userKeys.all, "list"] as const,
    list: (params?: UserQueryParams) => [...userKeys.lists(), params] as const,
    details: () => [...userKeys.all, "detail"] as const,
    detail: (id: string) => [...userKeys.details(), id] as const,
    me: () => [...userKeys.all, "me"] as const,
    consents: (userId?: string) => [...userKeys.all, "consents", userId] as const,
};

// ============================================================================
// Organization Hooks
// ============================================================================

/**
 * Fetch organizations with optional filtering.
 * Wraps `api.organizations.index.list`.
 */
export function useOrganizations(params?: OrganizationQueryParams) {
    const args =
        params?.tenantId
            ? {
                tenantId: params.tenantId,
                status: params.status,
                parentId: params.parentId,
            }
            : "skip";

    const { data: raw, isLoading, error } = useWrappedQuery<any[]>(
        api.organizations.index.list,
        args,
    );

    const items: Organization[] | undefined = raw
        ? raw.map((o: any) => transformOrganization(o))
        : undefined;

    const data = items ? toPaginatedResponse(items) : undefined;

    return { data, isLoading, error };
}

/**
 * Fetch a single organization by ID.
 * Wraps `api.organizations.index.get`.
 */
export function useOrganization(
    id: OrganizationId | string | undefined,
    options?: { enabled?: boolean },
) {
    const enabled = (options?.enabled ?? true) && !!id;
    const args = enabled ? { id: id as OrganizationId } : "skip";

    const { data: raw, isLoading, error } = useWrappedQuery<any>(
        api.organizations.index.get,
        args,
    );

    const item: Organization | undefined = raw
        ? transformOrganizationWithChildren(raw)
        : undefined;

    const data = item ? toSingleResponse(item) : undefined;

    return { data, isLoading, error };
}

/**
 * Fetch a single organization by slug (within a tenant).
 * Wraps `api.organizations.index.getBySlug`.
 */
export function useOrganizationBySlug(
    slug: string | undefined,
    tenantId: TenantId | string | undefined,
    options?: { enabled?: boolean },
) {
    const enabled = (options?.enabled ?? true) && !!slug && !!tenantId;
    const args = enabled ? { tenantId: tenantId as TenantId, slug: slug! } : "skip";

    const { data: raw, isLoading, error } = useWrappedQuery<any>(
        api.organizations.index.getBySlug,
        args,
    );

    const item: Organization | undefined = raw
        ? transformOrganization(raw)
        : undefined;

    const data = item ? toSingleResponse(item) : undefined;

    return { data, isLoading, error };
}

/**
 * Fetch organization members.
 * Connected to Convex: api.organizations.index.listMembers
 */
export function useOrganizationMembers(
    orgId: OrganizationId | string | undefined,
    params?: { tenantId?: TenantId; status?: string; limit?: number },
) {
    const args = orgId
        ? {
            organizationId: orgId as OrganizationId,
            status: params?.status,
            limit: params?.limit,
        }
        : "skip";

    const { data: raw, isLoading, error } = useWrappedQuery<any[]>(
        api.organizations.index.listMembers,
        args,
    );

    const items: User[] | undefined = raw
        ? raw.map((u: any) => transformUser(u))
        : undefined;

    const data = items ? toPaginatedResponse(items) : undefined;

    return { data, members: items ?? [], isLoading, error };
}

/**
 * Create a new organization.
 * Wraps `api.organizations.index.create`.
 */
export function useCreateOrganization() {
    return useWrappedMutation<CreateOrganizationInput, { id: string }>(
        api.organizations.index.create,
    );
}

/**
 * Update an existing organization.
 * Wraps `api.organizations.index.update`.
 */
export function useUpdateOrganization() {
    return useWrappedMutation<UpdateOrganizationInput, { success: boolean }>(
        api.organizations.index.update,
    );
}

/**
 * Delete (soft-delete) an organization.
 * Wraps `api.organizations.index.remove`.
 */
export function useDeleteOrganization() {
    return useWrappedMutation<{ id: OrganizationId }, { success: boolean }>(
        api.organizations.index.remove,
    );
}

/**
 * Verify an organization against Brønnøysundregistrene (BRREG).
 * Wraps `api.domain.organizationVerify.verify` (Convex action).
 * Returns BRREG data: { valid, name, orgForm, address }.
 */
export function useVerifyOrganization() {
    const verifyAction = useConvexAction((api.domain as any).organizationVerify.verify);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const mutateAsync = useCallback(
        async (args: { id: OrganizationId }): Promise<{ valid: boolean; name: string | null; orgForm: string | null; address: string | null }> => {
            setIsLoading(true);
            setError(null);
            setIsSuccess(false);
            try {
                // Use the org ID as the org number for BRREG lookup
                const result = await verifyAction({ orgNumber: args.id as string });
                setIsSuccess(true);
                return result as any;
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                setError(err);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [verifyAction],
    );

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess };
}

/**
 * Upload an organization logo.
 * Uses Convex storage: generateUploadUrl -> POST file -> storeFile -> update org.
 */
export function useUploadOrganizationLogo() {
    const generateUploadUrl = useConvexMutation(api.storage.generateUploadUrl);
    const storeFile = useConvexMutation(api.storage.storeFile);
    const updateOrg = useConvexMutation(api.organizations.index.update);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const mutateAsync = useCallback(
        async (args: { id: string; file: File; options?: Record<string, unknown> }): Promise<{ url: string }> => {
            setIsLoading(true);
            setError(null);
            setIsSuccess(false);
            try {
                const uploadUrl = await generateUploadUrl();
                const response = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": args.file.type },
                    body: args.file,
                });
                if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
                const { storageId } = await response.json();

                const result = await storeFile({
                    storageId,
                    filename: args.file.name,
                    contentType: args.file.type,
                    size: args.file.size,
                });
                const url = (result as any)?.url ?? "";

                // Update org with logo URL
                await (updateOrg as any)({ id: args.id, logo: url });

                setIsSuccess(true);
                return { url };
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                setError(err);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [generateUploadUrl, storeFile, updateOrg],
    );

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess };
}

// ============================================================================
// User Hooks
// ============================================================================

/**
 * Fetch users with optional filtering.
 * Wraps `api.users.index.list`.
 */
export function useUsers(params?: UserQueryParams) {
    const args =
        params?.tenantId
            ? {
                tenantId: params.tenantId,
                status: params.status,
                role: params.role,
                limit: params.limit,
            }
            : "skip";

    const { data: raw, isLoading, error } = useWrappedQuery<any[]>(
        api.users.index.list,
        args,
    );

    const items: User[] | undefined = raw
        ? raw.map((u: any) => transformUser(u))
        : undefined;

    const data = items ? toPaginatedResponse(items) : undefined;

    return { data, isLoading, error };
}

/**
 * Fetch a single user by ID.
 * Wraps `api.users.index.get`.
 */
export function useUser(
    id: UserId | string | undefined,
    options?: { enabled?: boolean },
) {
    const enabled = (options?.enabled ?? true) && !!id;
    const args = enabled ? { id: id as UserId } : "skip";

    const { data: raw, isLoading, error } = useWrappedQuery<any>(
        api.users.index.get,
        args,
    );

    const item: User | undefined = raw
        ? transformUser(raw)
        : undefined;

    const data = item ? toSingleResponse(item) : undefined;

    return { data, isLoading, error };
}

/**
 * Get the currently authenticated user.
 * Wraps `api.users.index.me`.
 * Requires the caller to provide `authUserId` (from the auth session).
 */
export function useCurrentUser(authUserId?: string) {
    const args = authUserId ? { authUserId } : "skip";

    const { data: raw, isLoading, error } = useWrappedQuery<any>(
        api.users.index.me,
        args,
    );

    const item: User | undefined = raw
        ? transformCurrentUser(raw)
        : undefined;

    const data = item ? toSingleResponse(item) : undefined;

    return { data, isLoading, error };
}

/**
 * Create a new user.
 * Wraps `api.users.mutations.create`.
 */
export function useCreateUser() {
    return useWrappedMutation<CreateUserInput, { id: string }>(
        api.users.mutations.create,
    );
}

/**
 * Update an existing user.
 * Wraps `api.users.mutations.update`.
 */
export function useUpdateUser() {
    return useWrappedMutation<UpdateUserInput, { success: boolean }>(
        api.users.mutations.update,
    );
}

/**
 * Update the currently authenticated user.
 * Wraps `api.users.mutations.update` — caller passes partial fields, we forward to the update mutation.
 */
export function useUpdateCurrentUser() {
    return useWrappedMutation<Partial<UpdateUserInput>, { success: boolean }>(
        api.users.mutations.update,
    );
}

/**
 * Deactivate (suspend) a user.
 * Wraps `api.users.mutations.suspend`.
 */
export function useDeactivateUser() {
    return useWrappedMutation<
        { id: UserId; reason?: string },
        { success: boolean }
    >(api.users.mutations.suspend);
}

/**
 * Reactivate a suspended user.
 * Wraps `api.users.mutations.reactivate`.
 */
export function useReactivateUser() {
    return useWrappedMutation<{ id: UserId }, { success: boolean }>(
        api.users.mutations.reactivate,
    );
}

/**
 * Upload a user avatar.
 * Uses Convex storage: generateUploadUrl -> POST file -> storeFile -> update user.
 */
export function useUploadUserAvatar() {
    const generateUploadUrl = useConvexMutation(api.storage.generateUploadUrl);
    const storeFile = useConvexMutation(api.storage.storeFile);
    const updateUser = useConvexMutation(api.users.mutations.update);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const mutateAsync = useCallback(
        async (args: { id: string; file: File; options?: Record<string, unknown> }): Promise<{ url: string }> => {
            setIsLoading(true);
            setError(null);
            setIsSuccess(false);
            try {
                const uploadUrl = await generateUploadUrl();
                const response = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": args.file.type },
                    body: args.file,
                });
                if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
                const { storageId } = await response.json();

                const result = await storeFile({
                    storageId,
                    filename: args.file.name,
                    contentType: args.file.type,
                    size: args.file.size,
                });
                const url = (result as any)?.url ?? "";

                // Update user with avatar URL
                await (updateUser as any)({ id: args.id, avatarUrl: url });

                setIsSuccess(true);
                return { url };
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                setError(err);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [generateUploadUrl, storeFile, updateUser],
    );

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess };
}

// ============================================================================
// GDPR Hooks
// ============================================================================

/**
 * Export user data (DSAR).
 * Wraps `api.domain.compliance.submitDSAR` with requestType "export".
 */
export function useExportData() {
    return useWrappedMutation<
        { tenantId: string; userId: string; email?: string },
        { id: string }
    >(api.domain.compliance.submitDSAR);
}

/**
 * Delete account (right to erasure).
 * Wraps `api.users.mutations.remove`.
 */
export function useDeleteAccount() {
    return useWrappedMutation<{ id: UserId }, { success: boolean }>(
        api.users.mutations.remove,
    );
}

/**
 * Get consent settings for a user.
 * Wraps `api.domain.compliance.getConsentSummary`.
 */
export function useConsents(userId?: string, tenantId?: string) {
    const args = userId && tenantId ? { userId, tenantId } : "skip";

    const { data: raw, isLoading, error } = useWrappedQuery<any>(
        api.domain.compliance.getConsentSummary,
        args,
    );

    // Map compliance summary to ConsentSettings shape
    const settings: ConsentSettings | undefined = raw
        ? {
            marketing: !!(raw as Record<string, unknown>).marketing,
            analytics: !!(raw as Record<string, unknown>).analytics,
            thirdParty: !!(raw as Record<string, unknown>).thirdParty,
            updatedAt: (raw as Record<string, unknown>).updatedAt as string | undefined,
        }
        : undefined;

    const data = settings ? { data: settings } : undefined;

    return { data, isLoading, error };
}

/**
 * Update consent settings.
 * Wraps `api.domain.compliance.updateConsent`.
 */
export function useUpdateConsents() {
    return useWrappedMutation<
        { tenantId: string; userId: string; consentType: string; granted: boolean },
        { success: boolean }
    >(api.domain.compliance.updateConsent);
}
