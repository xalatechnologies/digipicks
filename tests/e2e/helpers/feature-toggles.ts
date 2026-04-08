/**
 * E2E Feature Toggle Helpers
 *
 * Utilities to update tenant feature flags via Convex for E2E tests.
 * Requires CONVEX_DEPLOYMENT or CONVEX_URL to be set (e.g. from .env.local).
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/** Slug of the seeded tenant (from convex/seeds.ts) */
export const SEEDED_TENANT_SLUG = "skien";

/**
 * Get tenant ID by slug via Convex CLI.
 * Returns null if Convex is not configured or the tenant is not found.
 */
export async function getTenantIdBySlug(slug: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `npx convex run tenants/index:getBySlug '{"slug":"${slug}"}'`,
      {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: "test" },
      }
    );
    const trimmed = stdout.trim();
    if (!trimmed) return null;
    const tenant = JSON.parse(trimmed);
    return (tenant && (tenant._id ?? tenant.id)) || null;
  } catch {
    return null;
  }
}

/**
 * Update tenant feature flags via Convex CLI.
 * Returns true on success, false on failure (e.g. Convex not running).
 */
export async function updateTenantFeatureFlags(
  tenantId: string,
  flags: Record<string, boolean>
): Promise<boolean> {
  try {
    const args = JSON.stringify({ tenantId, featureFlags: flags });
    await execAsync(`npx convex run tenants/index:updateSettings '${args}'`, {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: "test" },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Restore all feature flags to enabled (default state).
 */
export async function restoreAllFeatureFlags(tenantId: string): Promise<boolean> {
  return updateTenantFeatureFlags(tenantId, {
    booking: true,
    "seasonal-leases": true,
    messaging: true,
    analytics: true,
    integrations: true,
    gdpr: true,
    reviews: true,
  });
}
