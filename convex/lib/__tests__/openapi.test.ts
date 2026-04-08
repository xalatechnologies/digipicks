import { describe, it, expect } from "vitest";
import { v } from "convex/values";
import {
    validatorToJsonSchema,
    createApiRegistry,
    matchRoute,
} from "../openapi";

// =============================================================================
// validatorToJsonSchema
// =============================================================================

describe("validatorToJsonSchema", () => {
    it("converts v.string() to JSON Schema string", () => {
        const schema = validatorToJsonSchema(v.string());
        expect(schema).toEqual({ type: "string" });
    });

    it("converts v.number() to JSON Schema number", () => {
        const schema = validatorToJsonSchema(v.number());
        expect(schema).toEqual({ type: "number" });
    });

    it("converts v.boolean() to JSON Schema boolean", () => {
        const schema = validatorToJsonSchema(v.boolean());
        expect(schema).toEqual({ type: "boolean" });
    });

    it("converts v.id('tenants') to string with description", () => {
        const schema = validatorToJsonSchema(v.id("tenants"));
        expect(schema).toEqual({
            type: "string",
            description: "ID for tenants",
        });
    });

    it("converts v.optional(v.string()) — unwraps to string schema", () => {
        const schema = validatorToJsonSchema(v.optional(v.string()));
        expect(schema).toEqual({ type: "string" });
    });

    it("converts v.object({...}) with required tracking", () => {
        const validator = v.object({
            name: v.string(),
            age: v.optional(v.number()),
        });
        const schema = validatorToJsonSchema(validator);

        expect(schema.type).toBe("object");
        expect(schema.properties).toBeDefined();
        expect(schema.properties.name).toEqual({ type: "string" });
        expect(schema.properties.age).toEqual({ type: "number" });
        expect(schema.required).toContain("name");
        expect(schema.required).not.toContain("age");
    });

    it("converts v.array(v.string()) to array schema", () => {
        const schema = validatorToJsonSchema(v.array(v.string()));
        expect(schema).toEqual({
            type: "array",
            items: { type: "string" },
        });
    });

    it("converts v.union(v.string(), v.number()) to oneOf", () => {
        const schema = validatorToJsonSchema(
            v.union(v.string(), v.number()),
        );
        expect(schema.oneOf).toBeDefined();
        expect(schema.oneOf).toHaveLength(2);
        expect(schema.oneOf[0]).toEqual({ type: "string" });
        expect(schema.oneOf[1]).toEqual({ type: "number" });
    });

    it("converts v.literal('active') to const", () => {
        const schema = validatorToJsonSchema(v.literal("active"));
        expect(schema).toEqual({ const: "active" });
    });

    it("converts v.any() to empty schema", () => {
        const schema = validatorToJsonSchema(v.any());
        expect(schema).toEqual({});
    });

    it("handles null/undefined validator gracefully", () => {
        expect(validatorToJsonSchema(null)).toEqual({});
        expect(validatorToJsonSchema(undefined)).toEqual({});
    });

    it("converts nested objects correctly", () => {
        const validator = v.object({
            tenantId: v.id("tenants"),
            filters: v.object({
                status: v.optional(v.string()),
                tags: v.array(v.string()),
            }),
        });
        const schema = validatorToJsonSchema(validator);

        expect(schema.type).toBe("object");
        expect(schema.properties.tenantId).toEqual({
            type: "string",
            description: "ID for tenants",
        });
        expect(schema.properties.filters.type).toBe("object");
        expect(schema.properties.filters.properties.tags).toEqual({
            type: "array",
            items: { type: "string" },
        });
    });
});

// =============================================================================
// createApiRegistry + generateSpec
// =============================================================================

describe("createApiRegistry", () => {
    it("registers routes and exposes them", () => {
        const registry = createApiRegistry();

        registry.get("/api/v1/things", {
            summary: "List things",
            tags: ["Things"],
            functionRef: "fake.ref" as any,
            functionType: "query",
        });

        registry.post("/api/v1/things", {
            summary: "Create thing",
            tags: ["Things"],
            functionRef: "fake.ref" as any,
            functionType: "mutation",
        });

        expect(registry.routes).toHaveLength(2);
        expect(registry.routes[0].method).toBe("GET");
        expect(registry.routes[1].method).toBe("POST");
    });

    it("defaults auth to 'bearer' when not specified", () => {
        const registry = createApiRegistry();
        registry.get("/api/v1/test", {
            summary: "Test",
            tags: ["Test"],
            functionRef: "fake" as any,
            functionType: "query",
        });
        expect(registry.routes[0].auth).toBe("bearer");
    });
});

