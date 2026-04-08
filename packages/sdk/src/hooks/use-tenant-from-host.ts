/**
 * useTenantFromHost — Resolve tenant from window.location.hostname.
 *
 * Parses the current hostname and resolves the tenant via Convex:
 * - Subdomain mode: `{slug}.example.com` → getBySlug(slug)
 * - Custom domain: `booking.kommune.no` → getByDomain(domain)
 *
 * @example
 * const { tenantId, tenant, isLoading } = useTenantFromHost('example.com');
 */

import { useMemo } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { api, type Id } from "../convex-api";

/** Result of hostname-based tenant resolution. */
export interface UseTenantFromHostResult {
    /** Resolved tenant document ID, if found. */
    tenantId: Id<"tenants"> | undefined;
    /** Full tenant document, if found. */
    tenant: {
        _id: Id<"tenants">;
        name: string;
        slug: string;
        domain?: string;
        status: string;
    } | null;
    /** True while the Convex query is loading. */
    isLoading: boolean;
    /** True if this appears to be a subdomain of the base domain. */
    isSubdomain: boolean;
    /** True if this is a custom domain (not a subdomain of baseDomain). */
    isCustomDomain: boolean;
    /** The parsed slug or full domain string used for lookup. */
    lookupKey: string | undefined;
}

/**
 * Parse hostname to determine lookup strategy.
 *
 * @param baseDomain - e.g. "example.com"
 * @returns { mode: 'subdomain' | 'custom' | 'local', key: string | undefined }
 */
function parseHostname(baseDomain: string): {
    mode: "subdomain" | "custom" | "local";
    key: string | undefined;
} {
    // SSR guard
    if (typeof window === "undefined") return { mode: "local", key: undefined };

    const hostname = window.location.hostname;

    // Localhost / dev → skip resolution
    if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.endsWith(".localhost")
    ) {
        return { mode: "local", key: undefined };
    }

    // Subdomain: {slug}.{baseDomain}
    const suffix = `.${baseDomain}`;
    if (hostname.endsWith(suffix)) {
        const slug = hostname.slice(0, -suffix.length);
        // Ignore "www" as a slug
        if (slug && slug !== "www") {
            return { mode: "subdomain", key: slug };
        }
        return { mode: "local", key: undefined };
    }

    // Exact match with baseDomain (root domain, no subdomain)
    if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
        return { mode: "local", key: undefined };
    }

    // Custom domain
    return { mode: "custom", key: hostname };
}

/**
 * Resolve the current tenant from `window.location.hostname`.
 *
 * @param baseDomain - The platform's base domain (reads VITE_PLATFORM_DOMAIN env var, falls back to "localhost")
 */
export function useTenantFromHost(
    baseDomain = String((typeof import.meta !== "undefined" && import.meta.env?.VITE_PLATFORM_DOMAIN) || "localhost")
): UseTenantFromHostResult {
    const parsed = useMemo(() => parseHostname(baseDomain), [baseDomain]);

    // Subdomain resolution: getBySlug
    const slugResult = useConvexQuery(
        api.tenants.index.getBySlug,
        parsed.mode === "subdomain" && parsed.key
            ? { slug: parsed.key }
            : "skip"
    );

    // Custom domain resolution: getByDomain
    const domainResult = useConvexQuery(
        api.tenants.index.getByDomain,
        parsed.mode === "custom" && parsed.key
            ? { domain: parsed.key }
            : "skip"
    );

    const isSubdomain = parsed.mode === "subdomain";
    const isCustomDomain = parsed.mode === "custom";

    // Determine the resolved tenant
    const resolved = isSubdomain ? slugResult : isCustomDomain ? domainResult : undefined;
    const isLoading =
        (isSubdomain || isCustomDomain) && resolved === undefined;

    const tenant = resolved
        ? {
            _id: (resolved as { _id: Id<"tenants"> })._id,
            name: (resolved as { name: string }).name,
            slug: (resolved as { slug: string }).slug,
            domain: (resolved as { domain?: string }).domain,
            status: (resolved as { status: string }).status,
        }
        : null;

    return {
        tenantId: tenant?._id,
        tenant,
        isLoading,
        isSubdomain,
        isCustomDomain,
        lookupKey: parsed.key,
    };
}
