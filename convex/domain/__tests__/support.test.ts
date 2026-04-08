import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant, seedSecondTenant } from "./testHelper.test-util";

describe("domain/support", () => {
    function setup() {
        return createDomainTest(["support", "audit"]);
    }

    // =========================================================================
    // TICKET CREATION
    // =========================================================================

    describe("createTicket", () => {
        it("creates a ticket with required fields", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.support.createTicket, {
                tenantId,
                subject: "Cannot book room",
                description: "The booking form throws an error when I submit",
                priority: "high",
                category: "booking",
                reporterUserId: userId,
            });

            expect(result.id).toBeDefined();
        });

        it("creates an audit entry on ticket creation", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: ticketId } = await t.mutation(api.domain.support.createTicket, {
                tenantId,
                subject: "Audit test ticket",
                description: "Checking audit log",
                priority: "normal",
                category: "general",
                reporterUserId: userId,
            });

            const entries = await t.query(components.audit.functions.listForTenant, {
                tenantId: tenantId as string,
            });

            const ticketEntry = entries.find(
                (e: any) => e.entityType === "support_ticket" && e.entityId === ticketId
            );
            expect(ticketEntry).toBeDefined();
            expect(ticketEntry.action).toBe("ticket_created");
        });

        it("rejects ticket creation for inactive users", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

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

            await expect(
                t.mutation(api.domain.support.createTicket, {
                    tenantId,
                    subject: "Should fail",
                    description: "Inactive user attempt",
                    priority: "low",
                    category: "general",
                    reporterUserId: inactiveUserId,
                })
            ).rejects.toThrow(/not found or inactive/i);
        });

        it("creates a ticket with tags and attachments", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.support.createTicket, {
                tenantId,
                subject: "Bug with attachments",
                description: "See screenshot",
                priority: "normal",
                category: "bug",
                reporterUserId: userId,
                tags: ["bug", "ui"],
                attachmentUrls: ["https://storage.test.no/screenshot.png"],
            });

            expect(result.id).toBeDefined();
        });
    });

    // =========================================================================
    // TICKET QUERIES
    // =========================================================================

    describe("listTickets", () => {
        it("returns tickets for a tenant", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await t.mutation(api.domain.support.createTicket, {
                tenantId,
                subject: "Ticket A",
                description: "First ticket",
                priority: "normal",
                category: "general",
                reporterUserId: userId,
            });
            await t.mutation(api.domain.support.createTicket, {
                tenantId,
                subject: "Ticket B",
                description: "Second ticket",
                priority: "high",
                category: "booking",
                reporterUserId: userId,
            });

            const tickets = await t.query(api.domain.support.listTickets, {
                tenantId,
            });

            expect(tickets.length).toBe(2);
        });

        it("enriches tickets with reporter name from core users table", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await t.mutation(api.domain.support.createTicket, {
                tenantId,
                subject: "Enrichment test",
                description: "Check reporter name",
                priority: "normal",
                category: "general",
                reporterUserId: userId,
            });

            const tickets = await t.query(api.domain.support.listTickets, {
                tenantId,
            });

            expect(tickets.length).toBe(1);
            expect(tickets[0].reporterName).toBe("Test User");
            expect(tickets[0].reporterEmail).toBe("user@test.no");
        });

        it("filters tickets by status", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            // Seed tickets with different statuses via import
            await t.mutation(components.support.import.importTicket, {
                tenantId: tenantId as string,
                subject: "Open Ticket",
                description: "Status: open",
                status: "open",
                priority: "normal",
                category: "general",
                reporterUserId: userId as string,
            });
            await t.mutation(components.support.import.importTicket, {
                tenantId: tenantId as string,
                subject: "Resolved Ticket",
                description: "Status: resolved",
                status: "resolved",
                priority: "low",
                category: "general",
                reporterUserId: userId as string,
            });

            const openTickets = await t.query(api.domain.support.listTickets, {
                tenantId,
                status: "open",
            });

            expect(openTickets.length).toBe(1);
            expect(openTickets[0].subject).toBe("Open Ticket");
        });
    });

    describe("getTicket", () => {
        it("returns a ticket enriched with reporter and assignee details", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id: ticketId } = await t.mutation(api.domain.support.createTicket, {
                tenantId,
                subject: "Detail test",
                description: "Get single ticket",
                priority: "high",
                category: "billing",
                reporterUserId: userId,
            });

            // Assign to admin
            await t.mutation(api.domain.support.assignTicket, {
                id: ticketId,
                assigneeUserId: adminId,
            });

            const ticket = await t.query(api.domain.support.getTicket, {
                id: ticketId,
            });

            expect(ticket).toBeDefined();
            expect(ticket.subject).toBe("Detail test");
            expect(ticket.reporterName).toBe("Test User");
            expect(ticket.assigneeName).toBe("Test Admin");
            expect(ticket.assigneeEmail).toBe("admin@test.no");
        });

        it("throws for invalid ticket ID", async () => {
            const t = setup();
            await seedTestTenant(t);

            // The component's getTicket expects v.id("tickets"), so an invalid ID throws
            await expect(
                t.query(api.domain.support.getTicket, {
                    id: "nonexistent-ticket-id",
                })
            ).rejects.toThrow();
        });
    });

    describe("getTicketCounts", () => {
        it("returns status-grouped counts for a tenant", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);
            const tid = tenantId as string;

            await t.mutation(components.support.import.importTicket, {
                tenantId: tid,
                subject: "T1",
                description: "d",
                status: "open",
                priority: "normal",
                category: "general",
                reporterUserId: userId as string,
            });
            await t.mutation(components.support.import.importTicket, {
                tenantId: tid,
                subject: "T2",
                description: "d",
                status: "open",
                priority: "normal",
                category: "general",
                reporterUserId: userId as string,
            });
            await t.mutation(components.support.import.importTicket, {
                tenantId: tid,
                subject: "T3",
                description: "d",
                status: "resolved",
                priority: "low",
                category: "general",
                reporterUserId: userId as string,
            });

            const counts = await t.query(api.domain.support.getTicketCounts, {
                tenantId,
            });

            expect(counts.all).toBe(3);
            expect(counts.open).toBe(2);
            expect(counts.resolved).toBe(1);
        });
    });

    // =========================================================================
    // TICKET MUTATIONS
    // =========================================================================

    describe("updateTicket", () => {
        it("updates ticket subject and priority", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: ticketId } = await t.mutation(api.domain.support.createTicket, {
                tenantId,
                subject: "Original subject",
                description: "Original description",
                priority: "low",
                category: "general",
                reporterUserId: userId,
            });

            await t.mutation(api.domain.support.updateTicket, {
                id: ticketId,
                subject: "Updated subject",
                priority: "urgent",
            });

            const updated = await t.query(api.domain.support.getTicket, { id: ticketId });
            expect(updated.subject).toBe("Updated subject");
            expect(updated.priority).toBe("urgent");
        });
    });

    describe("assignTicket", () => {
        it("assigns a ticket and transitions open to in_progress", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id: ticketId } = await t.mutation(api.domain.support.createTicket, {
                tenantId,
                subject: "Assign me",
                description: "Should auto-transition",
                priority: "normal",
                category: "general",
                reporterUserId: userId,
            });

            await t.mutation(api.domain.support.assignTicket, {
                id: ticketId,
                assigneeUserId: adminId,
            });

            const ticket = await t.query(api.domain.support.getTicket, { id: ticketId });
            expect(ticket.assigneeUserId).toBe(adminId as string);
            expect(ticket.status).toBe("in_progress");
        });
    });

    describe("changeStatus", () => {
        it("changes ticket status to resolved", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: ticketId } = await t.mutation(api.domain.support.createTicket, {
                tenantId,
                subject: "Resolve me",
                description: "Will be resolved",
                priority: "normal",
                category: "general",
                reporterUserId: userId,
            });

            await t.mutation(api.domain.support.changeStatus, {
                id: ticketId,
                status: "resolved",
            });

            const ticket = await t.query(api.domain.support.getTicket, { id: ticketId });
            expect(ticket.status).toBe("resolved");
            expect(ticket.resolvedAt).toBeDefined();
        });
    });

    describe("addMessage", () => {
        it("adds a message to a ticket", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: ticketId } = await t.mutation(api.domain.support.createTicket, {
                tenantId,
                subject: "Message test",
                description: "Will add messages",
                priority: "normal",
                category: "general",
                reporterUserId: userId,
            });

            const result = await t.mutation(api.domain.support.addMessage, {
                tenantId,
                ticketId,
                authorUserId: userId,
                body: "Here is more info about the issue",
                type: "reply",
            });

            expect(result.id).toBeDefined();
        });
    });

    describe("listTicketMessages", () => {
        it("returns messages enriched with author names", async () => {
            const t = setup();
            const { tenantId, userId, adminId } = await seedTestTenant(t);

            const { id: ticketId } = await t.mutation(api.domain.support.createTicket, {
                tenantId,
                subject: "Messages list test",
                description: "Multiple messages",
                priority: "normal",
                category: "general",
                reporterUserId: userId,
            });

            await t.mutation(api.domain.support.addMessage, {
                tenantId,
                ticketId,
                authorUserId: userId,
                body: "User message",
                type: "reply",
            });
            await t.mutation(api.domain.support.addMessage, {
                tenantId,
                ticketId,
                authorUserId: adminId,
                body: "Admin response",
                type: "reply",
            });

            const messages = await t.query(api.domain.support.listTicketMessages, {
                ticketId,
            });

            expect(messages.length).toBe(2);

            const userMsg = messages.find((m: any) => m.body === "User message");
            expect(userMsg.authorName).toBe("Test User");

            const adminMsg = messages.find((m: any) => m.body === "Admin response");
            expect(adminMsg.authorName).toBe("Test Admin");
        });
    });
});
