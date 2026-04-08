import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * User Mutation Functions
 * Create, update, invite, and delete users.
 */

// Create a new user
export const create = mutation({
    args: {
        tenantId: v.id("tenants"),
        organizationId: v.optional(v.id("organizations")),
        email: v.string(),
        name: v.optional(v.string()),
        displayName: v.optional(v.string()),
        role: v.string(),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        // Check if email already exists
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existing) {
            throw new Error(`User with email "${args.email}" already exists`);
        }

        const userId = await ctx.db.insert("users", {
            tenantId: args.tenantId,
            organizationId: args.organizationId,
            email: args.email,
            name: args.name,
            displayName: args.displayName,
            role: args.role,
            status: "active",
            metadata: args.metadata || {},
        });

        // Create tenant-user link
        await ctx.db.insert("tenantUsers", {
            tenantId: args.tenantId,
            userId,
            status: "active",
            joinedAt: Date.now(),
        });

        return { id: userId };
    },
});

// Update user
export const update = mutation({
    args: {
        id: v.id("users"),
        name: v.optional(v.string()),
        displayName: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        role: v.optional(v.string()),
        organizationId: v.optional(v.id("organizations")),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const user = await ctx.db.get(id);
        if (!user) {
            throw new Error("User not found");
        }

        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(id, filteredUpdates);

        return { success: true };
    },
});

/** Admin-only: patch any field including email. */
export const adminPatch = mutation({
    args: { id: v.id("users"), patch: v.any() },
    handler: async (ctx, { id, patch }) => {
        const user = await ctx.db.get(id);
        if (!user) throw new Error("User not found");
        await ctx.db.patch(id, patch);
        return { success: true };
    },
});

// Invite user to tenant
export const invite = mutation({
    args: {
        tenantId: v.id("tenants"),
        email: v.string(),
        name: v.optional(v.string()),
        role: v.string(),
        invitedByUserId: v.id("users"),
        organizationId: v.optional(v.id("organizations")),
    },
    handler: async (ctx, args) => {
        // Check if user already exists
        let user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (user) {
            // Check if already in tenant
            const existingLink = await ctx.db
                .query("tenantUsers")
                .withIndex("by_tenant_user", (q) =>
                    q.eq("tenantId", args.tenantId).eq("userId", user!._id)
                )
                .first();

            if (existingLink && existingLink.status !== "removed") {
                throw new Error("User is already a member of this tenant");
            }

            // Re-invite removed user
            if (existingLink) {
                await ctx.db.patch(existingLink._id, {
                    status: "invited",
                    invitedByUserId: args.invitedByUserId,
                    invitedAt: Date.now(),
                });
                return { userId: user._id, isNewUser: false };
            }
        } else {
            // Create new user
            const userId = await ctx.db.insert("users", {
                tenantId: args.tenantId,
                organizationId: args.organizationId,
                email: args.email,
                name: args.name,
                role: args.role,
                status: "invited",
                metadata: {},
            });
            user = await ctx.db.get(userId);
        }

        // Create tenant-user link
        await ctx.db.insert("tenantUsers", {
            tenantId: args.tenantId,
            userId: user!._id,
            status: "invited",
            invitedByUserId: args.invitedByUserId,
            invitedAt: Date.now(),
        });

        return { userId: user!._id, isNewUser: true };
    },
});

// Accept invitation
export const acceptInvitation = mutation({
    args: {
        userId: v.id("users"),
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { userId, tenantId }) => {
        const link = await ctx.db
            .query("tenantUsers")
            .withIndex("by_tenant_user", (q) =>
                q.eq("tenantId", tenantId).eq("userId", userId)
            )
            .first();

        if (!link) {
            throw new Error("Invitation not found");
        }

        if (link.status !== "invited") {
            throw new Error("Invitation is not pending");
        }

        await ctx.db.patch(link._id, {
            status: "active",
            joinedAt: Date.now(),
        });

        await ctx.db.patch(userId, {
            status: "active",
        });

        return { success: true };
    },
});

// Suspend user
export const suspend = mutation({
    args: {
        id: v.id("users"),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, { id, reason }) => {
        const user = await ctx.db.get(id);
        if (!user) {
            throw new Error("User not found");
        }

        await ctx.db.patch(id, {
            status: "suspended",
            metadata: {
                ...((user.metadata as Record<string, unknown>) || {}),
                suspendedAt: Date.now(),
                suspensionReason: reason,
            },
        });

        // Update tenant-user links
        if (user.tenantId) {
            const link = await ctx.db
                .query("tenantUsers")
                .withIndex("by_tenant_user", (q) =>
                    q.eq("tenantId", user.tenantId!).eq("userId", id)
                )
                .first();

            if (link) {
                await ctx.db.patch(link._id, { status: "suspended" });
            }
        }

        return { success: true };
    },
});

// Reactivate user
export const reactivate = mutation({
    args: {
        id: v.id("users"),
    },
    handler: async (ctx, { id }) => {
        const user = await ctx.db.get(id);
        if (!user) {
            throw new Error("User not found");
        }

        if (user.status !== "suspended") {
            throw new Error("User is not suspended");
        }

        await ctx.db.patch(id, {
            status: "active",
        });

        // Update tenant-user links
        if (user.tenantId) {
            const link = await ctx.db
                .query("tenantUsers")
                .withIndex("by_tenant_user", (q) =>
                    q.eq("tenantId", user.tenantId!).eq("userId", id)
                )
                .first();

            if (link) {
                await ctx.db.patch(link._id, { status: "active" });
            }
        }

        return { success: true };
    },
});

// Delete user (soft delete)
export const remove = mutation({
    args: {
        id: v.id("users"),
    },
    handler: async (ctx, { id }) => {
        const user = await ctx.db.get(id);
        if (!user) {
            throw new Error("User not found");
        }

        await ctx.db.patch(id, {
            status: "deleted",
            deletedAt: Date.now(),
            email: `deleted_${Date.now()}_${user.email}`, // Anonymize email
        });

        // Update tenant-user links
        if (user.tenantId) {
            const link = await ctx.db
                .query("tenantUsers")
                .withIndex("by_tenant_user", (q) =>
                    q.eq("tenantId", user.tenantId!).eq("userId", id)
                )
                .first();

            if (link) {
                await ctx.db.patch(link._id, { status: "removed" });
            }
        }

        return { success: true };
    },
});

// Remove user from tenant
export const removeFromTenant = mutation({
    args: {
        userId: v.id("users"),
        tenantId: v.id("tenants"),
    },
    handler: async (ctx, { userId, tenantId }) => {
        const link = await ctx.db
            .query("tenantUsers")
            .withIndex("by_tenant_user", (q) =>
                q.eq("tenantId", tenantId).eq("userId", userId)
            )
            .first();

        if (!link) {
            throw new Error("User is not a member of this tenant");
        }

        await ctx.db.patch(link._id, { status: "removed" });

        return { success: true };
    },
});
