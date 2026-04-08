import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant, seedSecondTenant, seedResource, grantPermission } from "./testHelper.test-util";

describe("domain/resources", () => {
    function setup() {
        return createDomainTest([
            "resources", "reviews", "externalReviews", "audit", "pricing", "addons", "rbac",
        ]);
    }

    // =========================================================================
    // QUERIES — list
    // =========================================================================

    describe("list", () => {
        it("returns resources for a tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedResource(t, tenantId as string, { name: "Festsalen", slug: "festsalen" });
            await seedResource(t, tenantId as string, { name: "Elvesalen", slug: "elvesalen" });

            const results = await t.query(api.domain.resources.list, { tenantId });

            expect(results.length).toBe(2);
        });

        it("filters by categoryKey", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedResource(t, tenantId as string, {
                name: "Festsalen", slug: "festsalen", categoryKey: "LOKALER",
            });
            await seedResource(t, tenantId as string, {
                name: "Padelbane 1", slug: "padelbane-1", categoryKey: "SPORT",
            });

            const lokaler = await t.query(api.domain.resources.list, {
                tenantId,
                categoryKey: "LOKALER",
            });

            expect(lokaler.length).toBe(1);
            expect(lokaler[0].name).toBe("Festsalen");
        });

        it("filters by status", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedResource(t, tenantId as string, {
                name: "Active", slug: "active", status: "active",
            });
            await seedResource(t, tenantId as string, {
                name: "Draft", slug: "draft", status: "draft",
            });

            const active = await t.query(api.domain.resources.list, {
                tenantId,
                status: "active",
            });

            expect(active.length).toBe(1);
            expect(active[0].name).toBe("Active");
        });

        it("enriches resources with reviewStats", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            const results = await t.query(api.domain.resources.list, { tenantId });

            expect(results.length).toBe(1);
            expect(results[0].reviewStats).toBeDefined();
            expect(results[0].reviewStats.total).toBe(0);
            expect(results[0].reviewStats.averageRating).toBe(0);
        });

        it("does not return resources from another tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const other = await seedSecondTenant(t);

            await seedResource(t, tenantId as string, { name: "Mine", slug: "mine" });
            await seedResource(t, other.tenantId as string, { name: "Theirs", slug: "theirs" });

            const results = await t.query(api.domain.resources.list, { tenantId });

            expect(results.length).toBe(1);
            expect(results[0].name).toBe("Mine");
        });

        it("respects limit", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            for (let i = 0; i < 5; i++) {
                await seedResource(t, tenantId as string, { name: `R${i}`, slug: `r${i}` });
            }

            const results = await t.query(api.domain.resources.list, { tenantId, limit: 2 });

            expect(results.length).toBe(2);
        });
    });

    // =========================================================================
    // QUERIES — listAll
    // =========================================================================

    describe("listAll", () => {
        it("returns all non-deleted resources for tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedResource(t, tenantId as string, { name: "Draft", slug: "draft", status: "draft" });
            await seedResource(t, tenantId as string, { name: "Active", slug: "active", status: "active" });

            const results = await t.query(api.domain.resources.listAll, { tenantId });

            expect(results.length).toBe(2);
        });

        it("excludes deleted resources", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, { status: "draft" });
            // Soft-delete via component (draft -> deleted is valid)
            await t.mutation(components.resources.mutations.remove, { id: resource.id as any });

            const results = await t.query(api.domain.resources.listAll, { tenantId });

            expect(results.length).toBe(0);
        });
    });

    // =========================================================================
    // QUERIES — get
    // =========================================================================

    describe("get", () => {
        it("returns a resource by ID with enriched data", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, {
                name: "Festsalen", slug: "festsalen",
            });

            const result = await t.query(api.domain.resources.get, { id: resource.id });

            expect(result).toBeDefined();
            expect(result.name).toBe("Festsalen");
            expect(result.reviewStats).toBeDefined();
            expect(result.reviewStats.total).toBe(0);
            expect(result.reviewStats.averageRating).toBe(0);
            expect(result.addons).toBeDefined();
            expect(result.pricing).toBeDefined();
        });

        it("enriches with review stats from approved reviews", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            // Create and approve a review
            await t.mutation(components.reviews.functions.create, {
                tenantId: tenantId as string,
                resourceId: resource.id,
                userId: userId as string,
                rating: 4,
            });
            // Approve it via component
            const reviews = await t.query(components.reviews.functions.list, {
                tenantId: tenantId as string,
            });
            if (reviews.length > 0) {
                await t.mutation(components.reviews.functions.moderate, {
                    id: (reviews[0] as any)._id,
                    status: "approved",
                    moderatedBy: adminId as string,
                });
            }

            const result = await t.query(api.domain.resources.get, { id: resource.id });

            expect(result.reviewStats.total).toBe(1);
            expect(result.reviewStats.averageRating).toBe(4);
        });
    });

    // =========================================================================
    // QUERIES — getBySlug
    // =========================================================================

    describe("getBySlug", () => {
        it("returns resource by slug", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedResource(t, tenantId as string, { name: "Festsalen", slug: "festsalen" });

            const result = await t.query(api.domain.resources.getBySlug, {
                tenantId,
                slug: "festsalen",
            });

            expect(result).toBeDefined();
            expect(result.name).toBe("Festsalen");
            expect(result.reviewStats).toBeDefined();
        });

        it("returns null for non-existent slug", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.query(api.domain.resources.getBySlug, {
                tenantId,
                slug: "non-existent",
            });

            expect(result).toBeNull();
        });
    });

    // =========================================================================
    // QUERIES — getBySlugPublic
    // =========================================================================

    describe("getBySlugPublic", () => {
        it("returns published resource by slug", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, {
                name: "Public Venue", slug: "public-venue", status: "draft",
            });
            // Publish it
            await t.mutation(components.resources.mutations.publish, { id: resource.id as any });

            const result = await t.query(api.domain.resources.getBySlugPublic, {
                slug: "public-venue",
                tenantId: tenantId as string,
            });

            expect(result).toBeDefined();
            expect(result.name).toBe("Public Venue");
            expect(result.reviewStats).toBeDefined();
        });

        it("returns null for unpublished resource", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            await seedResource(t, tenantId as string, {
                name: "Draft Venue", slug: "draft-venue", status: "draft",
            });

            const result = await t.query(api.domain.resources.getBySlugPublic, {
                slug: "draft-venue",
                tenantId: tenantId as string,
            });

            expect(result).toBeNull();
        });
    });

    // =========================================================================
    // MUTATIONS — create
    // =========================================================================

    describe("create", () => {
        it("creates a resource with required fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.resources.create, {
                tenantId,
                name: "Hovedscenen",
                slug: "hovedscenen",
                categoryKey: "LOKALER",
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("creates a resource with optional fields", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.resources.create, {
                tenantId,
                name: "Jazz Concert",
                slug: "jazz-concert",
                categoryKey: "ARRANGEMENTER",
                description: "A night of jazz",
                capacity: 200,
                subtitle: "With the Oslo Jazz Quartet",
                eventDate: "2026-03-15",
                startTime: "19:00",
                endTime: "21:30",
            });

            expect(result.id).toBeDefined();

            // Verify via get
            const resource = await t.query(api.domain.resources.get, { id: result.id });
            expect(resource.name).toBe("Jazz Concert");
            expect(resource.subtitle).toBe("With the Oslo Jazz Quartet");
            expect(resource.capacity).toBe(200);
        });

        it("creates an audit entry", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.resources.create, {
                tenantId,
                name: "Audited Resource",
                slug: "audited-resource",
                categoryKey: "LOKALER",
            });

            const auditEntries = await t.query(
                components.audit.functions.listForTenant,
                { tenantId: tenantId as string }
            );

            const resourceAudit = auditEntries.find(
                (e: any) => e.entityType === "resource" && e.entityId === result.id
            );
            expect(resourceAudit).toBeDefined();
            expect(resourceAudit.action).toBe("created");
        });

        it("defaults status to draft", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.resources.create, {
                tenantId,
                name: "New Resource",
                slug: "new-resource",
                categoryKey: "LOKALER",
            });

            const resource = await t.query(api.domain.resources.get, { id: result.id });
            expect(resource.status).toBe("draft");
        });
    });

    // =========================================================================
    // MUTATIONS — update
    // =========================================================================

    describe("update", () => {
        it("updates resource name", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, {
                name: "Old Name", slug: "old-name",
            });

            await t.mutation(api.domain.resources.update, {
                id: resource.id,
                name: "New Name",
            });

            const updated = await t.query(api.domain.resources.get, { id: resource.id });
            expect(updated.name).toBe("New Name");
        });

        it("updates resource description", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await t.mutation(api.domain.resources.update, {
                id: resource.id,
                description: "Updated description",
            });

            const updated = await t.query(api.domain.resources.get, { id: resource.id });
            expect(updated.description).toBe("Updated description");
        });

        it("creates an audit entry on update", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string);

            await t.mutation(api.domain.resources.update, {
                id: resource.id,
                name: "Updated Name",
            });

            const auditEntries = await t.query(
                components.audit.functions.listForTenant,
                { tenantId: tenantId as string }
            );
            const updateAudit = auditEntries.find(
                (e: any) => e.entityType === "resource" && e.action === "updated"
            );
            expect(updateAudit).toBeDefined();
        });
    });

    // =========================================================================
    // MUTATIONS — publish / unpublish
    // =========================================================================

    describe("publish", () => {
        it("publishes a draft resource", async () => {
            const t = setup();
            const { tenantId, adminId } = await seedTestTenant(t);
            await grantPermission(t, tenantId as string, adminId as string, "resource:publish");
            const resource = await seedResource(t, tenantId as string, { status: "draft" });

            await t.mutation(api.domain.resources.publish, {
                id: resource.id,
                publishedBy: adminId,
            });

            const result = await t.query(api.domain.resources.get, { id: resource.id });
            expect(result.status).toBe("published");
        });

        it("creates an audit entry for publish", async () => {
            const t = setup();
            const { tenantId, adminId } = await seedTestTenant(t);
            await grantPermission(t, tenantId as string, adminId as string, "resource:publish");
            const resource = await seedResource(t, tenantId as string, { status: "draft" });

            await t.mutation(api.domain.resources.publish, {
                id: resource.id,
                publishedBy: adminId,
            });

            const auditEntries = await t.query(
                components.audit.functions.listForTenant,
                { tenantId: tenantId as string }
            );
            const publishAudit = auditEntries.find(
                (e: any) => e.action === "published" && e.entityId === resource.id
            );
            expect(publishAudit).toBeDefined();
        });

        it("rejects publish without permission", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, { status: "draft" });

            await expect(
                t.mutation(api.domain.resources.publish, {
                    id: resource.id,
                    publishedBy: userId,
                })
            ).rejects.toThrow("Permission denied");
        });
    });

    describe("unpublish", () => {
        it("unpublishes a published resource", async () => {
            const t = setup();
            const { tenantId, adminId } = await seedTestTenant(t);
            await grantPermission(t, tenantId as string, adminId as string, "resource:publish");
            const resource = await seedResource(t, tenantId as string, { status: "draft" });
            // First publish
            await t.mutation(components.resources.mutations.publish, { id: resource.id as any });

            await t.mutation(api.domain.resources.unpublish, {
                id: resource.id,
                unpublishedBy: adminId,
            });

            const result = await t.query(api.domain.resources.get, { id: resource.id });
            expect(result.status).toBe("draft");
        });
    });

    // =========================================================================
    // MUTATIONS — archive / restore
    // =========================================================================

    describe("archive", () => {
        it("archives an active resource", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, { status: "draft" });
            // Publish first, then archive (draft -> published -> archived)
            await t.mutation(components.resources.mutations.publish, { id: resource.id as any });

            await t.mutation(api.domain.resources.archive, { id: resource.id });

            const result = await t.query(api.domain.resources.get, { id: resource.id });
            expect(result.status).toBe("archived");
        });

        it("archives a draft resource", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, { status: "draft" });

            await t.mutation(api.domain.resources.archive, { id: resource.id });

            const result = await t.query(api.domain.resources.get, { id: resource.id });
            expect(result.status).toBe("archived");
        });
    });

    describe("restore", () => {
        it("restores an archived resource to draft", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, { status: "draft" });
            // Archive first
            await t.mutation(components.resources.mutations.archive, { id: resource.id as any });

            await t.mutation(api.domain.resources.restore, { id: resource.id });

            const result = await t.query(api.domain.resources.get, { id: resource.id });
            expect(result.status).toBe("draft");
        });
    });

    // =========================================================================
    // MUTATIONS — remove
    // =========================================================================

    describe("remove", () => {
        it("soft deletes a resource with permission", async () => {
            const t = setup();
            const { tenantId, adminId } = await seedTestTenant(t);
            await grantPermission(t, tenantId as string, adminId as string, "resource:delete");
            const resource = await seedResource(t, tenantId as string, { status: "published" });

            await t.mutation(api.domain.resources.remove, {
                id: resource.id,
                removedBy: adminId,
            });

            const result = await t.query(api.domain.resources.get, { id: resource.id });
            expect(result.status).toBe("deleted");
        });

        it("rejects remove without permission", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, { status: "published" });

            await expect(
                t.mutation(api.domain.resources.remove, {
                    id: resource.id,
                    removedBy: userId,
                })
            ).rejects.toThrow("Permission denied");
        });

        it("creates an audit entry on remove", async () => {
            const t = setup();
            const { tenantId, adminId } = await seedTestTenant(t);
            await grantPermission(t, tenantId as string, adminId as string, "resource:delete");
            const resource = await seedResource(t, tenantId as string, { status: "published" });

            await t.mutation(api.domain.resources.remove, {
                id: resource.id,
                removedBy: adminId,
            });

            const auditEntries = await t.query(
                components.audit.functions.listForTenant,
                { tenantId: tenantId as string }
            );
            const removeAudit = auditEntries.find(
                (e: any) => e.action === "removed" && e.entityId === resource.id
            );
            expect(removeAudit).toBeDefined();
        });

        it("rejects remove by inactive user", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, { status: "published" });

            // Create an inactive user
            const inactiveUserId = await t.run(async (ctx) => {
                return ctx.db.insert("users", {
                    email: "inactive@test.no",
                    name: "Inactive",
                    role: "user",
                    status: "suspended",
                    tenantId,
                    metadata: {},
                });
            });

            await expect(
                t.mutation(api.domain.resources.remove, {
                    id: resource.id,
                    removedBy: inactiveUserId,
                })
            ).rejects.toThrow("User not found or inactive");
        });
    });

    // =========================================================================
    // MUTATIONS — clone
    // =========================================================================

    describe("clone", () => {
        it("clones a resource with (Copy) suffix", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, {
                name: "Festsalen", slug: "festsalen",
            });

            const cloned = await t.mutation(api.domain.resources.clone, { id: resource.id });

            expect(cloned.id).toBeDefined();
            expect(cloned.slug).toContain("festsalen-copy");

            const clonedResource = await t.query(api.domain.resources.get, { id: cloned.id });
            expect(clonedResource.name).toBe("Festsalen (Copy)");
            expect(clonedResource.status).toBe("draft");
        });

        it("creates a unique slug when cloning multiple times", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const resource = await seedResource(t, tenantId as string, {
                name: "Salen", slug: "salen",
            });

            const clone1 = await t.mutation(api.domain.resources.clone, { id: resource.id });
            const clone2 = await t.mutation(api.domain.resources.clone, { id: resource.id });

            expect(clone1.slug).not.toBe(clone2.slug);
        });
    });
});
