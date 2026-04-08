/**
 * Classification Component — Mutation Functions
 *
 * Write operations for categories, tags, and attribute definitions.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// CATEGORY MUTATIONS
// =============================================================================

export const createCategory = mutation({
    args: {
        tenantId: v.string(),
        parentId: v.optional(v.id("categories")),
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        icon: v.optional(v.string()),
        color: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Check slug uniqueness within tenant
        const existing = await ctx.db
            .query("categories")
            .withIndex("by_tenant_slug", (q) =>
                q.eq("tenantId", args.tenantId).eq("slug", args.slug)
            )
            .unique();

        if (existing) {
            throw new Error(`Category slug "${args.slug}" already exists for this tenant`);
        }

        const id = await ctx.db.insert("categories", {
            tenantId: args.tenantId,
            parentId: args.parentId,
            name: args.name,
            slug: args.slug,
            description: args.description,
            icon: args.icon,
            color: args.color,
            sortOrder: args.sortOrder ?? 0,
            isActive: args.isActive ?? true,
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});

export const updateCategory = mutation({
    args: {
        id: v.id("categories"),
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        description: v.optional(v.string()),
        icon: v.optional(v.string()),
        color: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const category = await ctx.db.get(id);
        if (!category) throw new Error("Category not found");

        // If slug is changing, check uniqueness
        if (updates.slug !== undefined && updates.slug !== category.slug) {
            const existing = await ctx.db
                .query("categories")
                .withIndex("by_tenant_slug", (q) =>
                    q.eq("tenantId", category.tenantId).eq("slug", updates.slug!)
                )
                .unique();
            if (existing) {
                throw new Error(`Category slug "${updates.slug}" already exists for this tenant`);
            }
        }

        const patch: Record<string, unknown> = {};
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.slug !== undefined) patch.slug = updates.slug;
        if (updates.description !== undefined) patch.description = updates.description;
        if (updates.icon !== undefined) patch.icon = updates.icon;
        if (updates.color !== undefined) patch.color = updates.color;
        if (updates.sortOrder !== undefined) patch.sortOrder = updates.sortOrder;
        if (updates.isActive !== undefined) patch.isActive = updates.isActive;
        if (updates.metadata !== undefined) patch.metadata = updates.metadata;

        await ctx.db.patch(id, patch);
        return { success: true };
    },
});

export const deleteCategory = mutation({
    args: { id: v.id("categories") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const category = await ctx.db.get(id);
        if (!category) throw new Error("Category not found");

        // Cascade: delete children
        const children = await ctx.db
            .query("categories")
            .withIndex("by_tenant_parent", (q) =>
                q.eq("tenantId", category.tenantId).eq("parentId", id)
            )
            .collect();

        for (const child of children) {
            // Delete attribute definitions for each child
            const childAttrs = await ctx.db
                .query("attributeDefinitions")
                .withIndex("by_category", (q) => q.eq("categoryId", child._id))
                .collect();
            for (const attr of childAttrs) {
                await ctx.db.delete(attr._id);
            }
            await ctx.db.delete(child._id);
        }

        // Delete attribute definitions for this category
        const attrs = await ctx.db
            .query("attributeDefinitions")
            .withIndex("by_category", (q) => q.eq("categoryId", id))
            .collect();
        for (const attr of attrs) {
            await ctx.db.delete(attr._id);
        }

        // Delete the category itself
        await ctx.db.delete(id);
        return { success: true };
    },
});

export const reorderCategories = mutation({
    args: { ids: v.array(v.id("categories")) },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { ids }) => {
        for (let i = 0; i < ids.length; i++) {
            await ctx.db.patch(ids[i], { sortOrder: i });
        }
        return { success: true };
    },
});

// =============================================================================
// TAG MUTATIONS
// =============================================================================

export const createTag = mutation({
    args: {
        tenantId: v.string(),
        name: v.string(),
        slug: v.string(),
        color: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Check slug uniqueness within tenant
        const existing = await ctx.db
            .query("tags")
            .withIndex("by_tenant_slug", (q) =>
                q.eq("tenantId", args.tenantId).eq("slug", args.slug)
            )
            .unique();

        if (existing) {
            throw new Error(`Tag slug "${args.slug}" already exists for this tenant`);
        }

        const id = await ctx.db.insert("tags", {
            tenantId: args.tenantId,
            name: args.name,
            slug: args.slug,
            color: args.color,
            isActive: args.isActive ?? true,
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});

export const updateTag = mutation({
    args: {
        id: v.id("tags"),
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        color: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const tag = await ctx.db.get(id);
        if (!tag) throw new Error("Tag not found");

        // If slug is changing, check uniqueness
        if (updates.slug !== undefined && updates.slug !== tag.slug) {
            const existing = await ctx.db
                .query("tags")
                .withIndex("by_tenant_slug", (q) =>
                    q.eq("tenantId", tag.tenantId).eq("slug", updates.slug!)
                )
                .unique();
            if (existing) {
                throw new Error(`Tag slug "${updates.slug}" already exists for this tenant`);
            }
        }

        const patch: Record<string, unknown> = {};
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.slug !== undefined) patch.slug = updates.slug;
        if (updates.color !== undefined) patch.color = updates.color;
        if (updates.isActive !== undefined) patch.isActive = updates.isActive;
        if (updates.metadata !== undefined) patch.metadata = updates.metadata;

        await ctx.db.patch(id, patch);
        return { success: true };
    },
});

export const deleteTag = mutation({
    args: { id: v.id("tags") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const tag = await ctx.db.get(id);
        if (!tag) throw new Error("Tag not found");

        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// ATTRIBUTE DEFINITION MUTATIONS
// =============================================================================

export const createAttributeDefinition = mutation({
    args: {
        tenantId: v.string(),
        categoryId: v.id("categories"),
        key: v.string(),
        name: v.string(),
        type: v.string(),
        options: v.optional(v.array(v.string())),
        isRequired: v.optional(v.boolean()),
        sortOrder: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        // Check key uniqueness within tenant
        const existing = await ctx.db
            .query("attributeDefinitions")
            .withIndex("by_tenant_key", (q) =>
                q.eq("tenantId", args.tenantId).eq("key", args.key)
            )
            .unique();

        if (existing) {
            throw new Error(`Attribute key "${args.key}" already exists for this tenant`);
        }

        const id = await ctx.db.insert("attributeDefinitions", {
            tenantId: args.tenantId,
            categoryId: args.categoryId,
            key: args.key,
            name: args.name,
            type: args.type,
            options: args.options,
            isRequired: args.isRequired ?? false,
            sortOrder: args.sortOrder ?? 0,
            metadata: args.metadata,
        });

        return { id: id as string };
    },
});

export const updateAttributeDefinition = mutation({
    args: {
        id: v.id("attributeDefinitions"),
        name: v.optional(v.string()),
        key: v.optional(v.string()),
        type: v.optional(v.string()),
        options: v.optional(v.array(v.string())),
        isRequired: v.optional(v.boolean()),
        sortOrder: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const attr = await ctx.db.get(id);
        if (!attr) throw new Error("Attribute definition not found");

        // If key is changing, check uniqueness
        if (updates.key !== undefined && updates.key !== attr.key) {
            const existing = await ctx.db
                .query("attributeDefinitions")
                .withIndex("by_tenant_key", (q) =>
                    q.eq("tenantId", attr.tenantId).eq("key", updates.key!)
                )
                .unique();
            if (existing) {
                throw new Error(`Attribute key "${updates.key}" already exists for this tenant`);
            }
        }

        const patch: Record<string, unknown> = {};
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.key !== undefined) patch.key = updates.key;
        if (updates.type !== undefined) patch.type = updates.type;
        if (updates.options !== undefined) patch.options = updates.options;
        if (updates.isRequired !== undefined) patch.isRequired = updates.isRequired;
        if (updates.sortOrder !== undefined) patch.sortOrder = updates.sortOrder;
        if (updates.metadata !== undefined) patch.metadata = updates.metadata;

        await ctx.db.patch(id, patch);
        return { success: true };
    },
});

export const deleteAttributeDefinition = mutation({
    args: { id: v.id("attributeDefinitions") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const attr = await ctx.db.get(id);
        if (!attr) throw new Error("Attribute definition not found");

        await ctx.db.delete(id);
        return { success: true };
    },
});
