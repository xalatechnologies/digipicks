/**
 * Backend permission enforcement for domain facades.
 * Calls RBAC component checkPermission and throws RFC7807 on denial.
 *
 * @see docs/SECURITY_INVARIANTS.md §3 — Permission checks mandatory
 */

import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { components } from "../_generated/api";

/** Backend permission strings (colon format, stored in RBAC roles).
 * ⚠️ This is a closed union — add new permissions here explicitly.
 * Do NOT add | string — all callers must use a valid permission string.
 */
export type BackendPermission =
  // Resource permissions
  | "resource:view"
  | "resource:write"
  | "resource:publish"
  | "resource:delete"
  // Messaging permissions
  | "messaging:admin"
  // Review permissions
  | "review:moderate"
  // Pick moderation permissions
  | "pick:moderate"
  // User management
  | "user:manage"
  | "user:deactivate"
  // Tenant / organisation
  | "tenant:configure"
  | "org:manage"
  // Audit
  | "audit:view";


export type PermissionContext = Pick<MutationCtx, "runQuery"> | Pick<QueryCtx, "runQuery">;

/**
 * Require that a user has a specific permission in a tenant.
 * Throws RFC7807 ProblemDetails on denial.
 *
 * @param ctx - Convex ctx (must have runQuery)
 * @param userId - User document ID (string or Id<"users">)
 * @param tenantId - Tenant ID (string or Id<"tenants">)
 * @param permission - Backend permission string (e.g. "booking:approve")
 * @throws Error with type "https://tools.ietf.org/html/rfc7807" on denial
 */
export async function requirePermission(
  ctx: PermissionContext,
  userId: Id<"users"> | string,
  tenantId: Id<"tenants"> | string,
  permission: BackendPermission
): Promise<void> {
  const result = await ctx.runQuery(components.rbac.queries.checkPermission, {
    userId: userId as string,
    tenantId: tenantId as string,
    permission,
  });

  if (!result.hasPermission) {
    const err = new Error(`Permission denied: ${permission}`) as Error & {
      problemDetails?: {
        type: string;
        title: string;
        status: number;
        detail: string;
      };
    };
    err.problemDetails = {
      type: "https://tools.ietf.org/html/rfc7807",
      title: "Permission Denied",
      status: 403,
      detail: `User lacks permission "${permission}" for this tenant.`,
    };
    throw err;
  }
}
