/**
 * Feature flag validators for tenant.featureFlags.
 * Ensures only known module IDs and boolean values are accepted.
 */

/** Module IDs matching registered components */
export const ALLOWED_MODULE_IDS = new Set([
  "messaging",
  "analytics",
  "integrations",
  "gdpr",
  "reviews",
  "mfa",
  "sso",
  "support",
  "subscriptions",
  "pricing",
  "addons",
  "classification",
]);

/** Legacy keys supported for backwards compatibility */
export const LEGACY_FLAG_KEYS = new Set([
  "approval_workflow",
]);

/**
 * Validate and sanitize feature flags for tenant update.
 * Filters out unknown keys; ensures values are boolean.
 */
export function sanitizeFeatureFlags(input: unknown): Record<string, boolean> {
  if (!input || typeof input !== "object") return {};
  const result: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(input)) {
    if (
      (ALLOWED_MODULE_IDS.has(key) || LEGACY_FLAG_KEYS.has(key)) &&
      typeof val === "boolean"
    ) {
      result[key] = val;
    }
  }
  return result;
}
