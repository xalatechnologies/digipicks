import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-guides-test";

// =============================================================================
// GUIDE QUERIES
// =============================================================================

describe("guides/queries — listGuides", () => {
    it("lists published guides for a tenant", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("guides", {
                tenantId: TENANT, title: "Getting Started", slug: "getting-started",
                description: "Learn the basics", isPublished: true, createdAt: Date.now(), metadata: {},
            });
            await ctx.db.insert("guides", {
                tenantId: TENANT, title: "Draft Guide", slug: "draft",
                description: "Not ready yet", isPublished: false, createdAt: Date.now(), metadata: {},
            });
        });

        const guides = await t.query(api.queries.listGuides, { tenantId: TENANT });
        expect(guides).toHaveLength(1);
        expect(guides[0].title).toBe("Getting Started");
    });

    it("lists all guides when isPublished is false", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("guides", {
                tenantId: TENANT, title: "Published", slug: "pub",
                description: "D", isPublished: true, createdAt: Date.now(), metadata: {},
            });
            await ctx.db.insert("guides", {
                tenantId: TENANT, title: "Draft", slug: "draft",
                description: "D", isPublished: false, createdAt: Date.now(), metadata: {},
            });
        });

        const drafts = await t.query(api.queries.listGuides, { tenantId: TENANT, isPublished: false });
        expect(drafts).toHaveLength(1);
        expect(drafts[0].title).toBe("Draft");
    });

    it("filters guides by category", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("guides", {
                tenantId: TENANT, title: "Admin Guide", slug: "admin",
                description: "D", category: "Admin", isPublished: true, createdAt: Date.now(), metadata: {},
            });
            await ctx.db.insert("guides", {
                tenantId: TENANT, title: "User Guide", slug: "user",
                description: "D", category: "Getting Started", isPublished: true, createdAt: Date.now(), metadata: {},
            });
        });

        const admin = await t.query(api.queries.listGuides, { tenantId: TENANT, category: "Admin" });
        expect(admin).toHaveLength(1);
        expect(admin[0].title).toBe("Admin Guide");
    });
});

describe("guides/queries — getGuide", () => {
    it("gets a guide with sections and articles", async () => {
        const t = convexTest(schema, modules);
        let guideId: any;
        await t.run(async (ctx) => {
            guideId = await ctx.db.insert("guides", {
                tenantId: TENANT, title: "Booking Guide", slug: "booking",
                description: "How to book", isPublished: true, createdAt: Date.now(), metadata: {},
            });
            const sectionId = await ctx.db.insert("sections", {
                tenantId: TENANT, guideId, title: "Basics", order: 0, isPublished: true,
            });
            await ctx.db.insert("articles", {
                tenantId: TENANT, sectionId, guideId, title: "Creating a Booking",
                slug: "creating-booking", content: "Step 1...", order: 0, isPublished: true,
            });
        });

        const guide = await t.query(api.queries.getGuide, { tenantId: TENANT, slug: "booking" }) as any;
        expect(guide).not.toBeNull();
        expect(guide!.title).toBe("Booking Guide");
        expect(guide!.sections).toHaveLength(1);
        expect(guide!.sections[0].articles).toHaveLength(1);
        expect(guide!.sections[0].articles[0].title).toBe("Creating a Booking");
    });

    it("returns null for non-existent slug", async () => {
        const t = convexTest(schema, modules);
        const guide = await t.query(api.queries.getGuide, { tenantId: TENANT, slug: "nope" });
        expect(guide).toBeNull();
    });
});

describe("guides/queries — getArticle", () => {
    it("gets an article by guide and article slug", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            const guideId = await ctx.db.insert("guides", {
                tenantId: TENANT, title: "Guide", slug: "guide",
                description: "D", isPublished: true, createdAt: Date.now(), metadata: {},
            });
            const sectionId = await ctx.db.insert("sections", {
                tenantId: TENANT, guideId, title: "Sec", order: 0, isPublished: true,
            });
            await ctx.db.insert("articles", {
                tenantId: TENANT, sectionId, guideId, title: "Article One",
                slug: "article-one", content: "Content here", order: 0, isPublished: true,
            });
        });

        const article = await t.query(api.queries.getArticle, {
            tenantId: TENANT, guideSlug: "guide", articleSlug: "article-one",
        }) as any;
        expect(article).not.toBeNull();
        expect(article!.title).toBe("Article One");
    });

    it("returns null for non-existent guide slug", async () => {
        const t = convexTest(schema, modules);
        const article = await t.query(api.queries.getArticle, {
            tenantId: TENANT, guideSlug: "nope", articleSlug: "nope",
        });
        expect(article).toBeNull();
    });
});

// =============================================================================
// MUTATIONS — markArticleRead
// =============================================================================

