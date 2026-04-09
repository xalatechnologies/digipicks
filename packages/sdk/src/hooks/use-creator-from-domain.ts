/**
 * useCreatorFromDomain — Resolve a creator from the current hostname.
 *
 * If the current hostname matches a creator's configured custom domain,
 * this hook returns the creator's brand config (tenantId, creatorId, etc.)
 * enabling custom domain routing for white-label creator pages.
 *
 * @example
 * function App() {
 *   const { creator, isLoading } = useCreatorFromDomain();
 *   if (creator) return <CreatorProfilePage creatorId={creator.creatorId} />;
 *   return <NormalApp />;
 * }
 */

import { useQuery as useConvexQuery } from "convex/react";
import { api } from "../convex-api";

export interface CreatorFromDomainResult {
    creator: {
        tenantId: string;
        creatorId: string;
        displayName?: string;
        customDomain: string;
    } | null;
    isLoading: boolean;
}

/**
 * Check if the current hostname corresponds to a creator custom domain.
 * Skips the query for known platform domains.
 */
export function useCreatorFromDomain(): CreatorFromDomainResult {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";

    // Skip for known platform domains (localhost, digipicks.com, etc.)
    const isKnownPlatformDomain =
        !hostname ||
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.endsWith(".digipicks.com") ||
        hostname.endsWith(".vercel.app") ||
        hostname.includes("127.0.0.1");

    const result = useConvexQuery(
        api.tenants.index.getCreatorByCustomDomain,
        isKnownPlatformDomain ? "skip" : { domain: hostname }
    );

    if (isKnownPlatformDomain) {
        return { creator: null, isLoading: false };
    }

    if (result === undefined) {
        return { creator: null, isLoading: true };
    }

    if (!result) {
        return { creator: null, isLoading: false };
    }

    return {
        creator: {
            tenantId: result.tenantId,
            creatorId: result.creatorId,
            displayName: result.displayName,
            customDomain: result.customDomain,
        },
        isLoading: false,
    };
}
