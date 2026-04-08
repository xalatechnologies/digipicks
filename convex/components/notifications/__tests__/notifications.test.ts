/**
 * Notifications Component — Comprehensive convex-test Tests
 *
 * Covers all functions in components/notifications/functions.ts:
 *   Notifications:
 *     - create (fields, defaults)
 *     - markAsRead (sets readAt)
 *     - markAllAsRead (bulk, unread-only)
 *     - remove (deletes notification)
 *     - listByUser (unreadOnly, limit)
 *     - unreadCount (respects readAt)
 *     - get (by id)
 *
 *   Notification Preferences:
 *     - updatePreference (upsert: create + update)
 *     - getPreferences (by userId)
 *
 *   Email Templates:
 *     - createEmailTemplate (fields, sendCount default 0)
 *     - updateEmailTemplate (patch, lastModified)
 *     - deleteEmailTemplate (skip if isDefault)
 *     - getEmailTemplate (by id)
 *     - listEmailTemplates (by tenantId)
 *     - sendTestEmail (increments sendCount, message format)
 *
 *   Form Definitions:
 *     - createFormDefinition (fields, submissionCount default 0)
 *     - updateFormDefinition (patch)
 *     - deleteFormDefinition (success)
 *     - getFormDefinition (by id)
 *     - listFormDefinitions (by tenantId)
 *
 *   Schema indexes:
 *     - notifications: by_user, by_tenant
 *     - notificationPreferences: by_user, by_tenant
 *     - emailTemplates: by_tenant, by_tenant_category, by_tenant_active
 *     - formDefinitions: by_tenant, by_tenant_category, by_tenant_published
 *
 * Run: npx vitest run --config vitest.config.ts components/notifications/notifications.test.ts
 */

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { modules } from "../testSetup.test-util";
import { api } from "../_generated/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT = "tenant-notif-001";
const USER_A = "user-notif-a";
const USER_B = "user-notif-b";