describe("guides/mutations — markArticleRead", () => {
    it("creates progress on first read", async () => {
        const t = convexTest(schema, modules);
        let guideId: any, articleId: any;
        await t.run(async (ctx) => {
            guideId = await ctx.db.insert("guides", {
                tenantId: TENANT, title: "Guide", slug: "guide",
                description: "D", isPublished: true, createdAt: Date.now(), metadata: {},
            });
            const sectionId = await ctx.db.insert("sections", {
                tenantId: TENANT, guideId, title: "Sec", order: 0, isPublished: true,
            });
            articleId = await ctx.db.insert("articles", {
                tenantId: TENANT, sectionId, guideId, title: "A1",
                slug: "a1", order: 0, isPublished: true,
            });
        });

        await t.mutation(api.mutations.markArticleRead, {
            tenantId: TENANT, userId: "user-1", guideId, articleId,
        });

        const progress = await t.query(api.queries.getUserProgress, { userId: "user-1", guideId });
        expect(progress).not.toBeNull();
        expect(progress!.status).toBe("in_progress");
        expect(progress!.completedArticles).toHaveLength(1);
    });

    it("does not duplicate article in completedArticles on re-read", async () => {
        const t = convexTest(schema, modules);
        let guideId: any, articleId: any;
        await t.run(async (ctx) => {
            guideId = await ctx.db.insert("guides", {
                tenantId: TENANT, title: "Guide", slug: "guide",
                description: "D", isPublished: true, createdAt: Date.now(), metadata: {},
            });
            const sectionId = await ctx.db.insert("sections", {
                tenantId: TENANT, guideId, title: "Sec", order: 0, isPublished: true,
            });
            articleId = await ctx.db.insert("articles", {
                tenantId: TENANT, sectionId, guideId, title: "A1",
                slug: "a1", order: 0, isPublished: true,
            });
        });

        await t.mutation(api.mutations.markArticleRead, { tenantId: TENANT, userId: "user-1", guideId, articleId });
        await t.mutation(api.mutations.markArticleRead, { tenantId: TENANT, userId: "user-1", guideId, articleId });

        const progress = await t.query(api.queries.getUserProgress, { userId: "user-1", guideId });
        expect(progress!.completedArticles).toHaveLength(1);
    });

    it("tracks multiple articles", async () => {
        const t = convexTest(schema, modules);
        let guideId: any, article1Id: any, article2Id: any;
        await t.run(async (ctx) => {
            guideId = await ctx.db.insert("guides", {
                tenantId: TENANT, title: "Guide", slug: "guide",
                description: "D", isPublished: true, createdAt: Date.now(), metadata: {},
            });
            const sectionId = await ctx.db.insert("sections", {
                tenantId: TENANT, guideId, title: "Sec", order: 0, isPublished: true,
            });
            article1Id = await ctx.db.insert("articles", {
                tenantId: TENANT, sectionId, guideId, title: "A1",
                slug: "a1", order: 0, isPublished: true,
            });
            article2Id = await ctx.db.insert("articles", {
                tenantId: TENANT, sectionId, guideId, title: "A2",
                slug: "a2", order: 1, isPublished: true,
            });
        });

        await t.mutation(api.mutations.markArticleRead, { tenantId: TENANT, userId: "user-1", guideId, articleId: article1Id });
        await t.mutation(api.mutations.markArticleRead, { tenantId: TENANT, userId: "user-1", guideId, articleId: article2Id });

        const progress = await t.query(api.queries.getUserProgress, { userId: "user-1", guideId });
        expect(progress!.completedArticles).toHaveLength(2);
    });
});

// =============================================================================
// USER PROGRESS QUERIES
// =============================================================================

describe("guides/queries — getUserProgress", () => {
    it("returns null for user with no progress", async () => {
        const t = convexTest(schema, modules);
        let guideId: any;
        await t.run(async (ctx) => {
            guideId = await ctx.db.insert("guides", {
                tenantId: TENANT, title: "Guide", slug: "guide",
                description: "D", isPublished: true, createdAt: Date.now(), metadata: {},
            });
        });

        const progress = await t.query(api.queries.getUserProgress, { userId: "user-1", guideId });
        expect(progress).toBeNull();
    });
});

// =============================================================================
// SCHEMA INDEXES
// =============================================================================

describe("guides/schema — indexes", () => {
    it("guides by_slug index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("guides", {
                tenantId: TENANT, title: "G", slug: "g",
                description: "D", isPublished: true, createdAt: Date.now(), metadata: {},
            });
            const found = await ctx.db.query("guides")
                .withIndex("by_slug", (q) => q.eq("tenantId", TENANT).eq("slug", "g")).first();
            expect(found).not.toBeNull();
        });
    });

    it("userProgress by_user_guide index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            const guideId = await ctx.db.insert("guides", {
                tenantId: TENANT, title: "G", slug: "g",
                description: "D", isPublished: true, createdAt: Date.now(), metadata: {},
            });
            await ctx.db.insert("userProgress", {
                tenantId: TENANT, userId: "user-1", guideId,
                status: "in_progress", completedArticles: [], lastAccessedAt: Date.now(),
            });
            const found = await ctx.db.query("userProgress")
                .withIndex("by_user_guide", (q) => q.eq("userId", "user-1").eq("guideId", guideId)).first();
            expect(found).not.toBeNull();
        });
    });
});
