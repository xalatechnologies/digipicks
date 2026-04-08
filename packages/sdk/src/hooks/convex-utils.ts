/**
 * Convex Utilities
 * 
 * Centralized exports for Convex hooks with query caching enabled.
 * All SDK hooks should import from this file instead of directly from convex/react.
 * 
 * This enables automatic subscription caching for improved navigation performance.
 * @see https://github.com/get-convex/convex-helpers#query-caching
 */

// Re-export cached query hooks from convex-helpers
// These are drop-in replacements that benefit from ConvexQueryCacheProvider
export {
    useQuery,
    usePaginatedQuery,
    useQueries,
} from 'convex-helpers/react/cache';

// Re-export mutation and action hooks (no caching needed for these)
export { useMutation, useAction } from 'convex/react';

// Re-export Convex types for convenience
export type { FunctionReference, FunctionReturnType } from 'convex/server';