describe("generateSpec", () => {
    it("produces a valid OpenAPI 3.0.1 structure", () => {
        const registry = createApiRegistry();

        registry.get("/api/v1/items", {
            summary: "List items",
            tags: ["Items"],
            functionRef: "fake" as any,
            functionType: "query",
            argsValidator: v.object({
                tenantId: v.string(),
                limit: v.optional(v.number()),
            }),
            auth: "none",
        });

        registry.post("/api/v1/items", {
            summary: "Create item",
            tags: ["Items"],
            functionRef: "fake" as any,
            functionType: "mutation",
            argsValidator: v.object({
                tenantId: v.string(),
                name: v.string(),
            }),
        });

        const spec = registry.generateSpec({
            title: "Test API",
            version: "0.1.0",
            description: "Test",
        });

        // Top-level structure
        expect(spec.openapi).toBe("3.0.1");
        expect(spec.info.title).toBe("Test API");
        expect(spec.info.version).toBe("0.1.0");
        expect(spec.paths).toBeDefined();
        expect(spec.components.securitySchemes.BearerAuth).toBeDefined();
        expect(spec.components.schemas.ProblemDetails).toBeDefined();

        // GET /api/v1/items — query parameters
        const getOp = spec.paths["/api/v1/items"].get;
        expect(getOp.summary).toBe("List items");
        expect(getOp.tags).toEqual(["Items"]);
        expect(getOp.parameters).toBeDefined();
        const tenantParam = getOp.parameters.find(
            (p: any) => p.name === "tenantId",
        );
        expect(tenantParam).toBeDefined();
        expect(tenantParam.in).toBe("query");

        // No security for auth: "none"
        expect(getOp.security).toBeUndefined();

        // POST /api/v1/items — request body
        const postOp = spec.paths["/api/v1/items"].post;
        expect(postOp.requestBody).toBeDefined();
        expect(
            postOp.requestBody.content["application/json"].schema.properties
                .name,
        ).toEqual({ type: "string" });

        // POST has security (default bearer)
        expect(postOp.security).toBeDefined();
    });

    it("converts :param paths to {param} in OpenAPI spec", () => {
        const registry = createApiRegistry();

        registry.get("/api/v1/resources/:id", {
            summary: "Get resource",
            tags: ["Resources"],
            functionRef: "fake" as any,
            functionType: "query",
            argsValidator: v.object({
                id: v.string(),
            }),
        });

        const spec = registry.generateSpec({
            title: "Test",
            version: "1.0.0",
        });

        expect(spec.paths["/api/v1/resources/{id}"]).toBeDefined();
        const op = spec.paths["/api/v1/resources/{id}"].get;
        const pathParam = op.parameters.find(
            (p: any) => p.in === "path" && p.name === "id",
        );
        expect(pathParam).toBeDefined();
        expect(pathParam.required).toBe(true);
    });

    it("excludes path params from request body in POST routes", () => {
        const registry = createApiRegistry();

        registry.post("/api/v1/notifications/:id/read", {
            summary: "Mark as read",
            tags: ["Notifications"],
            functionRef: "fake" as any,
            functionType: "mutation",
            argsValidator: v.object({
                id: v.string(),
            }),
        });

        const spec = registry.generateSpec({
            title: "Test",
            version: "1.0.0",
        });

        const op =
            spec.paths["/api/v1/notifications/{id}/read"].post;
        // Body should not include 'id' since it's a path param
        const bodyProps =
            op.requestBody.content["application/json"].schema.properties;
        expect(bodyProps.id).toBeUndefined();
    });
});

// =============================================================================
// matchRoute
// =============================================================================

describe("matchRoute", () => {
    const routes = [
        {
            method: "GET" as const,
            path: "/api/v1/resources",
            summary: "",
            tags: [],
            functionRef: "list",
            functionType: "query" as const,
        },
        {
            method: "GET" as const,
            path: "/api/v1/resources/:id",
            summary: "",
            tags: [],
            functionRef: "get",
            functionType: "query" as const,
        },
        {
            method: "POST" as const,
            path: "/api/v1/notifications/:id/read",
            summary: "",
            tags: [],
            functionRef: "markRead",
            functionType: "mutation" as const,
        },
    ];

    it("matches exact path", () => {
        const url = new URL("https://example.com/api/v1/resources");
        const result = matchRoute(url, "GET", routes);
        expect(result).not.toBeNull();
        expect(result!.route.functionRef).toBe("list");
        expect(result!.pathParams).toEqual({});
    });

    it("matches path with single param", () => {
        const url = new URL("https://example.com/api/v1/resources/abc123");
        const result = matchRoute(url, "GET", routes);
        expect(result).not.toBeNull();
        expect(result!.route.functionRef).toBe("get");
        expect(result!.pathParams).toEqual({ id: "abc123" });
    });

    it("matches path with param in the middle", () => {
        const url = new URL(
            "https://example.com/api/v1/notifications/notif42/read",
        );
        const result = matchRoute(url, "POST", routes);
        expect(result).not.toBeNull();
        expect(result!.route.functionRef).toBe("markRead");
        expect(result!.pathParams).toEqual({ id: "notif42" });
    });

    it("returns null for unmatched path", () => {
        const url = new URL("https://example.com/api/v1/unknown");
        const result = matchRoute(url, "GET", routes);
        expect(result).toBeNull();
    });

    it("returns null for wrong method", () => {
        const url = new URL("https://example.com/api/v1/resources");
        const result = matchRoute(url, "DELETE", routes);
        expect(result).toBeNull();
    });

    it("decodes URI-encoded path params", () => {
        const url = new URL(
            "https://example.com/api/v1/resources/hello%20world",
        );
        const result = matchRoute(url, "GET", routes);
        expect(result).not.toBeNull();
        expect(result!.pathParams.id).toBe("hello world");
    });
});