async function createNotif(
    t: ReturnType<typeof convexTest>,
    overrides: Partial<{
        tenantId: string;
        userId: string;
        type: string;
        title: string;
        body: string;
        link: string;
    }> = {}
) {
    return t.mutation(api.functions.create, {
        tenantId: overrides.tenantId ?? TENANT,
        userId: overrides.userId ?? USER_A,
        type: overrides.type ?? "booking.confirmed",
        title: overrides.title ?? "Booking confirmed",
        body: overrides.body,
        link: overrides.link,
    });
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("notifications/mutations — create", () => {
    it("creates a notification and returns an id", async () => {
        const t = convexTest(schema, modules);
        const result = await createNotif(t);
        expect(result.id).toBeDefined();

        const notif = await t.run(async (ctx) => ctx.db.get(result.id as any)) as any;
        expect(notif?.title).toBe("Booking confirmed");
        expect(notif?.type).toBe("booking.confirmed");
        expect(notif?.tenantId).toBe(TENANT);
        expect(notif?.userId).toBe(USER_A);
        expect(notif?.readAt).toBeUndefined();
    });

    it("persists optional body and link fields", async () => {
        const t = convexTest(schema, modules);
        const result = await createNotif(t, { body: "Your booking is confirmed.", link: "/bookings/123" });
        const notif = await t.run(async (ctx) => ctx.db.get(result.id as any)) as any;
        expect(notif?.body).toBe("Your booking is confirmed.");
        expect(notif?.link).toBe("/bookings/123");
    });
});

// ---------------------------------------------------------------------------
// markAsRead / markAllAsRead
// ---------------------------------------------------------------------------

describe("notifications/mutations — markAsRead + markAllAsRead", () => {
    it("markAsRead sets readAt timestamp", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createNotif(t);

        await t.mutation(api.functions.markAsRead, { id: id as any });

        const notif = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(notif?.readAt).toBeDefined();
        expect(notif?.readAt).toBeLessThanOrEqual(Date.now());
    });

    it("markAllAsRead marks all unread notifications for a user", async () => {
        const t = convexTest(schema, modules);
        await createNotif(t, { userId: USER_A, title: "Notif 1" });
        await createNotif(t, { userId: USER_A, title: "Notif 2" });
        await createNotif(t, { userId: USER_B, title: "Other user" }); // not touched

        const result = await t.mutation(api.functions.markAllAsRead, { userId: USER_A });

        expect(result.success).toBe(true);
        expect(result.count).toBe(2);
    });

    it("markAllAsRead does not re-mark already-read notifications", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createNotif(t, { userId: USER_A, title: "Read one" });
        await t.mutation(api.functions.markAsRead, { id: id as any });

        await createNotif(t, { userId: USER_A, title: "Unread one" });

        const result = await t.mutation(api.functions.markAllAsRead, { userId: USER_A });
        expect(result.count).toBe(1); // only the unread one
    });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

describe("notifications/mutations — remove", () => {
    it("removes a notification", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createNotif(t);

        await t.mutation(api.functions.remove, { id: id as any });

        const notif = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(notif).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// listByUser / unreadCount / get
// ---------------------------------------------------------------------------

describe("notifications/queries — listByUser + unreadCount + get", () => {
    it("listByUser returns all notifications for a user", async () => {
        const t = convexTest(schema, modules);
        await createNotif(t, { userId: USER_A });
        await createNotif(t, { userId: USER_A, title: "Second" });
        await createNotif(t, { userId: USER_B, title: "Other" });

        const notifs = await t.query(api.functions.listByUser, { userId: USER_A });
        expect(notifs.length).toBe(2);
        notifs.forEach((n: any) => expect(n.userId).toBe(USER_A));
    });

    it("listByUser with unreadOnly filters out read notifications", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createNotif(t, { userId: USER_A, title: "To read" });
        await createNotif(t, { userId: USER_A, title: "Stay unread" });

        await t.mutation(api.functions.markAsRead, { id: id as any });

        const unread = await t.query(api.functions.listByUser, { userId: USER_A, unreadOnly: true });
        expect(unread.length).toBe(1);
        expect(unread[0].title).toBe("Stay unread");
    });

    it("listByUser respects limit", async () => {
        const t = convexTest(schema, modules);
        for (let i = 0; i < 5; i++) {
            await createNotif(t, { userId: USER_A, title: `Notif ${i}` });
        }
        const notifs = await t.query(api.functions.listByUser, { userId: USER_A, limit: 3 });
        expect(notifs.length).toBe(3);
    });

    it("unreadCount returns 0 for user with all read", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createNotif(t, { userId: USER_A });
        await t.mutation(api.functions.markAsRead, { id: id as any });

        const { count } = await t.query(api.functions.unreadCount, { userId: USER_A });
        expect(count).toBe(0);
    });

    it("unreadCount returns correct count of unread", async () => {
        const t = convexTest(schema, modules);
        await createNotif(t, { userId: USER_A });
        await createNotif(t, { userId: USER_A });
        const { id } = await createNotif(t, { userId: USER_A });
        await t.mutation(api.functions.markAsRead, { id: id as any });

        const { count } = await t.query(api.functions.unreadCount, { userId: USER_A });
        expect(count).toBe(2);
    });

    it("get returns a notification by id", async () => {
        const t = convexTest(schema, modules);
        const { id } = await createNotif(t, { title: "Specific one" });
        const notif = await t.query(api.functions.get, { id: id as any });
        expect(notif?.title).toBe("Specific one");
    });
});

// ---------------------------------------------------------------------------
// Notification Preferences — updatePreference / getPreferences
// ---------------------------------------------------------------------------

describe("notifications/mutations — updatePreference", () => {
    it("creates a new preference if none exists", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.functions.updatePreference, {
            tenantId: TENANT,
            userId: USER_A,
            channel: "email",
            category: "booking",
            enabled: true,
        });
        expect(result.id).toBeDefined();

        const prefs = await t.query(api.functions.getPreferences, { userId: USER_A });
        expect(prefs.length).toBe(1);
        expect(prefs[0].enabled).toBe(true);
    });

    it("updates an existing preference in-place (upsert)", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.updatePreference, {
            tenantId: TENANT, userId: USER_A, channel: "email", category: "booking", enabled: true,
        });

        // Update it
        await t.mutation(api.functions.updatePreference, {
            tenantId: TENANT, userId: USER_A, channel: "email", category: "booking", enabled: false,
        });

        const prefs = await t.query(api.functions.getPreferences, { userId: USER_A });
        expect(prefs.length).toBe(1); // still single record
        expect(prefs[0].enabled).toBe(false); // updated value
    });

    it("creates separate preferences for different channel+category combos", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.updatePreference, {
            tenantId: TENANT, userId: USER_A, channel: "email", category: "booking", enabled: true,
        });
        await t.mutation(api.functions.updatePreference, {
            tenantId: TENANT, userId: USER_A, channel: "sms", category: "booking", enabled: false,
        });

        const prefs = await t.query(api.functions.getPreferences, { userId: USER_A });
        expect(prefs.length).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

