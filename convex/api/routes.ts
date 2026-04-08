/**
 * REST API Route Definitions
 *
 * Maps REST paths to Convex domain facade functions.
 * Each route defines its args validator inline for the OpenAPI spec generator.
 *
 * These routes are consumed by the HTTP handler in convex/http.ts.
 */

import { createApiRegistry } from "../lib/openapi";
import { api } from "../_generated/api";
import { v } from "convex/values";

const registry = createApiRegistry();

// =============================================================================
// RESOURCES
// =============================================================================

registry.get("/api/v1/resources", {
    summary: "List resources for a tenant",
    tags: ["Resources"],
    functionRef: api.domain.resources.list,
    functionType: "query",
    argsValidator: v.object({
        tenantId: v.optional(v.string()),
        categoryKey: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    }),
    auth: "none",
});

registry.get("/api/v1/resources/:id", {
    summary: "Get a single resource by ID",
    tags: ["Resources"],
    functionRef: api.domain.resources.get,
    functionType: "query",
    argsValidator: v.object({
        id: v.string(),
    }),
    auth: "none",
});

registry.post("/api/v1/resources", {
    summary: "Create a new resource",
    tags: ["Resources"],
    functionRef: api.domain.resources.create,
    functionType: "mutation",
    argsValidator: v.object({
        tenantId: v.id("tenants"),
        name: v.string(),
        slug: v.string(),
        categoryKey: v.string(),
        description: v.optional(v.string()),
        timeMode: v.optional(v.string()),
        status: v.optional(v.string()),
        requiresApproval: v.optional(v.boolean()),
        capacity: v.optional(v.number()),
        images: v.optional(v.array(v.any())),
        pricing: v.optional(v.any()),
        metadata: v.optional(v.any()),
        subcategoryKeys: v.optional(v.array(v.string())),
        subtitle: v.optional(v.string()),
        venueSlug: v.optional(v.string()),
        duration: v.optional(v.number()),
        tags: v.optional(v.array(v.string())),
        visibility: v.optional(v.string()),
    }),
});

registry.put("/api/v1/resources/:id", {
    summary: "Update an existing resource",
    tags: ["Resources"],
    functionRef: api.domain.resources.update,
    functionType: "mutation",
    argsValidator: v.object({
        id: v.string(),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        categoryKey: v.optional(v.string()),
        timeMode: v.optional(v.string()),
        status: v.optional(v.string()),
        requiresApproval: v.optional(v.boolean()),
        capacity: v.optional(v.number()),
        images: v.optional(v.array(v.any())),
        pricing: v.optional(v.any()),
        metadata: v.optional(v.any()),
        subcategoryKeys: v.optional(v.array(v.string())),
        tags: v.optional(v.array(v.string())),
        visibility: v.optional(v.string()),
    }),
});

registry.delete("/api/v1/resources/:id", {
    summary: "Remove a resource",
    tags: ["Resources"],
    functionRef: api.domain.resources.remove,
    functionType: "mutation",
    argsValidator: v.object({
        id: v.string(),
        removedBy: v.id("users"),
    }),
});

// =============================================================================
// CLASSIFICATION (Categories & Tags)
// =============================================================================

registry.get("/api/v1/categories", {
    summary: "List categories for a tenant",
    tags: ["Classification"],
    functionRef: api.domain.classification.listCategories,
    functionType: "query",
    argsValidator: v.object({
        tenantId: v.id("tenants"),
        parentId: v.optional(v.string()),
    }),
    auth: "none",
});

registry.get("/api/v1/categories/tree", {
    summary: "Get the full category tree for a tenant",
    tags: ["Classification"],
    functionRef: api.domain.classification.getCategoryTree,
    functionType: "query",
    argsValidator: v.object({
        tenantId: v.id("tenants"),
    }),
    auth: "none",
});

registry.get("/api/v1/tags", {
    summary: "List tags for a tenant",
    tags: ["Classification"],
    functionRef: api.domain.classification.listTags,
    functionType: "query",
    argsValidator: v.object({
        tenantId: v.id("tenants"),
    }),
    auth: "none",
});

// =============================================================================
// SEARCH
// =============================================================================

registry.get("/api/v1/search", {
    summary: "Search resources (public)",
    tags: ["Search"],
    functionRef: api.domain.search.globalSearchPublic,
    functionType: "query",
    argsValidator: v.object({
        tenantId: v.optional(v.string()),
        searchTerm: v.string(),
        categoryKey: v.optional(v.string()),
        subcategoryKey: v.optional(v.string()),
        limit: v.optional(v.number()),
        offset: v.optional(v.number()),
        includeMetadata: v.optional(v.boolean()),
        includeCategorySuggestions: v.optional(v.boolean()),
    }),
    auth: "none",
});

