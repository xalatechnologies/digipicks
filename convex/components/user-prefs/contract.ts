/**
 * User Preferences Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "user-prefs",
    version: "1.0.0",
    category: "platform",
    description: "User favorites and saved filters",

    queries: {
        listFavorites: {
            args: { userId: v.string(), tenantId: v.string() },
            returns: v.array(v.any()),
        },
        isFavorite: {
            args: { userId: v.string(), resourceId: v.string() },
            returns: v.any(),
        },
        listFilters: {
            args: { userId: v.string(), tenantId: v.string() },
            returns: v.array(v.any()),
        },
    },

    mutations: {
        addFavorite: {
            args: { userId: v.string(), resourceId: v.string(), tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        removeFavorite: {
            args: { userId: v.string(), resourceId: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        toggleFavorite: {
            args: { userId: v.string(), resourceId: v.string(), tenantId: v.string() },
            returns: v.any(),
        },
        createFilter: {
            args: { userId: v.string(), tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateFilter: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        removeFilter: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "user-prefs.favorite.added",
        "user-prefs.favorite.removed",
        "user-prefs.filter.created",
    ],

    subscribes: [
        "resources.resource.deleted",
    ],

    dependencies: {
        core: ["tenants", "users", "resources"],
        components: [],
    },
});
