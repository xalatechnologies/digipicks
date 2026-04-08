import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

const TENANT = "tenant-support-test";

// =============================================================================
// TICKET MUTATIONS
// =============================================================================

describe("support/mutations — tickets", () => {
    it("creates a ticket with default SLA", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "Bug report", description: "Something broke",
            priority: "normal", category: "bug", reporterUserId: "user-1",
        });
        expect(result.id).toBeDefined();

        const ticket = await t.query(api.queries.getTicket, { id: result.id as any }) as any;
        expect(ticket!.status).toBe("open");
        expect(ticket!.slaDeadline).toBeDefined();
        expect(ticket!.messageCount).toBe(0);
    });

    it("updates a ticket", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "Old", description: "Desc",
            priority: "low", category: "general", reporterUserId: "user-1",
        });
        await t.mutation(api.mutations.updateTicket, {
            id: id as any, subject: "New", priority: "high", tags: ["urgent"],
        });

        const ticket = await t.query(api.queries.getTicket, { id: id as any }) as any;
        expect(ticket!.subject).toBe("New");
        expect(ticket!.priority).toBe("high");
        expect(ticket!.tags).toEqual(["urgent"]);
    });

    it("assigns a ticket and auto-transitions to in_progress", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "Bug", description: "Desc",
            priority: "normal", category: "bug", reporterUserId: "user-1",
        });
        await t.mutation(api.mutations.assignTicket, { id: id as any, assigneeUserId: "agent-1" });

        const ticket = await t.query(api.queries.getTicket, { id: id as any }) as any;
        expect(ticket!.assigneeUserId).toBe("agent-1");
        expect(ticket!.status).toBe("in_progress");
        expect(ticket!.firstResponseAt).toBeDefined();
    });

    it("changes ticket status to resolved", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "Bug", description: "Desc",
            priority: "normal", category: "bug", reporterUserId: "user-1",
        });
        await t.mutation(api.mutations.changeStatus, { id: id as any, status: "resolved" });

        const ticket = await t.query(api.queries.getTicket, { id: id as any }) as any;
        expect(ticket!.status).toBe("resolved");
        expect(ticket!.resolvedAt).toBeDefined();
    });

    it("changes ticket status to closed", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "Bug", description: "Desc",
            priority: "normal", category: "bug", reporterUserId: "user-1",
        });
        await t.mutation(api.mutations.changeStatus, { id: id as any, status: "closed" });

        const ticket = await t.query(api.queries.getTicket, { id: id as any }) as any;
        expect(ticket!.closedAt).toBeDefined();
    });

    it("escalates ticket priority", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "Bug", description: "Desc",
            priority: "normal", category: "bug", reporterUserId: "user-1",
        });
        await t.mutation(api.mutations.escalateTicket, { id: id as any });

        const ticket = await t.query(api.queries.getTicket, { id: id as any }) as any;
        expect(ticket!.priority).toBe("high");
    });

    it("escalates with explicit priority and reassignment", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "Bug", description: "Desc",
            priority: "low", category: "bug", reporterUserId: "user-1",
        });
        await t.mutation(api.mutations.escalateTicket, {
            id: id as any, newPriority: "urgent", newAssigneeUserId: "manager-1",
        });

        const ticket = await t.query(api.queries.getTicket, { id: id as any }) as any;
        expect(ticket!.priority).toBe("urgent");
        expect(ticket!.assigneeUserId).toBe("manager-1");
    });
});

// =============================================================================
// MESSAGE MUTATIONS
// =============================================================================

describe("support/mutations — messages", () => {
    it("adds a message and increments counter", async () => {
        const t = convexTest(schema, modules);
        const { id: ticketId } = await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "Bug", description: "Desc",
            priority: "normal", category: "bug", reporterUserId: "user-1",
        });
        const result = await t.mutation(api.mutations.addMessage, {
            tenantId: TENANT, ticketId: ticketId as any,
            authorUserId: "user-1", body: "More details", type: "reply",
        });
        expect(result.id).toBeDefined();

        const ticket = await t.query(api.queries.getTicket, { id: ticketId as any }) as any;
        expect(ticket!.messageCount).toBe(1);
    });

    it("adds internal note", async () => {
        const t = convexTest(schema, modules);
        const { id: ticketId } = await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "Bug", description: "Desc",
            priority: "normal", category: "bug", reporterUserId: "user-1",
        });
        await t.mutation(api.mutations.addMessage, {
            tenantId: TENANT, ticketId: ticketId as any,
            authorUserId: "agent-1", body: "Investigating", type: "internal_note",
        });

        const messages = await t.query(api.queries.listTicketMessages, { ticketId: ticketId as any });
        expect(messages).toHaveLength(1);
        expect(messages[0].type).toBe("internal_note");
    });
});

// =============================================================================
// QUERIES
// =============================================================================

describe("support/queries", () => {
    it("lists tickets for a tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "A", description: "D",
            priority: "normal", category: "bug", reporterUserId: "user-1",
        });
        await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "B", description: "D",
            priority: "high", category: "feature", reporterUserId: "user-2",
        });

        const tickets = await t.query(api.queries.listTickets, { tenantId: TENANT });
        expect(tickets).toHaveLength(2);
    });

    it("filters tickets by status", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "A", description: "D",
            priority: "normal", category: "bug", reporterUserId: "user-1",
        });
        await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "B", description: "D",
            priority: "normal", category: "bug", reporterUserId: "user-2",
        });
        await t.mutation(api.mutations.changeStatus, { id: id as any, status: "resolved" });

        const open = await t.query(api.queries.listTickets, { tenantId: TENANT, status: "open" });
        expect(open).toHaveLength(1);
    });

    it("gets ticket counts by status", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "A", description: "D",
            priority: "normal", category: "bug", reporterUserId: "user-1",
        });
        const { id } = await t.mutation(api.mutations.createTicket, {
            tenantId: TENANT, subject: "B", description: "D",
            priority: "normal", category: "bug", reporterUserId: "user-2",
        });
        await t.mutation(api.mutations.changeStatus, { id: id as any, status: "resolved" });

        const counts = await t.query(api.queries.getTicketCounts, { tenantId: TENANT });
        expect(counts.all).toBe(2);
        expect(counts.open).toBe(1);
        expect(counts.resolved).toBe(1);
    });
});

// =============================================================================
// SCHEMA INDEXES
// =============================================================================

describe("support/schema — indexes", () => {
    it("tickets by_tenant_status index works", async () => {
        const t = convexTest(schema, modules);
        await t.run(async (ctx) => {
            await ctx.db.insert("tickets", {
                tenantId: TENANT, subject: "T", description: "D", status: "open",
                priority: "normal", category: "bug", reporterUserId: "u1",
                tags: [], attachmentUrls: [], messageCount: 0,
            });
            const found = await ctx.db.query("tickets")
                .withIndex("by_tenant_status", (q) => q.eq("tenantId", TENANT).eq("status", "open")).collect();
            expect(found).toHaveLength(1);
        });
    });
});
