/**
 * RBAC Component — Comprehensive convex-test Tests
 *
 * Tests the real Convex mutation and query functions in:
 *   components/rbac/mutations.ts   (createRole, updateRole, deleteRole, assignRole, revokeRole)
 *   components/rbac/queries.ts     (getUserPermissions, hasPermission, listRoles, getRole)
 *
 * Uses convex-test with the real schema — schema validators + duplicate detection all run.
 *
 * Run: npx vitest --config convex/vitest.config.ts components/rbac/rbac.test.ts
 */

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-001";
const TENANT_B = "tenant-002";
const USER = "user-001";
const USER_B = "user-002";

// ---------------------------------------------------------------------------
// createRole
// ---------------------------------------------------------------------------

describe("rbac/mutations — createRole", () => {
    it("creates a role with specified permissions", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT,
            name: "Manager",
            permissions: ["booking:write", "booking:delete", "resource:read"],
        });

        const role = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(role?.name).toBe("Manager");
        expect(role?.permissions).toEqual(["booking:write", "booking:delete", "resource:read"]);
        expect(role?.isSystem).toBe(false);
        expect(role?.isDefault).toBe(false);
    });

    it("throws when creating a duplicate role name in the same tenant", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.mutations.createRole, {
            tenantId: TENANT,
            name: "Admin",
            permissions: [],
        });

        await expect(
            t.mutation(api.mutations.createRole, {
                tenantId: TENANT,
                name: "Admin",
                permissions: ["booking:read"],
            })
        ).rejects.toThrow("already exists");
    });

    it("allows the same role name in different tenants", async () => {
        const t = convexTest(schema, modules);

        const { id: id1 } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT,
            name: "Staff",
            permissions: [],
        });
        const { id: id2 } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT_B,
            name: "Staff",
            permissions: [],
        });

        expect(id1).not.toBe(id2);
    });

    it("sets isSystem flag correctly", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT,
            name: "SysAdmin",
            permissions: ["*"],
            isSystem: true,
        });

        const role = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(role?.isSystem).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// updateRole
// ---------------------------------------------------------------------------

describe("rbac/mutations — updateRole", () => {
    it("updates role permissions", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT,
            name: "Editor",
            permissions: ["booking:read"],
        });

        await t.mutation(api.mutations.updateRole, {
            id: id as any,
            permissions: ["booking:read", "booking:write"],
        });

        const role = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(role?.permissions).toContain("booking:write");
    });

    it("throws when updating a system role", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT,
            name: "SuperSysRole",
            permissions: ["*"],
            isSystem: true,
        });

        await expect(
            t.mutation(api.mutations.updateRole, { id: id as any, name: "Renamed" })
        ).rejects.toThrow("Cannot modify system roles");
    });

    it("throws when renaming to a name that already exists in the tenant", async () => {
        const t = convexTest(schema, modules);

        const { id: id1 } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "RoleOne", permissions: [],
        });
        await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "RoleTwo", permissions: [],
        });

        await expect(
            t.mutation(api.mutations.updateRole, { id: id1 as any, name: "RoleTwo" })
        ).rejects.toThrow("already exists");
    });

    it("throws when role does not exist", async () => {
        const t = convexTest(schema, modules);

        const staleId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("roles", {
                tenantId: TENANT, name: "Ghost", permissions: [], isDefault: false, isSystem: false,
            });
            await ctx.db.delete(id);
            return id;
        });

        await expect(
            t.mutation(api.mutations.updateRole, { id: staleId, name: "X" })
        ).rejects.toThrow("Role not found");
    });
});

// ---------------------------------------------------------------------------
// deleteRole
// ---------------------------------------------------------------------------

