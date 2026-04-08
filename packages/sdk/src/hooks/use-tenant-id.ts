/**
 * DigilistSaaS SDK - Tenant ID Resolution Hook
 *
 * Reads the tenantId from the authenticated user's session stored in localStorage.
 * Used by SDK hooks as a fallback when tenantId is not explicitly provided.
 */

import { useMemo } from "react";
import type { TenantId } from "../convex-api";

/** Known app IDs whose localStorage keys we scan when no specific appId is given. */
const KNOWN_APP_IDS = ["digilist", "web", "backoffice", "minside", "saas-admin", "default"] as const;

/**
 * Read the current tenantId from the user's session in localStorage.
 * When `appId` is provided, checks that app's key first.
 * Always falls back through all known app keys and legacy keys.
 *
 * Returns `undefined` if no session or no tenant is associated.
 */
export function useSessionTenantId(appId?: string): TenantId | undefined {
    return useMemo(() => {
        try {
            // 1. Check the specific app key first (if provided)
            if (appId) {
                const perApp = localStorage.getItem(`digilist_saas_${appId}_tenant_id`);
                if (perApp) return perApp as TenantId;
            }

            // 2. Scan all known app keys
            for (const knownId of KNOWN_APP_IDS) {
                const val = localStorage.getItem(`digilist_saas_${knownId}_tenant_id`);
                if (val) return val as TenantId;
            }

            // 3. Legacy key
            const legacy = localStorage.getItem("digilist_saas_tenant_id");
            if (legacy) return legacy as TenantId;

            // 4. Check user objects for tenantId
            const appIds = appId ? [appId, ...KNOWN_APP_IDS] : [...KNOWN_APP_IDS];
            for (const id of appIds) {
                const userJson = localStorage.getItem(`digilist_saas_${id}_user`);
                if (userJson) {
                    const user = JSON.parse(userJson);
                    if (user.tenantId) return user.tenantId as TenantId;
                }
            }

            // 5. Legacy user key
            const legacyUser = localStorage.getItem("digilist_saas_user");
            if (legacyUser) {
                const user = JSON.parse(legacyUser);
                if (user.tenantId) return user.tenantId as TenantId;
            }
        } catch {
            // localStorage unavailable or corrupted
        }
        return undefined;
    }, [appId]);
}

/**
 * Resolve a tenantId: use the explicit value if provided, otherwise fall back
 * to the session's tenantId.
 */
export function useResolveTenantId(
    explicit: TenantId | undefined,
    appId?: string
): TenantId | undefined {
    const sessionTenantId = useSessionTenantId(appId);
    return explicit ?? sessionTenantId;
}
