/**
 * Broadcasts Component — Convex Tests
 *
 * Covers all functions in components/broadcasts/functions.ts:
 *   - send (validation, receipt fan-out, message types)
 *   - listByCreator (filters, sorting)
 *   - listForSubscriber (receipt-based, unread filter)
 *   - get (success, not-found)
 *   - unreadCount (accurate count)
 *   - markAsRead (success, idempotent)
 *   - remove (cascade receipt deletion)
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/broadcasts/__tests__/broadcasts.test.ts
 */

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT = "tenant-bcast-001";
const CREATOR = "creator-a";
const SUB_A = "subscriber-a";
const SUB_B = "subscriber-b";

async function sendBroadcast(
    t: ReturnType<typeof convexTest>,
    overrides: Partial<{
        tenantId: string;
        creatorId: string;
        title: string;
        body: string;
        messageType: string;
        recipientIds: string[];
        pickId: string;
    }> = {}
) {
    return t.mutation(api.functions.send, {
        tenantId: overrides.tenantId ?? TENANT,
        creatorId: overrides.creatorId ?? CREATOR,
        title: overrides.title ?? "Hot NBA Pick Tonight",
        body: overrides.body ?? "Check my latest play for the Lakers game.",
        messageType: overrides.messageType ?? "text_update",
        recipientIds: overrides.recipientIds ?? [SUB_A, SUB_B],
        pickId: overrides.pickId,
    });
}

// ---------------------------------------------------------------------------
// send
// ---------------------------------------------------------------------------

