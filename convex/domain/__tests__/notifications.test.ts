import { describe, it, expect } from "vitest";
import { api, components } from "../../_generated/api";
import { createDomainTest, seedTestTenant } from "./testHelper.test-util";

describe("domain/notifications", () => {
    function setup() {
        return createDomainTest(["notifications"]);
    }

    // =========================================================================
    // CREATE
    // =========================================================================

    describe("create", () => {
        it("creates a notification with required fields", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.notifications.create, {
                tenantId,
                userId,
                type: "booking_confirmed",
                title: "Booking bekreftet",
            });

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });

        it("creates a notification with optional fields", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const result = await t.mutation(api.domain.notifications.create, {
                tenantId,
                userId,
                type: "booking_message",
                title: "Ny melding",
                body: "Du har fatt en ny melding",
                link: "/messages",
                metadata: { conversationId: "conv-001" },
            });

            expect(result.id).toBeDefined();
        });

        it("rejects notification for inactive user", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);

            const inactiveId = await t.run(async (ctx) => {
                return ctx.db.insert("users", {
                    email: "inactive@test.no",
                    name: "Inactive User",
                    role: "user",
                    status: "suspended",
                    tenantId,
                    metadata: {},
                });
            });

            await expect(
                t.mutation(api.domain.notifications.create, {
                    tenantId,
                    userId: inactiveId,
                    type: "info",
                    title: "Should fail",
                })
            ).rejects.toThrow("User not found or inactive");
        });
    });

    // =========================================================================
    // LIST BY USER
    // =========================================================================

    describe("listByUser", () => {
        it("returns notifications for a user", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await t.mutation(api.domain.notifications.create, {
                tenantId,
                userId,
                type: "info",
                title: "Notification 1",
            });
            await t.mutation(api.domain.notifications.create, {
                tenantId,
                userId,
                type: "info",
                title: "Notification 2",
            });

            const list = await t.query(api.domain.notifications.listByUser, {
                userId,
            });

            expect(list.length).toBe(2);
        });

        it("respects limit parameter", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            for (let i = 0; i < 5; i++) {
                await t.mutation(api.domain.notifications.create, {
                    tenantId,
                    userId,
                    type: "info",
                    title: `Notification ${i}`,
                });
            }

            const list = await t.query(api.domain.notifications.listByUser, {
                userId,
                limit: 3,
            });

            expect(list.length).toBe(3);
        });

        it("filters unread only", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id: readId } = await t.mutation(
                api.domain.notifications.create,
                {
                    tenantId,
                    userId,
                    type: "info",
                    title: "Will be read",
                }
            );
            await t.mutation(api.domain.notifications.create, {
                tenantId,
                userId,
                type: "info",
                title: "Unread",
            });

            // Mark one as read
            await t.mutation(api.domain.notifications.markAsRead, {
                id: readId,
            });

            const unread = await t.query(api.domain.notifications.listByUser, {
                userId,
                unreadOnly: true,
            });

            expect(unread.length).toBe(1);
            expect(unread[0].title).toBe("Unread");
        });
    });

    // =========================================================================
    // UNREAD COUNT
    // =========================================================================

    describe("unreadCount", () => {
        it("returns correct unread count", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await t.mutation(api.domain.notifications.create, {
                tenantId,
                userId,
                type: "info",
                title: "Unread 1",
            });
            await t.mutation(api.domain.notifications.create, {
                tenantId,
                userId,
                type: "info",
                title: "Unread 2",
            });

            const result = await t.query(api.domain.notifications.unreadCount, {
                userId,
            });

            expect(result.count).toBe(2);
        });
    });

    // =========================================================================
    // GET
    // =========================================================================

    describe("get", () => {
        it("returns a notification by ID", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.notifications.create, {
                tenantId,
                userId,
                type: "booking_confirmed",
                title: "Booking OK",
                body: "Your booking is confirmed",
            });

            const notification = await t.query(api.domain.notifications.get, {
                id,
            });

            expect(notification.title).toBe("Booking OK");
            expect(notification.body).toBe("Your booking is confirmed");
            expect(notification.type).toBe("booking_confirmed");
        });
    });

    // =========================================================================
    // MARK AS READ / MARK ALL AS READ
    // =========================================================================

    describe("markAsRead", () => {
        it("marks a single notification as read", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.notifications.create, {
                tenantId,
                userId,
                type: "info",
                title: "To Read",
            });

            await t.mutation(api.domain.notifications.markAsRead, { id });

            const notification = await t.query(api.domain.notifications.get, {
                id,
            });
            expect(notification.readAt).toBeDefined();
            expect(notification.readAt).toBeGreaterThan(0);
        });
    });

    describe("markAllAsRead", () => {
        it("marks all notifications as read for a user", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await t.mutation(api.domain.notifications.create, {
                tenantId,
                userId,
                type: "info",
                title: "Unread A",
            });
            await t.mutation(api.domain.notifications.create, {
                tenantId,
                userId,
                type: "info",
                title: "Unread B",
            });

            await t.mutation(api.domain.notifications.markAllAsRead, {
                userId,
            });

            const count = await t.query(api.domain.notifications.unreadCount, {
                userId,
            });
            expect(count.count).toBe(0);
        });
    });

    // =========================================================================
    // REMOVE
    // =========================================================================

    describe("remove", () => {
        it("removes a notification", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            const { id } = await t.mutation(api.domain.notifications.create, {
                tenantId,
                userId,
                type: "info",
                title: "To Delete",
            });

            await t.mutation(api.domain.notifications.remove, { id });

            const list = await t.query(api.domain.notifications.listByUser, {
                userId,
            });
            expect(list.length).toBe(0);
        });
    });

    // =========================================================================
    // PREFERENCES
    // =========================================================================

    describe("preferences", () => {
        it("updates and retrieves preferences", async () => {
            const t = setup();
            const { tenantId, userId } = await seedTestTenant(t);

            await t.mutation(api.domain.notifications.updatePreference, {
                tenantId,
                userId,
                channel: "email",
                category: "booking",
                enabled: false,
            });

            const prefs = await t.query(
                api.domain.notifications.getPreferences,
                { userId }
            );

            expect(prefs).toBeDefined();
        });
    });

    // =========================================================================
    // EMAIL TEMPLATES
    // =========================================================================

    describe("email templates", () => {
        it("creates and lists email templates", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            await t.mutation(api.domain.notifications.createEmailTemplate, {
                tenantId: tid,
                name: "Welcome Email",
                subject: "Velkommen!",
                body: "<p>Welcome to our platform</p>",
                category: "onboarding",
                isActive: true,
            });

            const templates = await t.query(
                api.domain.notifications.listEmailTemplates,
                { tenantId: tid }
            );

            expect(templates.length).toBe(1);
            expect(templates[0].name).toBe("Welcome Email");
        });

        it("updates an email template", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            const { id } = await t.mutation(
                api.domain.notifications.createEmailTemplate,
                {
                    tenantId: tid,
                    name: "Old Template",
                    subject: "Old Subject",
                    body: "<p>Old body</p>",
                    category: "notification",
                    isActive: true,
                }
            );

            await t.mutation(api.domain.notifications.updateEmailTemplate, {
                id,
                name: "Updated Template",
                subject: "New Subject",
            });

            const template = await t.query(
                api.domain.notifications.getEmailTemplate,
                { id }
            );
            expect(template.name).toBe("Updated Template");
            expect(template.subject).toBe("New Subject");
        });

        it("deletes an email template", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            const { id } = await t.mutation(
                api.domain.notifications.createEmailTemplate,
                {
                    tenantId: tid,
                    name: "Deletable",
                    subject: "Subject",
                    body: "<p>Body</p>",
                    category: "test",
                    isActive: false,
                }
            );

            await t.mutation(api.domain.notifications.deleteEmailTemplate, {
                id,
            });

            const templates = await t.query(
                api.domain.notifications.listEmailTemplates,
                { tenantId: tid }
            );
            expect(templates.length).toBe(0);
        });
    });

    // =========================================================================
    // FORM DEFINITIONS
    // =========================================================================

    describe("form definitions", () => {
        it("creates and lists form definitions", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            await t.mutation(api.domain.notifications.createFormDefinition, {
                tenantId: tid,
                name: "Contact Form",
                category: "contact",
                fields: [
                    {
                        id: "name",
                        type: "text",
                        label: "Navn",
                        required: true,
                    },
                    {
                        id: "email",
                        type: "email",
                        label: "E-post",
                        required: true,
                    },
                ],
                isPublished: true,
            });

            const forms = await t.query(
                api.domain.notifications.listFormDefinitions,
                { tenantId: tid }
            );

            expect(forms.length).toBe(1);
            expect(forms[0].name).toBe("Contact Form");
        });

        it("deletes a form definition", async () => {
            const t = setup();
            const { tenantId } = await seedTestTenant(t);
            const tid = tenantId as string;

            const { id } = await t.mutation(
                api.domain.notifications.createFormDefinition,
                {
                    tenantId: tid,
                    name: "Temp Form",
                    category: "temp",
                    fields: [
                        {
                            id: "q1",
                            type: "text",
                            label: "Question",
                            required: false,
                        },
                    ],
                    isPublished: false,
                }
            );

            await t.mutation(api.domain.notifications.deleteFormDefinition, {
                id,
            });

            const forms = await t.query(
                api.domain.notifications.listFormDefinitions,
                { tenantId: tid }
            );
            expect(forms.length).toBe(0);
        });
    });
});
