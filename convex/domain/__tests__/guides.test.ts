import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/guides", () => {
    function setup() {
        return createDomainTest(["guides"]);
    }

    async function seedGuide(
        t: ReturnType<typeof setup>,
        tenantId: string,
        overrides: Partial<{
            title: string;
            slug: string;
            description: string;
            category: string;
            isPublished: boolean;
        }> = {}
    ) {
        return t.mutation(components.guides.import.importGuide, {
            tenantId,
            title: overrides.title ?? "Test Guide",
            slug: overrides.slug ?? "test-guide",
            description: overrides.description ?? "A test guide",
            isPublished: overrides.isPublished ?? true,
            category: overrides.category,
        });
    }

    describe("listGuides", () => {
        it("returns guides for a tenant", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            await seedGuide(t, tenantId as string, {
                title: "Getting Started",
                slug: "getting-started",
                category: "onboarding",
            });

            const guides = await t.query(api.domain.guides.listGuides, {
                tenantId: tenantId as string,
            });

            expect(guides.length).toBe(1);
            expect(guides[0].title).toBe("Getting Started");
        });

        it("filters by category", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            await seedGuide(t, tid, {
                title: "Guide A",
                slug: "guide-a",
                category: "booking",
            });
            await seedGuide(t, tid, {
                title: "Guide B",
                slug: "guide-b",
                category: "admin",
            });

            const guides = await t.query(api.domain.guides.listGuides, {
                tenantId: tid,
                category: "booking",
            });

            expect(guides.length).toBe(1);
            expect(guides[0].title).toBe("Guide A");
        });

        it("filters by published status", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            await seedGuide(t, tid, {
                title: "Published",
                slug: "published",
                isPublished: true,
            });
            await seedGuide(t, tid, {
                title: "Draft",
                slug: "draft",
                isPublished: false,
            });

            const published = await t.query(api.domain.guides.listGuides, {
                tenantId: tid,
                isPublished: true,
            });

            expect(published.length).toBe(1);
            expect(published[0].title).toBe("Published");
        });
    });

    describe("getGuide", () => {
        it("returns a guide by slug", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            await seedGuide(t, tid, {
                title: "My Guide",
                slug: "my-guide",
                description: "A great guide",
            });

            const guide = await t.query(api.domain.guides.getGuide, {
                tenantId: tid,
                slug: "my-guide",
            });

            expect(guide).toBeDefined();
            expect(guide.title).toBe("My Guide");
        });
    });

    describe("getArticle", () => {
        it("returns an article within a guide", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            const { id: guideId } = await seedGuide(t, tid, {
                title: "Test Guide",
                slug: "test-guide",
            });

            const { id: sectionId } = await t.mutation(
                components.guides.import.importSection,
                {
                    tenantId: tid,
                    guideId,
                    title: "Section 1",
                    order: 1,
                    isPublished: true,
                }
            );

            await t.mutation(components.guides.import.importArticle, {
                tenantId: tid,
                guideId,
                sectionId,
                title: "First Article",
                slug: "first-article",
                content: "Article content here",
                order: 1,
                isPublished: true,
            });

            const article = await t.query(api.domain.guides.getArticle, {
                tenantId: tid,
                guideSlug: "test-guide",
                articleSlug: "first-article",
            });

            expect(article).toBeDefined();
            expect(article.title).toBe("First Article");
        });
    });
});
