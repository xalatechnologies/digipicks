import { describe, it, expect } from "vitest";
import { components, internal } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("auth/callback upsertUser backoffice provisioning", () => {
    it("creates owner with tenant membership and RBAC permissions for backoffice appId", async () => {
        const t = createDomainTest(["rbac"]);
        await seedTestTenant(t);

        const result = await t.mutation(internal.auth.callback.upsertUser, {
            email: "oauth.backoffice@test.no",
            name: "OAuth Owner",
            provider: "idporten",
            providerId: "idp-123",
            appId: "backoffice",
        });

        expect(result.isNewUser).toBe(true);
        expect((result.user as any)?.role).toBe("owner");
        expect((result.user as any)?.tenantId).toBeDefined();
        const tenantId = (result.user as any)?.tenantId as string;

        const membership = await t.run(async (ctx) => {
            return ctx.db
                .query("tenantUsers")
                .withIndex("by_tenant_user", (q) =>
                    q.eq("tenantId", tenantId as any).eq("userId", (result.user as any)._id)
                )
                .first();
        });
        expect(membership?.status).toBe("active");

        const permission = await (t as any).query(components.rbac.queries.checkPermission, {
            userId: (result.user as any)._id,
            tenantId: tenantId as string,
            permission: "resource:write",
        });
        expect(permission.hasPermission).toBe(true);
    });
});
