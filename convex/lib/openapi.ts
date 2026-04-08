/**
 * OpenAPI REST Adapter for Convex
 *
 * Provides:
 * - validatorToJsonSchema() — converts Convex validators to JSON Schema
 * - createApiRegistry() — route registry with OpenAPI spec generation
 * - handleApiRequest() — HTTP request dispatcher for registered routes
 *
 * This module sits between the Convex HTTP router and domain facades,
 * enabling REST API access with auto-generated OpenAPI 3.0 documentation.
 */

import type { GenericActionCtx } from "convex/server";

// =============================================================================
// TYPES
// =============================================================================

export interface ApiRoute {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    summary: string;
    tags: string[];
    functionRef: any;
    functionType: "query" | "mutation" | "action";
    argsValidator?: any;
    auth?: "bearer" | "api-key" | "none";
}

interface RouteConfig {
    summary: string;
    tags: string[];
    functionRef: any;
    functionType: "query" | "mutation" | "action";
    argsValidator?: any;
    auth?: "bearer" | "api-key" | "none";
}

interface OpenApiInfo {
    title: string;
    version: string;
    description?: string;
}

interface MatchedRoute {
    route: ApiRoute;
    pathParams: Record<string, string>;
}

// =============================================================================
// VALIDATOR -> JSON SCHEMA CONVERSION
// =============================================================================

/**
 * Convert a Convex validator to a JSON Schema object.
 *
 * Convex validators expose runtime introspection via `.kind`, `.isOptional`,
 * `.fields` (objects), `.element` (arrays), `.members` (unions), `.value`
 * (literals), and `.tableName` (IDs).
 */
export function validatorToJsonSchema(validator: any): Record<string, any> {
    if (!validator) return {};

    const v = validator;

    // Handle optional wrapper — unwrap to inner validator
    if (v.isOptional === "optional" && v.value) {
        return validatorToJsonSchema(v.value);
    }

    switch (v.kind) {
        case "string":
            return { type: "string" };

        case "number":
        case "float64":
            return { type: "number" };

        case "boolean":
            return { type: "boolean" };

        case "int64":
            return { type: "integer", format: "int64" };

        case "id":
            return {
                type: "string",
                description: `ID for ${v.tableName ?? "unknown"}`,
            };

        case "null":
            return { type: "null" };

        case "bytes":
            return { type: "string", format: "byte" };

        case "object": {
            const properties: Record<string, any> = {};
            const required: string[] = [];

            if (v.fields) {
                for (const [key, field] of Object.entries(v.fields)) {
                    const f = field as any;
                    // Field may be a validator directly or wrapped with isOptional
                    const innerValidator = f.fieldType ?? f.validator ?? f;
                    properties[key] = validatorToJsonSchema(innerValidator);

                    if (f.isOptional === "required") {
                        required.push(key);
                    }
                }
            }

            return {
                type: "object",
                properties,
                ...(required.length > 0 ? { required } : {}),
            };
        }

        case "array": {
            const element = v.element ?? v.fieldType;
            return {
                type: "array",
                items: element ? validatorToJsonSchema(element) : {},
            };
        }

        case "union": {
            const members = v.members ?? [];
            return {
                oneOf: members.map((m: any) => validatorToJsonSchema(m)),
            };
        }

        case "literal": {
            return { const: v.value };
        }

        case "record": {
            const valueSchema = v.value
                ? validatorToJsonSchema(v.value)
                : {};
            return {
                type: "object",
                additionalProperties: valueSchema,
            };
        }

        case "any":
            return {};

        default:
            return {};
    }
}

// =============================================================================
// ROUTE REGISTRY + OPENAPI SPEC GENERATOR
// =============================================================================

