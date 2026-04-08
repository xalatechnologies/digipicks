/**
 * Feature flag helpers for production-ready module gating.
 * Used by domain facades to enforce tenant feature flags.
 */

import type { DataModel } from "../_generated/dataModel";
import type { GenericDatabaseReader } from "convex/server";
import { hasModuleEnabled } from "./componentMiddleware";

/** Context with db capable of querying componentRegistry and tenants */
export type FeatureFlagContext = { db: GenericDatabaseReader<DataModel> };

/**
 * Require that a module is enabled for the tenant.
 * Throws if the module is disabled; use in mutation handlers.
 *
 * @param ctx - Convex ctx (must have db with query, get)
 * @param tenantId - Tenant document ID (string or Id<"tenants">)
 * @param moduleId - Module ID from MODULE_CATALOG (messaging, seasonal-leases, analytics, etc.)
 * @throws Error with code MODULE_DISABLED when module is off
 */
export async function requireModuleEnabled(
  ctx: FeatureFlagContext,
  tenantId: string,
  moduleId: string
): Promise<void> {
  const enabled = await hasModuleEnabled(ctx as any, tenantId, moduleId);
  if (!enabled) {
    const msg = `Module "${moduleId}" is not enabled for this tenant. Contact admin to enable.`;
    const err = new Error(msg) as Error & { code?: string };
    err.code = "MODULE_DISABLED";
    throw err;
  }
}