describe("broadcasts/mutations — send", () => {
    it("creates a broadcast and returns id + recipientCount", async () => {
        const t = convexTest(schema, modules);
        const result = await sendBroadcast(t);

        expect(result.id).toBeDefined();
        expect(result.recipientCount).toBe(2);
    });

    it("creates receipts for each recipient", async () => {
        const t = convexTest(schema, modules);
        const result = await sendBroadcast(t);

        const receipts = await t.run(async (ctx) =>
            ctx.db
                .query("broadcastReceipts")
                .withIndex("by_broadcast", (q) => q.eq("broadcastId", result.id))
                .collect()
        );

        expect(receipts).toHaveLength(2);
        const userIds = receipts.map((r) => r.userId).sort();
        expect(userIds).toEqual([SUB_A, SUB_B].sort());
    });

    it("sets status to sent with sentAt timestamp", async () => {
        const t = convexTest(schema, modules);
        const result = await sendBroadcast(t);

        const broadcast = await t.query(api.functions.get, { id: result.id as any });
        expect(broadcast.status).toBe("sent");
        expect(broadcast.sentAt).toBeGreaterThan(0);
    });

    it("rejects invalid message type", async () => {
        const t = convexTest(schema, modules);

        await expect(
            sendBroadcast(t, { messageType: "invalid_type" })
        ).rejects.toThrow(/Invalid message type/);
    });

    it("rejects empty title", async () => {
        const t = convexTest(schema, modules);

        await expect(
            sendBroadcast(t, { title: "   " })
        ).rejects.toThrow(/title cannot be empty/);
    });

    it("rejects empty body", async () => {
        const t = convexTest(schema, modules);

        await expect(
            sendBroadcast(t, { body: "" })
        ).rejects.toThrow(/body cannot be empty/);
    });

    it("handles zero recipients", async () => {
        const t = convexTest(schema, modules);
        const result = await sendBroadcast(t, { recipientIds: [] });

        expect(result.recipientCount).toBe(0);
    });

    it("accepts all valid message types", async () => {
        const t = convexTest(schema, modules);

        for (const type of ["text_update", "pick_alert", "announcement"]) {
            const result = await sendBroadcast(t, { messageType: type, title: `Test ${type}` });
            expect(result.id).toBeDefined();
        }
    });

    it("stores optional pickId", async () => {
        const t = convexTest(schema, modules);
        const result = await sendBroadcast(t, { pickId: "pick-123" });

        const broadcast = await t.query(api.functions.get, { id: result.id as any });
        expect(broadcast.pickId).toBe("pick-123");
    });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

describe("broadcasts/queries — get", () => {
    it("returns a broadcast by ID", async () => {
        const t = convexTest(schema, modules);
        const { id } = await sendBroadcast(t);

        const broadcast = await t.query(api.functions.get, { id: id as any });
        expect(broadcast.title).toBe("Hot NBA Pick Tonight");
        expect(broadcast.creatorId).toBe(CREATOR);
    });

    it("throws for non-existent ID", async () => {
        const t = convexTest(schema, modules);
        // Convex will throw on invalid ID
        await expect(
            t.query(api.functions.get, { id: "nonexistent" as any })
        ).rejects.toThrow();
    });
});

// ---------------------------------------------------------------------------
// listByCreator
// ---------------------------------------------------------------------------

describe("broadcasts/queries — listByCreator", () => {
    it("lists broadcasts for a creator sorted newest first", async () => {
        const t = convexTest(schema, modules);
        await sendBroadcast(t, { title: "First" });
        await sendBroadcast(t, { title: "Second" });

        const list = await t.query(api.functions.listByCreator, {
            tenantId: TENANT,
            creatorId: CREATOR,
        });

        expect(list).toHaveLength(2);
        expect(list[0].title).toBe("Second");
        expect(list[1].title).toBe("First");
    });

    it("respects limit", async () => {
        const t = convexTest(schema, modules);
        await sendBroadcast(t, { title: "A" });
        await sendBroadcast(t, { title: "B" });
        await sendBroadcast(t, { title: "C" });

        const list = await t.query(api.functions.listByCreator, {
            tenantId: TENANT,
            creatorId: CREATOR,
            limit: 2,
        });

        expect(list).toHaveLength(2);
    });

    it("filters by status", async () => {
        const t = convexTest(schema, modules);
        await sendBroadcast(t); // status = "sent"

        const sent = await t.query(api.functions.listByCreator, {
            tenantId: TENANT,
            creatorId: CREATOR,
            status: "sent",
        });
        expect(sent).toHaveLength(1);

        const drafts = await t.query(api.functions.listByCreator, {
            tenantId: TENANT,
            creatorId: CREATOR,
            status: "draft",
        });
        expect(drafts).toHaveLength(0);
    });

    it("isolates by creator", async () => {
        const t = convexTest(schema, modules);
        await sendBroadcast(t, { creatorId: CREATOR });
        await sendBroadcast(t, { creatorId: "other-creator" });

        const list = await t.query(api.functions.listByCreator, {
            tenantId: TENANT,
            creatorId: CREATOR,
        });

        expect(list).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// listForSubscriber
// ---------------------------------------------------------------------------

describe("broadcasts/queries — listForSubscriber", () => {
    it("lists broadcasts for a subscriber via receipts", async () => {
        const t = convexTest(schema, modules);
        await sendBroadcast(t, { recipientIds: [SUB_A] });
        await sendBroadcast(t, { recipientIds: [SUB_B] });

        const listA = await t.query(api.functions.listForSubscriber, {
            tenantId: TENANT,
            userId: SUB_A,
        });
        expect(listA).toHaveLength(1);

        const listB = await t.query(api.functions.listForSubscriber, {
            tenantId: TENANT,
            userId: SUB_B,
        });
        expect(listB).toHaveLength(1);
    });

    it("filters to unread only", async () => {
        const t = convexTest(schema, modules);
        const { id } = await sendBroadcast(t, { recipientIds: [SUB_A] });

        // Mark as read
        await t.mutation(api.functions.markAsRead, {
            userId: SUB_A,
            broadcastId: id,
        });

        const unread = await t.query(api.functions.listForSubscriber, {
            tenantId: TENANT,
            userId: SUB_A,
            unreadOnly: true,
        });
        expect(unread).toHaveLength(0);

        const all = await t.query(api.functions.listForSubscriber, {
            tenantId: TENANT,
            userId: SUB_A,
        });
        expect(all).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// unreadCount
// ---------------------------------------------------------------------------

describe("broadcasts/queries — unreadCount", () => {
    it("counts unread broadcasts", async () => {
        const t = convexTest(schema, modules);
        await sendBroadcast(t, { recipientIds: [SUB_A], title: "B1" });
        await sendBroadcast(t, { recipientIds: [SUB_A], title: "B2" });

        const { count } = await t.query(api.functions.unreadCount, {
            tenantId: TENANT,
            userId: SUB_A,
        });
        expect(count).toBe(2);
    });

    it("decrements after marking read", async () => {
        const t = convexTest(schema, modules);
        const { id } = await sendBroadcast(t, { recipientIds: [SUB_A] });

        await t.mutation(api.functions.markAsRead, {
            userId: SUB_A,
            broadcastId: id,
        });

        const { count } = await t.query(api.functions.unreadCount, {
            tenantId: TENANT,
            userId: SUB_A,
        });
        expect(count).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// markAsRead
// ---------------------------------------------------------------------------

describe("broadcasts/mutations — markAsRead", () => {
    it("marks a broadcast receipt as read", async () => {
        const t = convexTest(schema, modules);
        const { id } = await sendBroadcast(t, { recipientIds: [SUB_A] });

        const result = await t.mutation(api.functions.markAsRead, {
            userId: SUB_A,
            broadcastId: id,
        });
        expect(result.success).toBe(true);
    });

    it("is idempotent — second call still succeeds", async () => {
        const t = convexTest(schema, modules);
        const { id } = await sendBroadcast(t, { recipientIds: [SUB_A] });

        await t.mutation(api.functions.markAsRead, {
            userId: SUB_A,
            broadcastId: id,
        });

        const result = await t.mutation(api.functions.markAsRead, {
            userId: SUB_A,
            broadcastId: id,
        });
        expect(result.success).toBe(true);
    });

    it("throws when receipt not found", async () => {
        const t = convexTest(schema, modules);

        await expect(
            t.mutation(api.functions.markAsRead, {
                userId: "nonexistent-user",
                broadcastId: "nonexistent-broadcast",
            })
        ).rejects.toThrow(/receipt not found/);
    });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

describe("broadcasts/mutations — remove", () => {
    it("deletes broadcast and all receipts", async () => {
        const t = convexTest(schema, modules);
        const { id } = await sendBroadcast(t, { recipientIds: [SUB_A, SUB_B] });

        const result = await t.mutation(api.functions.remove, { id: id as any });
        expect(result.success).toBe(true);

        // Verify broadcast is deleted
        await expect(
            t.query(api.functions.get, { id: id as any })
        ).rejects.toThrow();

        // Verify receipts are deleted
        const receipts = await t.run(async (ctx) =>
            ctx.db
                .query("broadcastReceipts")
                .withIndex("by_broadcast", (q) => q.eq("broadcastId", id))
                .collect()
        );
        expect(receipts).toHaveLength(0);
    });

    it("throws for non-existent broadcast", async () => {
        const t = convexTest(schema, modules);

        await expect(
            t.mutation(api.functions.remove, { id: "nonexistent" as any })
        ).rejects.toThrow();
    });
});

// ===========================================================================
// POST FUNCTIONS (Rich Content)
// ===========================================================================

// ---------------------------------------------------------------------------
// Helpers (posts)
// ---------------------------------------------------------------------------

async function createPost(
    t: ReturnType<typeof convexTest>,
    overrides: Partial<{
        tenantId: string;
        creatorId: string;
        title: string;
        body: string;
        contentFormat: string;
        accessLevel: string;
    }> = {}
) {
    return t.mutation(api.functions.createPost, {
        tenantId: overrides.tenantId ?? TENANT,
        creatorId: overrides.creatorId ?? CREATOR,
        title: overrides.title ?? "My First Post",
        body: overrides.body ?? "# Hello World\n\nThis is my first rich text post.",
        contentFormat: overrides.contentFormat ?? "markdown",
        accessLevel: overrides.accessLevel ?? "free",
    });
}

// ---------------------------------------------------------------------------
// createPost
// ---------------------------------------------------------------------------

describe("broadcasts/mutations — createPost", () => {
    it("creates a draft post and returns id", async () => {
        const t = convexTest(schema, modules);
        const result = await createPost(t);

        expect(result.id).toBeDefined();

        const post = await t.query(api.functions.get, { id: result.id as any });
        expect(post.messageType).toBe("post");
        expect(post.status).toBe("draft");
        expect(post.contentFormat).toBe("markdown");
        expect(post.accessLevel).toBe("free");
        expect(post.recipientCount).toBe(0);
    });

    it("defaults contentFormat to plain and accessLevel to free", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.functions.createPost, {
            tenantId: TENANT,
            creatorId: CREATOR,
            title: "Plain Post",
            body: "Just some text",
        });

        const post = await t.query(api.functions.get, { id: result.id as any });
        expect(post.contentFormat).toBe("plain");
        expect(post.accessLevel).toBe("free");
    });

    it("supports premium access level", async () => {
        const t = convexTest(schema, modules);
        const result = await createPost(t, { accessLevel: "premium" });

        const post = await t.query(api.functions.get, { id: result.id as any });
        expect(post.accessLevel).toBe("premium");
    });

    it("rejects empty title", async () => {
        const t = convexTest(schema, modules);

        await expect(
            createPost(t, { title: "   " })
        ).rejects.toThrow(/title cannot be empty/);
    });

    it("rejects invalid content format", async () => {
        const t = convexTest(schema, modules);

        await expect(
            createPost(t, { contentFormat: "html" })
        ).rejects.toThrow(/Invalid content format/);
    });

    it("rejects invalid access level", async () => {
        const t = convexTest(schema, modules);

        await expect(
            createPost(t, { accessLevel: "vip" })
        ).rejects.toThrow(/Invalid access level/);
    });
});

// ---------------------------------------------------------------------------
// updatePost
// ---------------------------------------------------------------------------

describe("broadcasts/mutations — updatePost", () => {
    it("updates a draft post title and body", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPost(t);

        await t.mutation(api.functions.updatePost, {
            id: id as any,
            title: "Updated Title",
            body: "Updated body content",
        });

        const post = await t.query(api.functions.get, { id: id as any });
        expect(post.title).toBe("Updated Title");
        expect(post.body).toBe("Updated body content");
    });

    it("updates accessLevel and contentFormat", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPost(t, { contentFormat: "plain", accessLevel: "free" });

        await t.mutation(api.functions.updatePost, {
            id: id as any,
            contentFormat: "markdown",
            accessLevel: "premium",
        });

        const post = await t.query(api.functions.get, { id: id as any });
        expect(post.contentFormat).toBe("markdown");
        expect(post.accessLevel).toBe("premium");
    });

    it("sets editedAt when updating a published post", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPost(t);

        // Publish it first
        await t.mutation(api.functions.publishPost, {
            id: id as any,
            recipientIds: [SUB_A],
        });

        // Now update it
        await t.mutation(api.functions.updatePost, {
            id: id as any,
            body: "Edited after publish",
        });

        const post = await t.query(api.functions.get, { id: id as any });
        expect(post.editedAt).toBeGreaterThan(0);
        expect(post.body).toBe("Edited after publish");
    });

    it("does not set editedAt on draft updates", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPost(t);

        await t.mutation(api.functions.updatePost, {
            id: id as any,
            body: "Edited draft",
        });

        const post = await t.query(api.functions.get, { id: id as any });
        expect(post.editedAt).toBeUndefined();
    });

    it("rejects update on non-post broadcasts", async () => {
        const t = convexTest(schema, modules);
        const { id } = await sendBroadcast(t);

        await expect(
            t.mutation(api.functions.updatePost, { id: id as any, title: "Nope" })
        ).rejects.toThrow(/Only posts can be updated/);
    });

    it("rejects empty title", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPost(t);

        await expect(
            t.mutation(api.functions.updatePost, { id: id as any, title: "  " })
        ).rejects.toThrow(/title cannot be empty/);
    });

    it("rejects invalid content format", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPost(t);

        await expect(
            t.mutation(api.functions.updatePost, { id: id as any, contentFormat: "rtf" })
        ).rejects.toThrow(/Invalid content format/);
    });
});

// ---------------------------------------------------------------------------
// publishPost
// ---------------------------------------------------------------------------

describe("broadcasts/mutations — publishPost", () => {
    it("transitions draft to published with receipts", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPost(t);

        const result = await t.mutation(api.functions.publishPost, {
            id: id as any,
            recipientIds: [SUB_A, SUB_B],
        });

        expect(result.id).toBe(id);
        expect(result.recipientCount).toBe(2);

        const post = await t.query(api.functions.get, { id: id as any });
        expect(post.status).toBe("published");
        expect(post.publishedAt).toBeGreaterThan(0);
        expect(post.recipientCount).toBe(2);
    });

    it("creates receipts for each recipient", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPost(t);

        await t.mutation(api.functions.publishPost, {
            id: id as any,
            recipientIds: [SUB_A, SUB_B],
        });

        const receipts = await t.run(async (ctx) =>
            ctx.db
                .query("broadcastReceipts")
                .withIndex("by_broadcast", (q) => q.eq("broadcastId", id))
                .collect()
        );
        expect(receipts).toHaveLength(2);
    });

    it("rejects publishing non-post broadcasts", async () => {
        const t = convexTest(schema, modules);
        const { id } = await sendBroadcast(t);

        await expect(
            t.mutation(api.functions.publishPost, { id: id as any, recipientIds: [] })
        ).rejects.toThrow(/Only posts can be published/);
    });

    it("rejects publishing already published post", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPost(t);

        await t.mutation(api.functions.publishPost, {
            id: id as any,
            recipientIds: [SUB_A],
        });

        await expect(
            t.mutation(api.functions.publishPost, {
                id: id as any,
                recipientIds: [SUB_B],
            })
        ).rejects.toThrow(/already published/);
    });
});

// ---------------------------------------------------------------------------
// unpublishPost
// ---------------------------------------------------------------------------

describe("broadcasts/mutations — unpublishPost", () => {
    it("reverts published post to draft and removes receipts", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPost(t);

        await t.mutation(api.functions.publishPost, {
            id: id as any,
            recipientIds: [SUB_A, SUB_B],
        });

        const result = await t.mutation(api.functions.unpublishPost, { id: id as any });
        expect(result.success).toBe(true);

        const post = await t.query(api.functions.get, { id: id as any });
        expect(post.status).toBe("draft");
        expect(post.recipientCount).toBe(0);

        const receipts = await t.run(async (ctx) =>
            ctx.db
                .query("broadcastReceipts")
                .withIndex("by_broadcast", (q) => q.eq("broadcastId", id))
                .collect()
        );
        expect(receipts).toHaveLength(0);
    });

    it("rejects unpublishing non-published posts", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPost(t);

        await expect(
            t.mutation(api.functions.unpublishPost, { id: id as any })
        ).rejects.toThrow(/Only published posts can be unpublished/);
    });

    it("rejects unpublishing non-post broadcasts", async () => {
        const t = convexTest(schema, modules);
        const { id } = await sendBroadcast(t);

        await expect(
            t.mutation(api.functions.unpublishPost, { id: id as any })
        ).rejects.toThrow(/Only posts can be unpublished/);
    });
});

// ---------------------------------------------------------------------------
// listCreatorPosts
// ---------------------------------------------------------------------------

describe("broadcasts/queries — listCreatorPosts", () => {
    it("lists only posts (not regular broadcasts)", async () => {
        const t = convexTest(schema, modules);
        await createPost(t, { title: "Post One" });
        await createPost(t, { title: "Post Two" });
        await sendBroadcast(t, { title: "Regular Broadcast" });

        const list = await t.query(api.functions.listCreatorPosts, {
            tenantId: TENANT,
            creatorId: CREATOR,
        });

        expect(list).toHaveLength(2);
        expect(list.every((p: any) => p.messageType === "post")).toBe(true);
    });

    it("filters by status", async () => {
        const t = convexTest(schema, modules);
        await createPost(t, { title: "Draft Post" });
        const { id } = await createPost(t, { title: "Published Post" });
        await t.mutation(api.functions.publishPost, {
            id: id as any,
            recipientIds: [SUB_A],
        });

        const drafts = await t.query(api.functions.listCreatorPosts, {
            tenantId: TENANT,
            creatorId: CREATOR,
            status: "draft",
        });
        expect(drafts).toHaveLength(1);
        expect(drafts[0].title).toBe("Draft Post");

        const published = await t.query(api.functions.listCreatorPosts, {
            tenantId: TENANT,
            creatorId: CREATOR,
            status: "published",
        });
        expect(published).toHaveLength(1);
        expect(published[0].title).toBe("Published Post");
    });

    it("respects limit", async () => {
        const t = convexTest(schema, modules);
        await createPost(t, { title: "A" });
        await createPost(t, { title: "B" });
        await createPost(t, { title: "C" });

        const list = await t.query(api.functions.listCreatorPosts, {
            tenantId: TENANT,
            creatorId: CREATOR,
            limit: 2,
        });
        expect(list).toHaveLength(2);
    });

    it("sorts newest first", async () => {
        const t = convexTest(schema, modules);
        await createPost(t, { title: "First" });
        await createPost(t, { title: "Second" });

        const list = await t.query(api.functions.listCreatorPosts, {
            tenantId: TENANT,
            creatorId: CREATOR,
        });
        expect(list[0].title).toBe("Second");
        expect(list[1].title).toBe("First");
    });
});

// ---------------------------------------------------------------------------
// listPublishedPosts
// ---------------------------------------------------------------------------

describe("broadcasts/queries — listPublishedPosts", () => {
    it("lists published posts for subscriber via receipts", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPost(t, { title: "Published for A" });
        await t.mutation(api.functions.publishPost, {
            id: id as any,
            recipientIds: [SUB_A],
        });

        const listA = await t.query(api.functions.listPublishedPosts, {
            tenantId: TENANT,
            userId: SUB_A,
        });
        expect(listA).toHaveLength(1);
        expect(listA[0].title).toBe("Published for A");

        // SUB_B should see nothing
        const listB = await t.query(api.functions.listPublishedPosts, {
            tenantId: TENANT,
            userId: SUB_B,
        });
        expect(listB).toHaveLength(0);
    });

    it("excludes draft posts from subscriber feed", async () => {
        const t = convexTest(schema, modules);
        await createPost(t, { title: "Still a Draft" });

        const list = await t.query(api.functions.listPublishedPosts, {
            tenantId: TENANT,
            userId: SUB_A,
        });
        expect(list).toHaveLength(0);
    });

    it("excludes regular broadcasts from post listing", async () => {
        const t = convexTest(schema, modules);
        await sendBroadcast(t, { recipientIds: [SUB_A] });

        const list = await t.query(api.functions.listPublishedPosts, {
            tenantId: TENANT,
            userId: SUB_A,
        });
        expect(list).toHaveLength(0);
    });

    it("filters by creatorId", async () => {
        const t = convexTest(schema, modules);
        const { id: id1 } = await createPost(t, { creatorId: CREATOR, title: "Creator A Post" });
        const { id: id2 } = await createPost(t, { creatorId: "other-creator", title: "Other Post" });

        await t.mutation(api.functions.publishPost, { id: id1 as any, recipientIds: [SUB_A] });
        await t.mutation(api.functions.publishPost, { id: id2 as any, recipientIds: [SUB_A] });

        const filtered = await t.query(api.functions.listPublishedPosts, {
            tenantId: TENANT,
            userId: SUB_A,
            creatorId: CREATOR,
        });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].title).toBe("Creator A Post");
    });

    it("includes receiptId and readAt fields", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createPost(t);
        await t.mutation(api.functions.publishPost, { id: id as any, recipientIds: [SUB_A] });

        const list = await t.query(api.functions.listPublishedPosts, {
            tenantId: TENANT,
            userId: SUB_A,
        });
        expect(list[0].receiptId).toBeDefined();
        expect(list[0].readAt).toBeUndefined();
    });
});