describe("rbac/mutations — deleteRole", () => {
    it("deletes a role with no active assignments", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "ToDelete", permissions: [],
        });

        await t.mutation(api.mutations.deleteRole, { id: id as any });

        const gone = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(gone).toBeNull();
    });

    it("throws when deleting a system role", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "SysRole2", permissions: [], isSystem: true,
        });

        await expect(
            t.mutation(api.mutations.deleteRole, { id: id as any })
        ).rejects.toThrow("Cannot delete system roles");
    });

    it("throws when role has active user assignments", async () => {
        const t = convexTest(schema, modules);

        const { id: roleId } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "RoleWithUsers", permissions: [],
        });

        await t.mutation(api.mutations.assignRole, {
            userId: USER,
            roleId: roleId as any,
            tenantId: TENANT,
        });

        await expect(
            t.mutation(api.mutations.deleteRole, { id: roleId as any })
        ).rejects.toThrow("Cannot delete role with active user assignments");
    });
});

// ---------------------------------------------------------------------------
// assignRole / revokeRole
// ---------------------------------------------------------------------------

describe("rbac/mutations — assignRole", () => {
    it("creates a user-role assignment", async () => {
        const t = convexTest(schema, modules);

        const { id: roleId } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "Viewer", permissions: ["booking:read"],
        });

        const { id: assignmentId } = await t.mutation(api.mutations.assignRole, {
            userId: USER,
            roleId: roleId as any,
            tenantId: TENANT,
        });

        const assignment = await t.run(async (ctx) => ctx.db.get(assignmentId as any)) as any;
        expect(assignment?.userId).toBe(USER);
        expect(assignment?.roleId).toBe(roleId);
    });

    it("throws when assigning the same role twice", async () => {
        const t = convexTest(schema, modules);

        const { id: roleId } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "DupRole", permissions: [],
        });

        await t.mutation(api.mutations.assignRole, {
            userId: USER, roleId: roleId as any, tenantId: TENANT,
        });

        await expect(
            t.mutation(api.mutations.assignRole, {
                userId: USER, roleId: roleId as any, tenantId: TENANT,
            })
        ).rejects.toThrow("already has this role");
    });

    it("throws when role does not exist", async () => {
        const t = convexTest(schema, modules);

        const staleId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("roles", {
                tenantId: TENANT, name: "Ghost2", permissions: [], isDefault: false, isSystem: false,
            });
            await ctx.db.delete(id);
            return id;
        });

        await expect(
            t.mutation(api.mutations.assignRole, {
                userId: USER, roleId: staleId, tenantId: TENANT,
            })
        ).rejects.toThrow("Role not found");
    });
});

describe("rbac/mutations — revokeRole", () => {
    it("removes a user-role assignment", async () => {
        const t = convexTest(schema, modules);

        const { id: roleId } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "ToRevoke", permissions: [],
        });

        await t.mutation(api.mutations.assignRole, {
            userId: USER, roleId: roleId as any, tenantId: TENANT,
        });

        await t.mutation(api.mutations.revokeRole, {
            userId: USER, roleId: roleId as any, tenantId: TENANT,
        });

        const remaining = await t.run(async (ctx) =>
            ctx.db.query("userRoles")
                .withIndex("by_tenant_user", (q) => q.eq("tenantId", TENANT).eq("userId", USER))
                .collect()
        );
        expect(remaining.some((r: any) => r.roleId === roleId)).toBe(false);
    });

    it("throws when user does not have the role", async () => {
        const t = convexTest(schema, modules);

        const { id: roleId } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "NeverAssigned", permissions: [],
        });

        await expect(
            t.mutation(api.mutations.revokeRole, {
                userId: USER, roleId: roleId as any, tenantId: TENANT,
            })
        ).rejects.toThrow("does not have this role");
    });
});

// ---------------------------------------------------------------------------
// Index correctness
// ---------------------------------------------------------------------------

