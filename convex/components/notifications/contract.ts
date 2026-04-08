/**
 * Notifications Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "notifications",
    version: "1.0.0",
    category: "infrastructure",
    description: "In-app notifications with user preferences",

    queries: {
        listByUser: {
            args: { userId: v.string(), tenantId: v.string() },
            returns: v.array(v.any()),
        },
        unreadCount: {
            args: { userId: v.string(), tenantId: v.string() },
            returns: v.number(),
        },
        get: {
            args: { id: v.string() },
            returns: v.any(),
        },
        getPreferences: {
            args: { userId: v.string(), tenantId: v.string() },
            returns: v.any(),
        },
    },

    mutations: {
        create: {
            args: { tenantId: v.string(), userId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        markAsRead: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        markAllAsRead: {
            args: { userId: v.string(), tenantId: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        remove: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        updatePreference: {
            args: { userId: v.string(), tenantId: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "notifications.notification.created",
        "notifications.notification.read",
    ],

    subscribes: [
        "bookings.booking.created",
        "bookings.booking.approved",
        "bookings.booking.rejected",
        "messaging.message.sent",
    ],

    dependencies: {
        core: ["tenants", "users"],
        components: [],
    },
});
