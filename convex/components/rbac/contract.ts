/**
 * RBAC Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "rbac",
    version: "1.0.0",
    category: "platform",
    description: "Role-based access control with role definitions and user-role bindings",

    queries: {
        listRoles: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getRole: {
            args: { id: v.string() },
            returns: v.any(),
        },
        listUserRoles: {
            args: { userId: v.string(), tenantId: v.string() },
            returns: v.array(v.any()),
        },
        checkPermission: {
            args: { userId: v.string(), tenantId: v.string(), permission: v.string() },
            returns: v.any(),
        },
        getUserPermissions: {
            args: { userId: v.string(), tenantId: v.string() },
            returns: v.array(v.string()),
        },
    },

    mutations: {
        createRole: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateRole: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        deleteRole: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        assignRole: {
            args: { userId: v.string(), roleId: v.string(), tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        revokeRole: {
            args: { userId: v.string(), roleId: v.string(), tenantId: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "rbac.role.created",
        "rbac.role.updated",
        "rbac.role.deleted",
        "rbac.role.assigned",
        "rbac.role.revoked",
    ],

    subscribes: [],

    dependencies: {
        core: ["tenants", "users"],
        components: [],
    },
});