describe("rbac schema — index correctness", () => {
    it("by_tenant index returns only roles for the given tenant", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.mutations.createRole, { tenantId: TENANT, name: "TenantARole", permissions: [] });
        await t.mutation(api.mutations.createRole, { tenantId: TENANT_B, name: "TenantBRole", permissions: [] });

        const result = await t.run(async (ctx) =>
            ctx.db.query("roles").withIndex("by_tenant", (q) => q.eq("tenantId", TENANT)).collect()
        );

        result.forEach((r: any) => expect(r.tenantId).toBe(TENANT));
    });

    it("by_role index on userRoles returns all assignments for a role", async () => {
        const t = convexTest(schema, modules);

        const { id: roleId } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "SharedRole", permissions: [],
        });

        await t.mutation(api.mutations.assignRole, { userId: USER, roleId: roleId as any, tenantId: TENANT });
        await t.mutation(api.mutations.assignRole, { userId: USER_B, roleId: roleId as any, tenantId: TENANT });

        const assignments = await t.run(async (ctx) =>
            ctx.db.query("userRoles").withIndex("by_role", (q) => q.eq("roleId", roleId as any)).collect()
        );

        expect(assignments.length).toBeGreaterThanOrEqual(2);
    });

    it("by_tenant_user index allows querying user roles in a given tenant", async () => {
        const t = convexTest(schema, modules);

        const { id: r1 } = await t.mutation(api.mutations.createRole, { tenantId: TENANT, name: "R1", permissions: [] });
        const { id: r2 } = await t.mutation(api.mutations.createRole, { tenantId: TENANT, name: "R2", permissions: [] });

        await t.mutation(api.mutations.assignRole, { userId: USER, roleId: r1 as any, tenantId: TENANT });
        await t.mutation(api.mutations.assignRole, { userId: USER, roleId: r2 as any, tenantId: TENANT });

        const userAssignments = await t.run(async (ctx) =>
            ctx.db.query("userRoles")
                .withIndex("by_tenant_user", (q) => q.eq("tenantId", TENANT).eq("userId", USER))
                .collect()
        );

        expect(userAssignments.length).toBeGreaterThanOrEqual(2);
    });
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

describe("rbac/queries — listRoles", () => {
    it("returns all roles for a tenant", async () => {
        const t = convexTest(schema, modules);

        await t.mutation(api.mutations.createRole, { tenantId: TENANT, name: "R1", permissions: ["a"] });
        await t.mutation(api.mutations.createRole, { tenantId: TENANT, name: "R2", permissions: ["b"] });
        await t.mutation(api.mutations.createRole, { tenantId: TENANT_B, name: "R3", permissions: [] });

        const roles = await t.query(api.queries.listRoles, { tenantId: TENANT });
        expect(roles.length).toBe(2);
        roles.forEach((r: any) => expect(r.tenantId).toBe(TENANT));
    });
});

describe("rbac/queries — getRole", () => {
    it("returns a role by id", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "Fetched", permissions: ["x"],
        });

        const role = await t.query(api.queries.getRole, { id: id as any });
        expect(role.name).toBe("Fetched");
        expect(role.permissions).toEqual(["x"]);
    });

    it("throws when role does not exist", async () => {
        const t = convexTest(schema, modules);

        const staleId = await t.run(async (ctx) => {
            const id = await ctx.db.insert("roles", {
                tenantId: TENANT, name: "Ghost3", permissions: [], isDefault: false, isSystem: false,
            });
            await ctx.db.delete(id);
            return id;
        });

        await expect(
            t.query(api.queries.getRole, { id: staleId })
        ).rejects.toThrow("not found");
    });
});

describe("rbac/queries — listUserRoles", () => {
    it("returns roles assigned to a user", async () => {
        const t = convexTest(schema, modules);

        const { id: r1 } = await t.mutation(api.mutations.createRole, { tenantId: TENANT, name: "RoleA", permissions: ["a"] });
        const { id: r2 } = await t.mutation(api.mutations.createRole, { tenantId: TENANT, name: "RoleB", permissions: ["b"] });
        await t.mutation(api.mutations.assignRole, { userId: USER, roleId: r1 as any, tenantId: TENANT });
        await t.mutation(api.mutations.assignRole, { userId: USER, roleId: r2 as any, tenantId: TENANT });

        const result = await t.query(api.queries.listUserRoles, { userId: USER });
        expect(result.length).toBe(2);
    });

    it("returns roles for a user in a specific tenant", async () => {
        const t = convexTest(schema, modules);

        const { id: r1 } = await t.mutation(api.mutations.createRole, { tenantId: TENANT, name: "RoleX", permissions: [] });
        const { id: r2 } = await t.mutation(api.mutations.createRole, { tenantId: TENANT_B, name: "RoleY", permissions: [] });
        await t.mutation(api.mutations.assignRole, { userId: USER, roleId: r1 as any, tenantId: TENANT });
        await t.mutation(api.mutations.assignRole, { userId: USER, roleId: r2 as any, tenantId: TENANT_B });

        const result = await t.query(api.queries.listUserRoles, { tenantId: TENANT });
        expect(result.length).toBe(1);
    });
});