// =============================================================================
// REVIEWS
// =============================================================================

registry.get("/api/v1/reviews", {
    summary: "List reviews for a tenant",
    tags: ["Reviews"],
    functionRef: api.domain.reviews.list,
    functionType: "query",
    argsValidator: v.object({
        tenantId: v.id("tenants"),
        resourceId: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    }),
    auth: "none",
});

registry.post("/api/v1/reviews", {
    summary: "Create a review",
    tags: ["Reviews"],
    functionRef: api.domain.reviews.create,
    functionType: "mutation",
    argsValidator: v.object({
        tenantId: v.id("tenants"),
        resourceId: v.string(),
        userId: v.id("users"),
        rating: v.number(),
        title: v.optional(v.string()),
        text: v.optional(v.string()),
        metadata: v.optional(v.any()),
    }),
});

// =============================================================================
// NOTIFICATIONS
// =============================================================================

registry.get("/api/v1/notifications", {
    summary: "List notifications for a user",
    tags: ["Notifications"],
    functionRef: api.domain.notifications.listByUser,
    functionType: "query",
    argsValidator: v.object({
        userId: v.id("users"),
        limit: v.optional(v.number()),
        unreadOnly: v.optional(v.boolean()),
    }),
});

registry.post("/api/v1/notifications/:id/read", {
    summary: "Mark a notification as read",
    tags: ["Notifications"],
    functionRef: api.domain.notifications.markAsRead,
    functionType: "mutation",
    argsValidator: v.object({
        id: v.string(),
    }),
});

// =============================================================================
// SUPPORT TICKETS
// =============================================================================

registry.get("/api/v1/support/tickets", {
    summary: "List support tickets",
    tags: ["Support"],
    functionRef: api.domain.support.listTickets,
    functionType: "query",
    argsValidator: v.object({
        tenantId: v.id("tenants"),
        status: v.optional(v.string()),
        assigneeUserId: v.optional(v.string()),
        category: v.optional(v.string()),
        limit: v.optional(v.number()),
    }),
});

registry.post("/api/v1/support/tickets", {
    summary: "Create a support ticket",
    tags: ["Support"],
    functionRef: api.domain.support.createTicket,
    functionType: "mutation",
    argsValidator: v.object({
        tenantId: v.id("tenants"),
        subject: v.string(),
        description: v.string(),
        priority: v.string(),
        category: v.string(),
        reporterUserId: v.id("users"),
        tags: v.optional(v.array(v.string())),
        attachmentUrls: v.optional(v.array(v.string())),
    }),
});

// =============================================================================
// BILLING
// =============================================================================

registry.get("/api/v1/billing/invoices", {
    summary: "List invoices for a user",
    tags: ["Billing"],
    functionRef: api.domain.billing.listInvoices,
    functionType: "query",
    argsValidator: v.object({
        userId: v.id("users"),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
    }),
});

registry.get("/api/v1/billing/summary", {
    summary: "Get billing summary for a user",
    tags: ["Billing"],
    functionRef: api.domain.billing.getSummary,
    functionType: "query",
    argsValidator: v.object({
        userId: v.id("users"),
        period: v.optional(v.string()),
    }),
});

// =============================================================================
// AUTH
// =============================================================================

registry.get("/api/v1/auth/session", {
    summary: "Validate current session",
    tags: ["Auth"],
    functionRef: api.domain.authSessions.validateSession,
    functionType: "query",
    argsValidator: v.object({
        token: v.string(),
    }),
});

// =============================================================================
// SUBSCRIPTIONS
// =============================================================================

registry.get("/api/v1/subscriptions/tiers", {
    summary: "List public subscription tiers",
    tags: ["Subscriptions"],
    functionRef: api.domain.subscriptions.listPublicTiers,
    functionType: "query",
    argsValidator: v.object({
        tenantId: v.optional(v.string()),
    }),
    auth: "none",
});

// =============================================================================
// TENANT CONFIG
// =============================================================================

registry.get("/api/v1/tenant/config", {
    summary: "Get tenant configuration and branding",
    tags: ["Tenant"],
    functionRef: api.domain.tenantConfig.getBranding,
    functionType: "query",
    argsValidator: v.object({
        tenantId: v.string(),
    }),
    auth: "none",
});

// =============================================================================
// EXPORTS
// =============================================================================

export const apiRoutes = registry.routes;

export const openApiSpec = registry.generateSpec({
    title: "DigilistSaaS API",
    version: "1.0.0",
    description:
        "REST API for the DigilistSaaS multi-tenant booking and resource management platform. " +
        "Provides programmatic access to resources, categories, reviews, notifications, " +
        "support tickets, billing, and tenant configuration.",
});