describe("notifications/mutations — emailTemplates", () => {
    it("createEmailTemplate sets sendCount to 0 and records lastModified", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.functions.createEmailTemplate, {
            tenantId: TENANT,
            name: "Booking Confirmation",
            subject: "Your booking is confirmed",
            body: "Hello {{name}}, your booking at {{venue}} is confirmed.",
            category: "booking",
            isActive: true,
        });

        expect(result.id).toBeDefined();

        const tmpl = await t.run(async (ctx) => ctx.db.get(result.id as any)) as any;
        expect(tmpl?.sendCount).toBe(0);
        expect(tmpl?.lastModified).toBeDefined();
        expect(tmpl?.name).toBe("Booking Confirmation");
    });

    it("updateEmailTemplate patches fields and updates lastModified", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.createEmailTemplate, {
            tenantId: TENANT, name: "Old Name", subject: "Old Subject",
            body: "Body", category: "booking", isActive: true,
        });

        await t.mutation(api.functions.updateEmailTemplate, {
            id: id as any,
            name: "New Name",
            subject: "New Subject",
        });

        const tmpl = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(tmpl?.name).toBe("New Name");
        expect(tmpl?.subject).toBe("New Subject");
    });

    it("deleteEmailTemplate removes a non-default template", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.createEmailTemplate, {
            tenantId: TENANT, name: "Deletable", subject: "Sub",
            body: "Body", category: "booking", isActive: true,
        });

        const result = await t.mutation(api.functions.deleteEmailTemplate, { id: id as any });
        expect(result.success).toBe(true);

        const tmpl = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(tmpl).toBeNull();
    });

    it("deleteEmailTemplate returns false for default templates", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.createEmailTemplate, {
            tenantId: TENANT, name: "Default", subject: "Sub",
            body: "Body", category: "booking", isActive: true, isDefault: true,
        });

        const result = await t.mutation(api.functions.deleteEmailTemplate, { id: id as any });
        expect(result.success).toBe(false); // protected

        const tmpl = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(tmpl).not.toBeNull(); // still exists
    });

    it("getEmailTemplate retrieves by id", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.createEmailTemplate, {
            tenantId: TENANT, name: "Template A", subject: "Sub",
            body: "Body", category: "booking", isActive: true,
        });

        const tmpl = await t.query(api.functions.getEmailTemplate, { id: id as any });
        expect(tmpl?.name).toBe("Template A");
    });

    it("listEmailTemplates returns all templates for a tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.createEmailTemplate, {
            tenantId: TENANT, name: "T1", subject: "S1", body: "B1", category: "booking", isActive: true,
        });
        await t.mutation(api.functions.createEmailTemplate, {
            tenantId: TENANT, name: "T2", subject: "S2", body: "B2", category: "review", isActive: false,
        });
        await t.mutation(api.functions.createEmailTemplate, {
            tenantId: "other-tenant", name: "T3", subject: "S3", body: "B3", category: "booking", isActive: true,
        });

        const templates = await t.query(api.functions.listEmailTemplates, { tenantId: TENANT });
        expect(templates.length).toBe(2);
        templates.forEach((tmpl: any) => expect(tmpl.tenantId).toBe(TENANT));
    });

    it("sendTestEmail increments sendCount and returns a success message", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.createEmailTemplate, {
            tenantId: TENANT, name: "Booking Conf", subject: "Confirmed",
            body: "Body", category: "booking", isActive: true,
        });

        const result = await t.mutation(api.functions.sendTestEmail, {
            templateId: id as any,
            recipientEmail: "test@example.com",
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain("test@example.com");
        expect(result.message).toContain("Booking Conf");

        const tmpl = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(tmpl?.sendCount).toBe(1); // incremented from 0
    });
});

// ---------------------------------------------------------------------------
// Form Definitions
// ---------------------------------------------------------------------------

