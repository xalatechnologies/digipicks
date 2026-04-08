import { query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

/**
 * Get user claims for JWT/session
 */
export const getClaims = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, { userId }) => {
        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const tenantUser = user.tenantId
            ? await ctx.db
                  .query("tenantUsers")
                  .withIndex("by_tenant_user", (q) =>
                      q.eq("tenantId", user.tenantId!).eq("userId", userId)
                  )
                  .first()
            : null;

        const tenant = user.tenantId ? await ctx.db.get(user.tenantId) : null;

        const organization = user.organizationId
            ? await ctx.db.get(user.organizationId)
            : null;

        return {
            sub: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenant_id: tenant?._id,
            tenant_slug: tenant?.slug,
            organization_id: organization?._id,
            organization_slug: organization?.slug,
            status: user.status,
            membership_status: tenantUser?.status,
        };
    },
});

/**
 * Validate session and return user info
 */
export const validateSession = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, { userId }) => {
        const user = await ctx.db.get(userId);
        if (!user) {
            return { valid: false, reason: "User not found" };
        }

        if (user.status !== "active") {
            return { valid: false, reason: `User status: ${user.status}` };
        }

        if (user.deletedAt) {
            return { valid: false, reason: "User deleted" };
        }

        return {
            valid: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    },
});

/**
 * Get full user context given a session token.
 * Returns user data, tenant memberships, roles, and permissions.
 * 
 * Sessions are in the auth component, roles/permissions in the rbac component.
 */
export const getUserContext = query({
    args: {
        sessionToken: v.string(),
    },
    handler: async (ctx, { sessionToken }) => {
        // Validate the session via auth component
        const session = await ctx.runQuery(
            components.auth.queries.validateSession,
            { token: sessionToken }
        );

        if (!session) {
            return null;
        }

        const user = await ctx.db.get(session.userId as any) as any;
        if (!user || user.status !== "active") {
            return null;
        }

        // Get tenant
        const tenant = user.tenantId ? await ctx.db.get(user.tenantId) as any : null;

        // Get organization
        const organization = user.organizationId
            ? await ctx.db.get(user.organizationId) as any
            : null;

        // Get tenant memberships
        const tenantMemberships = await ctx.db
            .query("tenantUsers")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect();

        // Get user permissions from rbac component
        const { permissions } = user.tenantId
            ? await ctx.runQuery(
                  components.rbac.queries.getUserPermissions,
                  {
                      userId: user._id as string,
                      tenantId: user.tenantId as string,
                  }
              )
            : { permissions: [] as string[] };

        // Get user roles from rbac component
        const userRoleAssignments = user.tenantId
            ? await ctx.runQuery(
                  components.rbac.queries.listUserRoles,
                  {
                      userId: user._id as string,
                      tenantId: user.tenantId as string,
                  }
              )
            : [];

        // Role names for grantedRoles
        const grantedRoles = (userRoleAssignments as any[])
            .filter((a: any) => a.role)
            .map((a: any) => a.role.name);

        return {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                displayName: user.displayName,
                role: user.role,
                avatarUrl: user.avatarUrl,
                tenantId: user.tenantId,
                organizationId: user.organizationId,
            },
            tenant: tenant
                ? {
                      id: tenant._id,
                      name: tenant.name,
                      slug: tenant.slug,
                      status: tenant.status,
                  }
                : null,
            organization: organization
                ? {
                      id: organization._id,
                      name: organization.name,
                      slug: organization.slug,
                  }
                : null,
            tenantMemberships: tenantMemberships.map((tm) => ({
                tenantId: tm.tenantId,
                status: tm.status,
            })),
            grantedRoles,
            permissions,
            session: {
                expiresAt: session.expiresAt,
                provider: session.provider,
            },
        };
    },
});
