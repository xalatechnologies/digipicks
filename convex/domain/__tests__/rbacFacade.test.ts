import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/rbacFacade", () => {
    function setup() {
        return createDomainTest(["rbac", "audit"]);
    }

    // =========================================================================
    // ROLE CRUD
    // =========================================================================

    describe("createRole", () => {
        it("creates a role and returns an id", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "editor",
                permissions: ["read", "write"],
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("creates an audit entry on role creation", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id: roleId } = await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "audited-role",
                permissions: ["manage"],
            });

            // Query audit log for the role creation
            const entries = await t.query(components.audit.functions.listForTenant, {
                tenantId: tenantId as string,
            });

            const roleEntry = entries.find(
                (e: any) => e.entityType === "role" && e.entityId === roleId
            );
            expect(roleEntry).toBeDefined();
            expect(roleEntry.action).toBe("created");
        });

        it("rejects duplicate role names within the same tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "admin",
                permissions: ["all"],
            });

            await expect(
                t.mutation(api.domain.rbacFacade.createRole, {
                    tenantId,
                    name: "admin",
                    permissions: ["all"],
                })
            ).rejects.toThrow(/already exists/);
        });
    });

    describe("listRoles", () => {
        it("returns roles for a tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "viewer",
                permissions: ["read"],
            });
            await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "editor",
                permissions: ["read", "write"],
            });

            const roles = await t.query(api.domain.rbacFacade.listRoles, { tenantId });

            expect(roles.length).toBe(2);
            const names = roles.map((r: any) => r.name);
            expect(names).toContain("viewer");
            expect(names).toContain("editor");
        });

        it("returns empty array when no roles exist", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const roles = await t.query(api.domain.rbacFacade.listRoles, { tenantId });
            expect(roles).toEqual([]);
        });
    });

    describe("getRole", () => {
        it("returns a role by id", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "manager",
                description: "Can manage resources",
                permissions: ["read", "write", "manage"],
            });

            const role = await t.query(api.domain.rbacFacade.getRole, { id });

            expect(role.name).toBe("manager");
            expect(role.description).toBe("Can manage resources");
            expect(role.permissions).toEqual(["read", "write", "manage"]);
        });
    });

    describe("updateRole", () => {
        it("updates role name and permissions", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "temp-role",
                permissions: ["read"],
            });

            await t.mutation(api.domain.rbacFacade.updateRole, {
                id,
                name: "updated-role",
                permissions: ["read", "write", "delete"],
            });

            const updated = await t.query(api.domain.rbacFacade.getRole, { id });
            expect(updated.name).toBe("updated-role");
            expect(updated.permissions).toEqual(["read", "write", "delete"]);
        });

        it("rejects updates to system roles", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "system-role",
                permissions: ["all"],
                isSystem: true,
            });

            await expect(
                t.mutation(api.domain.rbacFacade.updateRole, {
                    id,
                    name: "hacked-role",
                })
            ).rejects.toThrow(/system roles/i);
        });
    });

    describe("deleteRole", () => {
        it("deletes a role with no assignments", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "disposable",
                permissions: ["read"],
            });

            const result = await t.mutation(api.domain.rbacFacade.deleteRole, { id });
            expect(result.success).toBe(true);
        });

        it("rejects deletion of system roles", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "protected",
                permissions: ["all"],
                isSystem: true,
            });

            await expect(
                t.mutation(api.domain.rbacFacade.deleteRole, { id })
            ).rejects.toThrow(/system roles/i);
        });
    });

    // =========================================================================
    // USER-ROLE ASSIGNMENTS
    // =========================================================================

    describe("assignRole", () => {
        it("assigns a role to an active user", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: roleId } = await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "contributor",
                permissions: ["read", "write"],
            });

            const result = await t.mutation(api.domain.rbacFacade.assignRole, {
                tenantId,
                userId,
                roleId,
            });

            expect(result.id).toBeDefined();
        });

        it("rejects assigning a role to an inactive user", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            // Create an inactive user
            const inactiveUserId = await t.run(async (ctx) => {
                return ctx.db.insert("users", {
                    email: "inactive@test.no",
                    name: "Inactive User",
                    role: "user",
                    status: "inactive",
                    tenantId,
                    metadata: {},
                });
            });

            const { id: roleId } = await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "role-for-inactive",
                permissions: ["read"],
            });

            await expect(
                t.mutation(api.domain.rbacFacade.assignRole, {
                    tenantId,
                    userId: inactiveUserId,
                    roleId,
                })
            ).rejects.toThrow(/not found or inactive/i);
        });
    });

    describe("revokeRole", () => {
        it("revokes an assigned role", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: roleId } = await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "revocable",
                permissions: ["read"],
            });

            await t.mutation(api.domain.rbacFacade.assignRole, {
                tenantId,
                userId,
                roleId,
            });

            const result = await t.mutation(api.domain.rbacFacade.revokeRole, {
                tenantId,
                userId,
                roleId,
            });

            expect(result.success).toBe(true);
        });
    });

    // =========================================================================
    // PERMISSION CHECKS
    // =========================================================================

    describe("checkPermission", () => {
        it("returns true when user has the permission via a role", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: roleId } = await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "writer",
                permissions: ["read", "write"],
            });

            await t.mutation(api.domain.rbacFacade.assignRole, {
                tenantId,
                userId,
                roleId,
            });

            const result = await t.query(api.domain.rbacFacade.checkPermission, {
                tenantId,
                userId,
                permission: "write",
            });

            expect(result.hasPermission).toBe(true);
        });

        it("returns false when user lacks the permission", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const result = await t.query(api.domain.rbacFacade.checkPermission, {
                tenantId,
                userId,
                permission: "admin",
            });

            expect(result.hasPermission).toBe(false);
        });
    });

    describe("getUserPermissions", () => {
        it("returns merged permissions from all assigned roles", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: roleA } = await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "roleA",
                permissions: ["read", "write"],
            });
            const { id: roleB } = await t.mutation(api.domain.rbacFacade.createRole, {
                tenantId,
                name: "roleB",
                permissions: ["write", "delete"],
            });

            await t.mutation(api.domain.rbacFacade.assignRole, { tenantId, userId, roleId: roleA });
            await t.mutation(api.domain.rbacFacade.assignRole, { tenantId, userId, roleId: roleB });

            const result = await t.query(api.domain.rbacFacade.getUserPermissions, {
                tenantId,
                userId,
            });

            expect(result.permissions).toContain("read");
            expect(result.permissions).toContain("write");
            expect(result.permissions).toContain("delete");
            // "write" appears in both roles but should be deduplicated
            expect(result.permissions.length).toBe(3);
        });
    });
});