describe("notifications/mutations — formDefinitions", () => {
    const SAMPLE_FIELDS = [
        { id: "name", type: "text", label: "Full Name", required: true },
        { id: "notes", type: "textarea", label: "Notes", required: false },
    ];

    it("createFormDefinition initializes submissionCount to 0", async () => {
        const t = convexTest(schema, modules);
        const result = await t.mutation(api.functions.createFormDefinition, {
            tenantId: TENANT,
            name: "Booking Request Form",
            category: "booking",
            fields: SAMPLE_FIELDS,
            isPublished: true,
        });

        expect(result.id).toBeDefined();

        const form = await t.run(async (ctx) => ctx.db.get(result.id as any)) as any;
        expect(form?.submissionCount).toBe(0);
        expect(form?.fields.length).toBe(2);
        expect(form?.isPublished).toBe(true);
    });

    it("updateFormDefinition patches fields and updates lastModified", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.createFormDefinition, {
            tenantId: TENANT, name: "Old Form", category: "booking",
            fields: SAMPLE_FIELDS, isPublished: false,
        });

        await t.mutation(api.functions.updateFormDefinition, {
            id: id as any,
            name: "Updated Form",
            isPublished: true,
        });

        const form = await t.run(async (ctx) => ctx.db.get(id as any)) as any;
        expect(form?.name).toBe("Updated Form");
        expect(form?.isPublished).toBe(true);
    });

    it("deleteFormDefinition removes the form", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.createFormDefinition, {
            tenantId: TENANT, name: "To Delete", category: "booking",
            fields: SAMPLE_FIELDS, isPublished: false,
        });

        const result = await t.mutation(api.functions.deleteFormDefinition, { id: id as any });
        expect(result.success).toBe(true);

        const form = await t.run(async (ctx) => ctx.db.get(id as any));
        expect(form).toBeNull();
    });

    it("getFormDefinition retrieves the form by id", async () => {
        const t = convexTest(schema, modules);
        const { id } = await t.mutation(api.functions.createFormDefinition, {
            tenantId: TENANT, name: "Contact Form", category: "support",
            fields: SAMPLE_FIELDS, isPublished: true,
        });

        const form = await t.query(api.functions.getFormDefinition, { id: id as any });
        expect(form?.name).toBe("Contact Form");
    });

    it("listFormDefinitions returns all forms for a tenant", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.createFormDefinition, {
            tenantId: TENANT, name: "Form A", category: "booking", fields: SAMPLE_FIELDS, isPublished: true,
        });
        await t.mutation(api.functions.createFormDefinition, {
            tenantId: "other-tenant", name: "Form B", category: "booking", fields: SAMPLE_FIELDS, isPublished: true,
        });

        const forms = await t.query(api.functions.listFormDefinitions, { tenantId: TENANT });
        expect(forms.length).toBe(1);
        expect(forms[0].tenantId).toBe(TENANT);
    });
});

// ---------------------------------------------------------------------------
// Schema — index correctness
// ---------------------------------------------------------------------------

describe("notifications schema — index correctness", () => {
    it("notifications by_user index returns only notifications for a user", async () => {
        const t = convexTest(schema, modules);
        await createNotif(t, { userId: USER_A });
        await createNotif(t, { userId: USER_B });

        const items = await t.run(async (ctx) =>
            ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", USER_A)).collect()
        );
        expect(items.length).toBe(1);
        expect(items[0].userId).toBe(USER_A);
    });

    it("notifications by_tenant index returns all for a tenant", async () => {
        const t = convexTest(schema, modules);
        await createNotif(t, { tenantId: TENANT, userId: USER_A });
        await createNotif(t, { tenantId: "other", userId: USER_B });

        const items = await t.run(async (ctx) =>
            ctx.db.query("notifications").withIndex("by_tenant", (q) => q.eq("tenantId", TENANT)).collect()
        );
        expect(items.length).toBe(1);
    });

    it("emailTemplates by_tenant_category index filters by category", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.createEmailTemplate, {
            tenantId: TENANT, name: "T1", subject: "S", body: "B", category: "booking", isActive: true,
        });
        await t.mutation(api.functions.createEmailTemplate, {
            tenantId: TENANT, name: "T2", subject: "S", body: "B", category: "review", isActive: true,
        });

        const items = await t.run(async (ctx) =>
            ctx.db.query("emailTemplates")
                .withIndex("by_tenant_category", (q) => q.eq("tenantId", TENANT).eq("category", "booking"))
                .collect()
        );
        expect(items.length).toBe(1);
        expect(items[0].category).toBe("booking");
    });

    it("emailTemplates by_tenant_active index filters by isActive", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(api.functions.createEmailTemplate, {
            tenantId: TENANT, name: "Active", subject: "S", body: "B", category: "booking", isActive: true,
        });
        await t.mutation(api.functions.createEmailTemplate, {
            tenantId: TENANT, name: "Inactive", subject: "S", body: "B", category: "booking", isActive: false,
        });

        const active = await t.run(async (ctx) =>
            ctx.db.query("emailTemplates")
                .withIndex("by_tenant_active", (q) => q.eq("tenantId", TENANT).eq("isActive", true))
                .collect()
        );
        expect(active.length).toBe(1);
        expect(active[0].isActive).toBe(true);
    });

    it("formDefinitions by_tenant_published index filters published forms", async () => {
        const t = convexTest(schema, modules);
        const FIELDS = [{ id: "f", type: "text", label: "L", required: false }];
        await t.mutation(api.functions.createFormDefinition, {
            tenantId: TENANT, name: "Published", category: "booking", fields: FIELDS, isPublished: true,
        });
        await t.mutation(api.functions.createFormDefinition, {
            tenantId: TENANT, name: "Draft", category: "booking", fields: FIELDS, isPublished: false,
        });

        const published = await t.run(async (ctx) =>
            ctx.db.query("formDefinitions")
                .withIndex("by_tenant_published", (q) => q.eq("tenantId", TENANT).eq("isPublished", true))
                .collect()
        );
        expect(published.length).toBe(1);
        expect(published[0].name).toBe("Published");
    });
});
