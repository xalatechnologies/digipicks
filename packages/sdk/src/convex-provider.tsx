/**
 * DigilistSaaS SDK - Convex Provider with Query Caching
 *
 * Wraps the app with ConvexProvider for React hooks.
 * Includes ConvexQueryCacheProvider from convex-helpers for optimized
 * subscription caching during navigation.
 * 
 * @see https://github.com/get-convex/convex-helpers#query-caching
 */

import React from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache";

interface XalaConvexProviderProps {
    url?: string;
    children: React.ReactNode;
    /**
     * Query cache configuration
     */
    cache?: {
        /**
         * Milliseconds to preserve unmounted subscriptions.
         * Default: 300000 (5 minutes)
         */
        expiration?: number;
        /**
         * Maximum number of unused subscriptions kept in cache.
         * Default: 250
         */
        maxIdleEntries?: number;
        /**
         * Enable console logs for debugging cache state.
         * Default: false
         */
        debug?: boolean;
        /**
         * Disable query caching entirely.
         * Default: false
         */
        disabled?: boolean;
    };
}

let client: ConvexReactClient | null = null;

function getClient(url: string): ConvexReactClient {
    if (!client) {
        client = new ConvexReactClient(url);
    }
    return client;
}

/**
 * Returns the singleton ConvexReactClient (if initialized).
 * Used by imperative services like auditService that need to call mutations
 * outside of React component context.
 */
export function getConvexClient(): ConvexReactClient | null {
    return client;
}

export function XalaConvexProvider({
    url,
    children,
    cache
}: XalaConvexProviderProps) {
    const rawUrl = url || import.meta.env.VITE_CONVEX_URL;
    const convexUrl = typeof rawUrl === 'string' ? rawUrl : '';
    if (!convexUrl) {
        throw new Error("VITE_CONVEX_URL not set and no url prop provided");
    }

    // If caching is disabled, just return the base provider
    if (cache?.disabled) {
        return (
            <ConvexProvider client={getClient(convexUrl)}>
                {children}
            </ConvexProvider>
        );
    }

    // Default cache config with sensible defaults
    const cacheConfig = {
        expiration: cache?.expiration ?? 300000, // 5 minutes
        maxIdleEntries: cache?.maxIdleEntries ?? 250,
        debug: cache?.debug ?? false,
    };

    return (
        <ConvexProvider client={getClient(convexUrl)}>
            <ConvexQueryCacheProvider
                expiration={cacheConfig.expiration}
                maxIdleEntries={cacheConfig.maxIdleEntries}
                debug={cacheConfig.debug}
            >
                {children}
            </ConvexQueryCacheProvider>
        </ConvexProvider>
    );
}

export { ConvexProvider };
