/**
 * Classification Facade
 *
 * Delegates to the classification component.
 * Preserves api.domain.classification.* for SDK compatibility.
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import { requireModuleEnabled } from "../lib/featureFlags";
import { withAudit } from "../lib/auditHelpers";
import { emitEvent } from "../lib/eventBus";

// =============================================================================
// QUERY FACADES
// =============================================================================

export const listCategories = query({
    args: {
        tenantId: v.id("tenants"),
        parentId: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, parentId }) => {
        return ctx.runQuery(components.classification.queries.listCategories, {
            tenantId: tenantId as string,
            parentId: parentId as any,
        });
    },
});

export const getCategoryById = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.classification.queries.getCategoryById, {
            id: id as any,
        });
    },
});

export const getCategory = query({
    args: {
        tenantId: v.id("tenants"),
        slug: v.string(),
    },
    handler: async (ctx, { tenantId, slug }) => {
        return ctx.runQuery(components.classification.queries.getCategory, {
            tenantId: tenantId as string,
            slug,
        });
    },
});

export const getCategoryTree = query({
    args: { tenantId: v.id("tenants") },
    handler: async (ctx, { tenantId }) => {
        return ctx.runQuery(components.classification.queries.getCategoryTree, {
            tenantId: tenantId as string,
        });
    },
});

export const listTags = query({
    args: { tenantId: v.id("tenants") },
    handler: async (ctx, { tenantId }) => {
        return ctx.runQuery(components.classification.queries.listTags, {
            tenantId: tenantId as string,
        });
    },
});

export const getTag = query({
    args: {
        tenantId: v.id("tenants"),
        slug: v.string(),
    },
    handler: async (ctx, { tenantId, slug }) => {
        return ctx.runQuery(components.classification.queries.getTag, {
            tenantId: tenantId as string,
            slug,
        });
    },
});

export const listAttributeDefinitions = query({
    args: {
        tenantId: v.id("tenants"),
        categoryId: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, categoryId }) => {
        return ctx.runQuery(components.classification.queries.listAttributeDefinitions, {
            tenantId: tenantId as string,
            categoryId: categoryId as any,
        });
    },
});

export const getAttributeDefinition = query({
    args: {
        tenantId: v.id("tenants"),
        key: v.string(),
    },
    handler: async (ctx, { tenantId, key }) => {
        return ctx.runQuery(components.classification.queries.getAttributeDefinition, {
            tenantId: tenantId as string,
            key,
        });
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

export const createCategory = mutation({
    args: {
        tenantId: v.id("tenants"),
        parentId: v.optional(v.string()),
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        icon: v.optional(v.string()),
        color: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await requireModuleEnabled(ctx, args.tenantId as string, "classification");

        const result = await ctx.runMutation(components.classification.mutations.createCategory, {
            tenantId: args.tenantId as string,
            parentId: args.parentId as any,
            name: args.name,
            slug: args.slug,
            description: args.description,
            icon: args.icon,
            color: args.color,
            sortOrder: args.sortOrder,
            isActive: args.isActive,
            metadata: args.metadata,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "classification_category",
            entityId: result.id,
            action: "category_created",
            details: { name: args.name, slug: args.slug, parentId: args.parentId },
            sourceComponent: "classification",
        });

        await emitEvent(ctx, "classification.category.created", args.tenantId as string, "classification", {
            categoryId: result.id,
            name: args.name,
            slug: args.slug,
        });

        return result;
    },
});

export const updateCategory = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        description: v.optional(v.string()),
        icon: v.optional(v.string()),
        color: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const result = await ctx.runMutation(components.classification.mutations.updateCategory, {
            id: id as any,
            ...updates,
        });

        const category = await ctx.runQuery(components.classification.queries.getCategoryById, {
            id: id as any,
        });

        await withAudit(ctx, {
            tenantId: (category as any)?.tenantId ?? "",
            entityType: "classification_category",
            entityId: id,
            action: "category_updated",
            sourceComponent: "classification",
            newState: updates,
        });

        await emitEvent(ctx, "classification.category.updated", (category as any)?.tenantId ?? "", "classification", {
            categoryId: id,
        });

        return result;
    },
});

export const deleteCategory = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const category = await ctx.runQuery(components.classification.queries.getCategoryById, {
            id: id as any,
        });

        const result = await ctx.runMutation(components.classification.mutations.deleteCategory, {
            id: id as any,
        });

        await withAudit(ctx, {
            tenantId: (category as any)?.tenantId ?? "",
            entityType: "classification_category",
            entityId: id,
            action: "category_deleted",
            sourceComponent: "classification",
        });

        await emitEvent(ctx, "classification.category.deleted", (category as any)?.tenantId ?? "", "classification", {
            categoryId: id,
        });

        return result;
    },
});

export const reorderCategories = mutation({
    args: { ids: v.array(v.string()) },
    handler: async (ctx, { ids }) => {
        return ctx.runMutation(components.classification.mutations.reorderCategories, {
            ids: ids as any,
        });
    },
});

export const createTag = mutation({
    args: {
        tenantId: v.id("tenants"),
        name: v.string(),
        slug: v.string(),
        color: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await requireModuleEnabled(ctx, args.tenantId as string, "classification");

        const result = await ctx.runMutation(components.classification.mutations.createTag, {
            tenantId: args.tenantId as string,
            name: args.name,
            slug: args.slug,
            color: args.color,
            isActive: args.isActive,
            metadata: args.metadata,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "classification_tag",
            entityId: result.id,
            action: "tag_created",
            details: { name: args.name, slug: args.slug },
            sourceComponent: "classification",
        });

        await emitEvent(ctx, "classification.tag.created", args.tenantId as string, "classification", {
            tagId: result.id,
            name: args.name,
            slug: args.slug,
        });

        return result;
    },
});

export const updateTag = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        color: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const result = await ctx.runMutation(components.classification.mutations.updateTag, {
            id: id as any,
            ...updates,
        });

        await withAudit(ctx, {
            tenantId: "",
            entityType: "classification_tag",
            entityId: id,
            action: "tag_updated",
            sourceComponent: "classification",
            newState: updates,
        });

        return result;
    },
});

export const deleteTag = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const result = await ctx.runMutation(components.classification.mutations.deleteTag, {
            id: id as any,
        });

        await withAudit(ctx, {
            tenantId: "",
            entityType: "classification_tag",
            entityId: id,
            action: "tag_deleted",
            sourceComponent: "classification",
        });

        return result;
    },
});

export const createAttributeDefinition = mutation({
    args: {
        tenantId: v.id("tenants"),
        categoryId: v.string(),
        key: v.string(),
        name: v.string(),
        type: v.string(),
        options: v.optional(v.array(v.string())),
        isRequired: v.optional(v.boolean()),
        sortOrder: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await requireModuleEnabled(ctx, args.tenantId as string, "classification");

        const result = await ctx.runMutation(components.classification.mutations.createAttributeDefinition, {
            tenantId: args.tenantId as string,
            categoryId: args.categoryId as any,
            key: args.key,
            name: args.name,
            type: args.type,
            options: args.options,
            isRequired: args.isRequired,
            sortOrder: args.sortOrder,
            metadata: args.metadata,
        });

        await withAudit(ctx, {
            tenantId: args.tenantId as string,
            entityType: "classification_attribute",
            entityId: result.id,
            action: "attribute_created",
            details: { key: args.key, name: args.name, type: args.type },
            sourceComponent: "classification",
        });

        await emitEvent(ctx, "classification.attribute.created", args.tenantId as string, "classification", {
            attributeId: result.id,
            key: args.key,
            categoryId: args.categoryId,
        });

        return result;
    },
});

export const updateAttributeDefinition = mutation({
    args: {
        id: v.string(),
        name: v.optional(v.string()),
        key: v.optional(v.string()),
        type: v.optional(v.string()),
        options: v.optional(v.array(v.string())),
        isRequired: v.optional(v.boolean()),
        sortOrder: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const result = await ctx.runMutation(components.classification.mutations.updateAttributeDefinition, {
            id: id as any,
            ...updates,
        });

        await withAudit(ctx, {
            tenantId: "",
            entityType: "classification_attribute",
            entityId: id,
            action: "attribute_updated",
            sourceComponent: "classification",
            newState: updates,
        });

        return result;
    },
});

export const deleteAttributeDefinition = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        const result = await ctx.runMutation(components.classification.mutations.deleteAttributeDefinition, {
            id: id as any,
        });

        await withAudit(ctx, {
            tenantId: "",
            entityType: "classification_attribute",
            entityId: id,
            action: "attribute_deleted",
            sourceComponent: "classification",
        });

        return result;
    },
});
