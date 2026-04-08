/**
 * Addons Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "addons",
    version: "1.0.0",
    category: "domain",
    description: "Addons with resource and booking associations",

    queries: {
        list: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        get: {
            args: { id: v.string() },
            returns: v.any(),
        },
        listForResource: {
            args: { resourceId: v.string() },
            returns: v.array(v.any()),
        },
        listForBooking: {
            args: { bookingId: v.string() },
            returns: v.array(v.any()),
        },
    },

    mutations: {
        create: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        update: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        remove: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        addToResource: {
            args: { addonId: v.string(), resourceId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        removeFromResource: {
            args: { addonId: v.string(), resourceId: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        addToBooking: {
            args: { addonId: v.string(), bookingId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        removeFromBooking: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        approve: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        reject: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "addons.addon.created",
        "addons.addon.updated",
        "addons.addon.deleted",
        "addons.booking-addon.added",
        "addons.booking-addon.approved",
        "addons.booking-addon.rejected",
    ],

    subscribes: [
        "resources.resource.deleted",
        "bookings.booking.cancelled",
    ],

    dependencies: {
        core: ["tenants", "resources"],
        components: ["bookings"],
    },
});
