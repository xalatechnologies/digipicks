/**
 * DigilistSaaS SDK - Shared Hook Utilities
 *
 * Centralizes repeated patterns across all hook files:
 * - useMutationAdapter   — standardized mutation wrapper with loading/error/success state
 * - useStubQuery         — no-op query returning a default value
 * - useStubMutation      — no-op mutation that console.warns
 * - useWrappedQuery      — standardized query hook wrapper with optional transform
 */

import { useState, useCallback } from "react";
import { useQuery as useConvexQuery } from "./convex-utils";
import { toPaginatedResponse, toSingleResponse } from "../transforms/common";

export type { PaginatedResponse, SingleResponse } from "../transforms/common";

// =============================================================================
// useMutationAdapter
// =============================================================================

/**
 * Wraps an async function in standardized mutation state management.
 *
 * Returns `{ mutate, mutateAsync, isLoading, error, isSuccess }`.
 * - `mutate` fires and forgets (errors are captured in state, not thrown)
 * - `mutateAsync` returns a promise and throws on failure
 *
 * Usage:
 *   const fn = useCallback(async (args: MyArgs) => convexMutation(args), [convexMutation]);
 *   return useMutationAdapter(fn);
 */
export function useMutationAdapter<TArgs extends unknown[], TResult = void>(
    fn: (...args: TArgs) => Promise<TResult>
) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const mutateAsync = useCallback(
        async (...args: TArgs): Promise<TResult> => {
            setIsLoading(true);
            setError(null);
            setIsSuccess(false);
            try {
                const result = await fn(...args);
                setIsSuccess(true);
                return result;
            } catch (err) {
                const e = err instanceof Error ? err : new Error(String(err));
                setError(e);
                throw e;
            } finally {
                setIsLoading(false);
            }
        },
        [fn]
    );

    const mutate = useCallback(
        (...args: TArgs) => {
            mutateAsync(...args).catch(() => {
                /* swallow — error is captured in state */
            });
        },
        [mutateAsync]
    );

    return { mutate, mutateAsync, isLoading, error, isSuccess };
}

// =============================================================================
// useStubQuery
// =============================================================================

/**
 * Returns a static query result with the given default value.
 * Use for features not yet wired to Convex.
 *
 * Usage:
 *   return useStubQuery<MyType[]>([]);
 *   return useStubQuery<MyType | null>(null);
 */
export function useStubQuery<T>(
    defaultValue: T
): { data: { data: T }; isLoading: false; error: null } {
    return { data: { data: defaultValue }, isLoading: false, error: null };
}

// =============================================================================
// useStubMutation
// =============================================================================

/**
 * Returns a no-op mutation adapter that console.warns when called.
 * Use for features not yet wired to Convex.
 *
 * Usage:
 *   return useStubMutation<MyArgs, MyResult>("useMyHook");
 */
export function useStubMutation<TArgs = void, TResult = void>(
    name: string
): {
    mutate: (args: TArgs) => void;
    mutateAsync: (args: TArgs) => Promise<TResult>;
    isLoading: false;
    error: null;
    isSuccess: false;
} {
    return {
        mutate: (_args: TArgs) => {
            console.warn(`[SDK stub] ${name} is not yet wired to Convex backend`);
        },
        mutateAsync: (_args: TArgs) => {
            console.warn(`[SDK stub] ${name} is not yet wired to Convex backend`);
            return Promise.resolve(undefined as unknown as TResult);
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

// =============================================================================
// useWrappedQuery
// =============================================================================

/**
 * Standardized query hook wrapper with optional transform.
 * Returns `{ data, isLoading, error }` in paginated response shape.
 *
 * Usage (list):
 *   const { data, isLoading, error } = useWrappedQuery(
 *     api.domain.myModule.list,
 *     tenantId ? { tenantId } : "skip",
 *     (raw) => raw.map(transformItem)
 *   );
 *
 * Usage (single):
 *   const { data, isLoading, error } = useWrappedQuery(
 *     api.domain.myModule.get,
 *     id ? { id } : "skip"
 *   );
 */
export function useWrappedQuery<TRaw, TResult = TRaw>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex API reference, typed at call site
    queryRef: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- skip or args object
    args: any,
    transform?: (raw: TRaw) => TResult
): {
    data: { data: TResult[] } & { meta: { total: number; page: number; limit: number; totalPages: number } };
    isLoading: boolean;
    error: null;
} {
    const raw = useConvexQuery(queryRef, args) as TRaw[] | undefined;
    const isLoading = args !== "skip" && raw === undefined;
    const items = (raw ?? []).map((item) =>
        transform ? transform(item) : (item as unknown as TResult)
    );
    return { data: toPaginatedResponse(items), isLoading, error: null };
}

/**
 * Standardized single-item query hook wrapper.
 */
export function useWrappedSingleQuery<TRaw, TResult = TRaw>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex API reference, typed at call site
    queryRef: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- skip or args object
    args: any,
    transform?: (raw: TRaw) => TResult
): {
    data: { data: TResult } | null;
    isLoading: boolean;
    error: null;
} {
    const raw = useConvexQuery(queryRef, args) as TRaw | null | undefined;
    const isLoading = args !== "skip" && raw === undefined;
    const item = raw ? (transform ? transform(raw) : (raw as unknown as TResult)) : null;
    return {
        data: item ? toSingleResponse(item) : null,
        isLoading,
        error: null,
    };
}