export function createApiRegistry() {
    const routes: ApiRoute[] = [];

    function register(
        method: ApiRoute["method"],
        path: string,
        config: RouteConfig,
    ) {
        routes.push({
            method,
            path,
            summary: config.summary,
            tags: config.tags,
            functionRef: config.functionRef,
            functionType: config.functionType,
            argsValidator: config.argsValidator,
            auth: config.auth ?? "bearer",
        });
    }

    return {
        get(path: string, config: RouteConfig) {
            register("GET", path, config);
        },
        post(path: string, config: RouteConfig) {
            register("POST", path, config);
        },
        put(path: string, config: RouteConfig) {
            register("PUT", path, config);
        },
        patch(path: string, config: RouteConfig) {
            register("PATCH", path, config);
        },
        delete(path: string, config: RouteConfig) {
            register("DELETE", path, config);
        },

        routes,

        generateSpec(info: OpenApiInfo): Record<string, any> {
            return generateOpenApiSpec(routes, info);
        },
    };
}

/**
 * Convert a REST path with `:param` placeholders to OpenAPI `{param}` format.
 */
function toOpenApiPath(path: string): string {
    return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
}

/**
 * Extract path parameter names from a route path.
 */
function extractPathParams(path: string): string[] {
    const params: string[] = [];
    const regex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = regex.exec(path)) !== null) {
        params.push(match[1]);
    }
    return params;
}

function generateOpenApiSpec(
    routes: ApiRoute[],
    info: OpenApiInfo,
): Record<string, any> {
    const paths: Record<string, any> = {};

    for (const route of routes) {
        const openApiPath = toOpenApiPath(route.path);
        const method = route.method.toLowerCase();

        if (!paths[openApiPath]) {
            paths[openApiPath] = {};
        }

        const operation: Record<string, any> = {
            summary: route.summary,
            tags: route.tags,
            operationId: operationId(route),
            responses: {
                "200": {
                    description: "Successful response",
                    content: {
                        "application/json": {
                            schema: { type: "object" },
                        },
                    },
                },
                "400": {
                    description: "Bad request",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ProblemDetails" },
                        },
                    },
                },
                "401": {
                    description: "Unauthorized",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ProblemDetails" },
                        },
                    },
                },
                "500": {
                    description: "Internal server error",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ProblemDetails" },
                        },
                    },
                },
            },
        };

        // Security
        if (route.auth !== "none") {
            operation.security = [
                route.auth === "api-key"
                    ? { ApiKeyAuth: [] }
                    : { BearerAuth: [] },
            ];
        }

        // Path parameters
        const pathParams = extractPathParams(route.path);
        if (pathParams.length > 0) {
            operation.parameters = [
                ...(operation.parameters ?? []),
                ...pathParams.map((name) => ({
                    name,
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                })),
            ];
        }

        // Args schema from validator
        if (route.argsValidator) {
            const schema = validatorToJsonSchema(route.argsValidator);

            if (route.method === "GET" || route.method === "DELETE") {
                // Query parameters for GET/DELETE
                if (
                    schema.type === "object" &&
                    schema.properties
                ) {
                    const queryParams = Object.entries(schema.properties)
                        .filter(([name]) => !pathParams.includes(name))
                        .map(([name, propSchema]) => ({
                            name,
                            in: "query" as const,
                            required: schema.required?.includes(name) ?? false,
                            schema: propSchema as Record<string, any>,
                        }));

                    operation.parameters = [
                        ...(operation.parameters ?? []),
                        ...queryParams,
                    ];
                }
            } else {
                // Request body for POST/PUT/PATCH
                // Exclude path params from the body schema
                const bodySchema = { ...schema };
                if (
                    bodySchema.type === "object" &&
                    bodySchema.properties &&
                    pathParams.length > 0
                ) {
                    const filteredProps = { ...bodySchema.properties };
                    const filteredRequired = (bodySchema.required ?? []).filter(
                        (r: string) => !pathParams.includes(r),
                    );
                    for (const p of pathParams) {
                        delete filteredProps[p];
                    }
                    bodySchema.properties = filteredProps;
                    if (filteredRequired.length > 0) {
                        bodySchema.required = filteredRequired;
                    } else {
                        delete bodySchema.required;
                    }
                }

                operation.requestBody = {
                    required: true,
                    content: {
                        "application/json": {
                            schema: bodySchema,
                        },
                    },
                };
            }
        }

        paths[openApiPath][method] = operation;
    }

    return {
        openapi: "3.0.1",
        info: {
            title: info.title,
            version: info.version,
            description: info.description ?? "",
        },
        servers: [
            {
                url: "/",
                description: "Current deployment",
            },
        ],
        paths,
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "sessionToken",
                    description:
                        "Session token obtained from authentication flow",
                },
                ApiKeyAuth: {
                    type: "apiKey",
                    in: "header",
                    name: "X-API-Key",
                    description: "Tenant API key",
                },
            },
            schemas: {
                ProblemDetails: {
                    type: "object",
                    description: "RFC 7807 Problem Details",
                    properties: {
                        type: {
                            type: "string",
                            description: "URI reference identifying the problem type",
                        },
                        title: {
                            type: "string",
                            description: "Short human-readable summary",
                        },
                        status: {
                            type: "integer",
                            description: "HTTP status code",
                        },
                        detail: {
                            type: "string",
                            description: "Human-readable explanation",
                        },
                        instance: {
                            type: "string",
                            description: "URI reference for the occurrence",
                        },
                    },
                    required: ["type", "title", "status"],
                },
            },
        },
    };
}

