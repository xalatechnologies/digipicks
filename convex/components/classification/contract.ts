/**
 * Classification Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "classification",
    version: "1.0.0",
    category: "domain",
    description: "Hierarchical categories, flat tags, and custom attribute definitions",

    queries: {
        listCategories: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getCategoryById: {
            args: { id: v.string() },
            returns: v.any(),
        },
        getCategory: {
            args: { tenantId: v.string(), slug: v.string() },
            returns: v.any(),
        },
        getCategoryTree: {
            args: { tenantId: v.string() },
            returns: v.any(),
        },
        listTags: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getTag: {
            args: { tenantId: v.string(), slug: v.string() },
            returns: v.any(),
        },
        listAttributeDefinitions: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getAttributeDefinition: {
            args: { tenantId: v.string(), key: v.string() },
            returns: v.any(),
        },
    },

    mutations: {
        createCategory: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateCategory: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        deleteCategory: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        reorderCategories: {
            args: { ids: v.array(v.string()) },
            returns: v.object({ success: v.boolean() }),
        },
        createTag: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateTag: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        deleteTag: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        createAttributeDefinition: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateAttributeDefinition: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        deleteAttributeDefinition: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
    },

    emits: [
        "classification.category.created",
        "classification.category.updated",
        "classification.category.deleted",
        "classification.tag.created",
        "classification.tag.updated",
        "classification.tag.deleted",
        "classification.attribute.created",
        "classification.attribute.updated",
        "classification.attribute.deleted",
    ],

    subscribes: [],

    dependencies: {
        core: ["tenants"],
        components: [],
    },
});