describe("rbac/queries — checkPermission", () => {
    it("returns true when user has the permission", async () => {
        const t = convexTest(schema, modules);

        const { id: roleId } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "Writer", permissions: ["booking:read", "booking:write"],
        });
        await t.mutation(api.mutations.assignRole, { userId: USER, roleId: roleId as any, tenantId: TENANT });

        const result = await t.query(api.queries.checkPermission, {
            userId: USER, tenantId: TENANT, permission: "booking:write",
        });
        expect(result.hasPermission).toBe(true);
    });

    it("returns false when user lacks the permission", async () => {
        const t = convexTest(schema, modules);

        const { id: roleId } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "Reader", permissions: ["booking:read"],
        });
        await t.mutation(api.mutations.assignRole, { userId: USER, roleId: roleId as any, tenantId: TENANT });

        const result = await t.query(api.queries.checkPermission, {
            userId: USER, tenantId: TENANT, permission: "booking:delete",
        });
        expect(result.hasPermission).toBe(false);
    });

    it("returns false when user has no roles", async () => {
        const t = convexTest(schema, modules);

        const result = await t.query(api.queries.checkPermission, {
            userId: "no-roles-user", tenantId: TENANT, permission: "anything",
        });
        expect(result.hasPermission).toBe(false);
    });
});

describe("rbac/queries — getUserPermissions", () => {
    it("returns all permissions across multiple roles", async () => {
        const t = convexTest(schema, modules);

        const { id: r1 } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "RoleP1", permissions: ["booking:read", "booking:write"],
        });
        const { id: r2 } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "RoleP2", permissions: ["resource:read", "booking:read"],
        });
        await t.mutation(api.mutations.assignRole, { userId: USER, roleId: r1 as any, tenantId: TENANT });
        await t.mutation(api.mutations.assignRole, { userId: USER, roleId: r2 as any, tenantId: TENANT });

        const result = await t.query(api.queries.getUserPermissions, {
            userId: USER, tenantId: TENANT,
        });
        expect(result.permissions).toContain("booking:read");
        expect(result.permissions).toContain("booking:write");
        expect(result.permissions).toContain("resource:read");
    });

    it("returns empty permissions for user with no roles", async () => {
        const t = convexTest(schema, modules);

        const result = await t.query(api.queries.getUserPermissions, {
            userId: "no-roles-user", tenantId: TENANT,
        });
        expect(result.permissions).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// Import functions
// ---------------------------------------------------------------------------

describe("rbac/import — importRole", () => {
    it("imports a role directly into the table", async () => {
        const t = convexTest(schema, modules);

        const { id } = await t.mutation(api.import.importRole, {
            tenantId: TENANT, name: "Imported", permissions: ["x", "y"],
            isDefault: false, isSystem: true,
        });

        const role = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(role?.name).toBe("Imported");
        expect(role?.isSystem).toBe(true);
    });
});

describe("rbac/import — importUserRole", () => {
    it("imports a user-role assignment with explicit timestamp", async () => {
        const t = convexTest(schema, modules);

        const { id: roleId } = await t.mutation(api.mutations.createRole, {
            tenantId: TENANT, name: "ImportTarget", permissions: [],
        });

        const { id } = await t.mutation(api.import.importUserRole, {
            userId: USER, roleId: roleId as any, tenantId: TENANT, assignedAt: 1000000,
        });

        const assignment = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(assignment?.userId).toBe(USER);
        expect(assignment?.assignedAt).toBe(1000000);
    });
});