function operationId(route: ApiRoute): string {
    // Convert "/api/v1/resources/:id" -> "getResourcesById"
    const parts = route.path
        .replace(/^\/api\/v1\//, "")
        .split("/")
        .filter(Boolean)
        .map((segment) => {
            if (segment.startsWith(":")) {
                return "By" + capitalize(segment.slice(1));
            }
            return capitalize(segment);
        });

    const prefix = route.method.toLowerCase();
    return prefix + parts.join("");
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

/**
 * Match a request URL + method against registered routes.
 *
 * Supports path parameters like `/api/v1/resources/:id`.
 * Returns the matched route and extracted path params.
 */
export function matchRoute(
    url: URL,
    method: string,
    routes: ApiRoute[],
): MatchedRoute | null {
    const requestPath = url.pathname;
    const requestMethod = method.toUpperCase();

    for (const route of routes) {
        if (route.method !== requestMethod) continue;

        const routeSegments = route.path.split("/").filter(Boolean);
        const requestSegments = requestPath.split("/").filter(Boolean);

        if (routeSegments.length !== requestSegments.length) continue;

        const pathParams: Record<string, string> = {};
        let match = true;

        for (let i = 0; i < routeSegments.length; i++) {
            const routeSeg = routeSegments[i];
            const reqSeg = requestSegments[i];

            if (routeSeg.startsWith(":")) {
                pathParams[routeSeg.slice(1)] = decodeURIComponent(reqSeg);
            } else if (routeSeg !== reqSeg) {
                match = false;
                break;
            }
        }

        if (match) {
            return { route, pathParams };
        }
    }

    return null;
}

/**
 * Parse query string parameters, coercing numeric and boolean strings.
 */
function parseQueryParams(url: URL): Record<string, any> {
    const params: Record<string, any> = {};
    url.searchParams.forEach((value, key) => {
        // Coerce "true"/"false" to boolean
        if (value === "true") {
            params[key] = true;
        } else if (value === "false") {
            params[key] = false;
        }
        // Coerce numeric strings
        else if (value !== "" && !isNaN(Number(value))) {
            params[key] = Number(value);
        } else {
            params[key] = value;
        }
    });
    return params;
}

/**
 * Build RFC 7807 Problem Details response.
 */
function problemResponse(
    status: number,
    title: string,
    detail?: string,
    headers?: Record<string, string>,
): Response {
    const body = {
        type: `https://httpstatuses.com/${status}`,
        title,
        status,
        detail: detail ?? title,
        instance: `/api/v1`,
    };

    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/problem+json",
            ...headers,
        },
    });
}

/**
 * Add CORS headers to a response headers object.
 */
function apiCorsHeaders(origin?: string | null): Record<string, string> {
    const envOrigins = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const STATIC_ORIGINS = envOrigins.length > 0
        ? envOrigins
        : [
            "http://localhost:5180",
            "http://localhost:5190",
        ];

    const isAllowed =
        origin &&
        STATIC_ORIGINS.includes(origin);

    const effectiveOrigin = isAllowed ? origin : STATIC_ORIGINS[0];

    return {
        "Access-Control-Allow-Origin": effectiveOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Tenant-Id, X-API-Key",
        "Access-Control-Max-Age": "86400",
    };
}

