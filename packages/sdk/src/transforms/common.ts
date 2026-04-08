/**
 * DigilistSaaS SDK - Common Transform Utilities
 *
 * Shared helpers for wrapping Convex data into digdir-compatible
 * response shapes (pagination, query results, mutation results).
 */

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}

/**
 * Wrap a plain array in a `PaginatedResponse` envelope.
 *
 * When `total` is omitted the length of `items` is used (single-page result).
 * `page` and `limit` default to 1 and items.length respectively so callers
 * that receive the full dataset can call this without extra bookkeeping.
 */
export function toPaginatedResponse<T>(
    items: T[],
    total?: number,
    page = 1,
    limit?: number,
): PaginatedResponse<T> {
    const effectiveLimit = limit ?? (items.length || 1);
    const effectiveTotal = total ?? items.length;
    const totalPages = effectiveLimit > 0 ? Math.ceil(effectiveTotal / effectiveLimit) : 1;

    return {
        data: items,
        meta: {
            total: effectiveTotal,
            page,
            limit: effectiveLimit,
            totalPages,
        },
    };
}

/**
 * Wrap a single item in a `{ data: T }` envelope.
 * Mirrors the digdir API pattern for single-item responses.
 */
export interface SingleResponse<T> {
    data: T;
}

export function toSingleResponse<T>(item: T): SingleResponse<T> {
    return { data: item };
}

// =============================================================================
// Query Result
// =============================================================================

export interface QueryResult<T> {
    data: T | undefined;
    isLoading: boolean;
    error: Error | null;
}

/**
 * Wrap raw data in the standard `QueryResult` shape used by React Query
 * and most data-fetching libraries.
 *
 * Convex reactive queries resolve to `undefined` while loading, so
 * `isLoading` defaults to `data === undefined` when not explicitly provided.
 */
export function toQueryResult<T>(
    data: T | undefined,
    isLoading?: boolean,
    error?: Error | null,
): QueryResult<T> {
    return {
        data,
        isLoading: isLoading ?? data === undefined,
        error: error ?? null,
    };
}

// =============================================================================
// Mutation Result
// =============================================================================

export interface MutationResult<TArgs, TResult> {
    /** Fire-and-forget call (does not throw). */
    mutate: (args: TArgs) => void;
    /** Awaitable version that returns the result or throws on error. */
    mutateAsync: (args: TArgs) => Promise<TResult>;
    /** Always starts as `false`. Convex mutations are optimistic. */
    isLoading: boolean;
    /** Last error, if any. */
    error: Error | null;
}

/**
 * Wrap a raw Convex mutation function in the `MutationResult` shape that
 * mirrors React Query's `useMutation` return value.
 *
 * The wrapper catches errors from the async path and stores them on `error`
 * so callers that use `mutate` (non-async) are not surprised by unhandled
 * rejections.
 */
export function toMutationResult<TArgs, TResult>(
    mutateFn: (args: TArgs) => Promise<TResult>,
): MutationResult<TArgs, TResult> {
    let lastError: Error | null = null;

    const mutateAsync = async (args: TArgs): Promise<TResult> => {
        lastError = null;
        try {
            return await mutateFn(args);
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            throw lastError;
        }
    };

    const mutate = (args: TArgs): void => {
        void mutateAsync(args).catch(() => {
            // Error already captured in lastError; swallow to avoid
            // unhandled rejection when using the fire-and-forget API.
        });
    };

    return {
        mutate,
        mutateAsync,
        isLoading: false,
        error: lastError,
    };
}

// =============================================================================
// Timestamp Helpers
// =============================================================================

/**
 * Convert an epoch timestamp (milliseconds) to an ISO-8601 string.
 * Returns `undefined` when the input is falsy, which makes optional
 * timestamp fields straightforward to handle.
 */
export function epochToISO(epoch: number | undefined | null): string | undefined {
    if (epoch == null) return undefined;
    return new Date(epoch).toISOString();
}

/**
 * Convert an ISO-8601 string (or Date) to an epoch timestamp (ms).
 * Returns `undefined` when the input is falsy.
 */
export function isoToEpoch(iso: string | Date | undefined | null): number | undefined {
    if (iso == null) return undefined;
    const d = iso instanceof Date ? iso : new Date(iso);
    return d.getTime();
}
