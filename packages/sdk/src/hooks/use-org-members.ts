/**
 * DigilistSaaS SDK - Organization Member Management Hooks
 *
 * React hooks for adding, removing, and updating organization members.
 */

import { useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";
import { useState } from "react";

/**
 * Add a member to an organization.
 */
export function useAddOrgMember() {
    const mutation = useConvexMutation(api.users.mutations.create);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutateAsync = async (args: {
        tenantId: Id<"tenants">;
        organizationId: Id<"organizations">;
        email: string;
        name?: string;
        role?: string;
    }) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await mutation({
                tenantId: args.tenantId,
                organizationId: args.organizationId,
                email: args.email,
                name: args.name,
                role: args.role ?? "subscriber",
            } as any);
            return result;
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            setError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess: false };
}

/**
 * Remove a member from an organization.
 */
export function useRemoveOrgMember() {
    const mutation = useConvexMutation(api.users.mutations.update);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutateAsync = async (args: { userId: Id<"users"> }) => {
        setIsLoading(true);
        setError(null);
        try {
            await mutation({
                id: args.userId,
                organizationId: undefined,
            } as any);
            return { success: true };
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            setError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess: false };
}

/**
 * Update a member's role in an organization.
 */
export function useUpdateOrgMemberRole() {
    const mutation = useConvexMutation(api.users.mutations.update);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutateAsync = async (args: { userId: Id<"users">; role: string }) => {
        setIsLoading(true);
        setError(null);
        try {
            await mutation({
                id: args.userId,
                role: args.role,
            } as any);
            return { success: true };
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            setError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { mutate: mutateAsync, mutateAsync, isLoading, error, isSuccess: false };
}