/**
 * Handle an incoming REST API request.
 *
 * 1. Matches URL + method to a registered route
 * 2. Extracts auth from Authorization header
 * 3. Parses args from query params (GET/DELETE) or JSON body (POST/PUT/PATCH)
 * 4. Merges path params into args
 * 5. Dispatches to the matched Convex function
 * 6. Returns JSON with CORS headers
 */
export async function handleApiRequest(
    ctx: GenericActionCtx<any>,
    request: Request,
    routes: ApiRoute[],
): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = apiCorsHeaders(origin);

    // Match route
    const matched = matchRoute(url, request.method, routes);
    if (!matched) {
        return problemResponse(404, "Not Found", "No matching API route", cors);
    }

    const { route, pathParams } = matched;

    // Auth — extract and validate Bearer token
    //
    // The REST adapter extracts the session token from the Authorization header
    // and passes it as `_sessionToken` in args. Domain facades enforce their own
    // auth via requireActiveUser(). For routes requiring auth, we validate the
    // token format here; actual session validation is delegated to the domain
    // function or can be done by providing a sessionValidator reference.
    let sessionToken: string | null = null;
    if (route.auth !== "none") {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return problemResponse(
                401,
                "Unauthorized",
                "Missing or invalid Authorization header. Expected: Bearer <sessionToken>",
                cors,
            );
        }

        sessionToken = authHeader.slice(7);
        if (!sessionToken) {
            return problemResponse(
                401,
                "Unauthorized",
                "Empty session token",
                cors,
            );
        }
    }

    // Parse args
    let args: Record<string, any> = {};

    try {
        if (request.method === "GET" || request.method === "DELETE") {
            args = parseQueryParams(url);
        } else {
            const contentType = request.headers.get("Content-Type") ?? "";
            if (contentType.includes("application/json")) {
                const body = await request.text();
                if (body) {
                    args = JSON.parse(body);
                }
            }
        }
    } catch {
        return problemResponse(
            400,
            "Bad Request",
            "Invalid request body — expected valid JSON",
            cors,
        );
    }

    // Merge path params into args
    for (const [key, value] of Object.entries(pathParams)) {
        args[key] = value;
    }

    // Add session token as _sessionToken for handlers that need it
    if (sessionToken) {
        args._sessionToken = sessionToken;
    }

    // Dispatch to Convex function
    try {
        let result: any;

        if (route.functionType === "query") {
            result = await ctx.runQuery(route.functionRef, args);
        } else if (route.functionType === "mutation") {
            result = await ctx.runMutation(route.functionRef, args);
        } else {
            result = await ctx.runAction(route.functionRef, args);
        }

        return new Response(
            JSON.stringify({ data: result ?? null }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    ...cors,
                },
            },
        );
    } catch (e: any) {
        const message =
            e instanceof Error ? e.message : "Internal server error";

        // Map known error patterns to HTTP status codes
        let status = 500;
        if (message.includes("not found") || message.includes("Not found")) {
            status = 404;
        } else if (
            message.includes("unauthorized") ||
            message.includes("Unauthorized") ||
            message.includes("not authenticated")
        ) {
            status = 401;
        } else if (
            message.includes("forbidden") ||
            message.includes("Forbidden") ||
            message.includes("permission")
        ) {
            status = 403;
        } else if (
            message.includes("rate limit") ||
            message.includes("Rate limit")
        ) {
            status = 429;
        } else if (
            message.includes("Invalid") ||
            message.includes("invalid") ||
            message.includes("required") ||
            message.includes("validation")
        ) {
            status = 400;
        }

        return problemResponse(status, httpStatusTitle(status), message, cors);
    }
}

function httpStatusTitle(status: number): string {
    const titles: Record<number, string> = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        429: "Too Many Requests",
        500: "Internal Server Error",
    };
    return titles[status] ?? "Error";
}
