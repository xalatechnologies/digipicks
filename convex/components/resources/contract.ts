/**
 * Resources Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "resources",
    version: "1.0.0",
    category: "domain",
    description: "Resource management with publishing lifecycle",

    queries: {
        list: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        listAll: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        listPublic: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        get: {
            args: { id: v.string() },
            returns: v.any(),
        },
        getBySlug: {
            args: { tenantId: v.string(), slug: v.string() },
            returns: v.any(),
        },
        getBySlugPublic: {
            args: { tenantId: v.string(), slug: v.string() },
            returns: v.any(),
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
        publish: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        unpublish: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        archive: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        restore: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        cloneResource: {
            args: { id: v.string(), tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
    },

    emits: [
        "resources.resource.created",
        "resources.resource.updated",
        "resources.resource.deleted",
        "resources.resource.published",
        "resources.resource.unpublished",
        "resources.resource.archived",
    ],

    subscribes: [],

    dependencies: {
        core: ["tenants"],
        components: [],
    },
});
