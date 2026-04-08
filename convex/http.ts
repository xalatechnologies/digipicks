import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, components } from "./_generated/api";

const http = httpRouter();

// =============================================================================
// CORS — Allow cross-origin requests for webhooks and API access
// =============================================================================

/**
 * Add CORS headers to responses.
 * Restricted to known production and development origins.
 */
function corsHeaders(origin?: string | null): Record<string, string> {
    // Static known origins for development
    // Add your production domains here when deploying
    const STATIC_ORIGINS = [
        "http://localhost:5180",  // dashboard dev
        "http://localhost:5190",  // web dev
        "http://localhost:6005",  // storybook
    ];

    // In production, add your domains to STATIC_ORIGINS or use the wildcard pattern below:
    // /^https:\/\/[a-z0-9-]+\.yourdomain\.com$/.test(origin)
    const isAllowed =
        origin &&
        STATIC_ORIGINS.includes(origin);

    const effectiveOrigin = isAllowed ? origin : STATIC_ORIGINS[0];

    return {
        "Access-Control-Allow-Origin": effectiveOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tenant-Id",
        "Access-Control-Max-Age": "86400",
    };
}

// Handle CORS preflight for all webhook routes
http.route({
    path: "/webhooks/vipps",
    method: "OPTIONS",
    handler: httpAction(async (_ctx, request) => {
        return new Response(null, {
            status: 204,
            headers: corsHeaders(request.headers.get("Origin")),
        });
    }),
});

/**
 * OAuth callback endpoint.
 *
 * All providers use standard OIDC: receives ?code=&state= after authentication.
 */
http.route({
    path: "/auth/callback",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        // Handle OAuth errors (returned by provider)
        if (error) {
            const errorDesc =
                url.searchParams.get("error_description") || error;

            // Need state to redirect back to the correct app
            if (state) {
                const oauthState = await ctx.runMutation(
                    internal.auth.oauthStates.consumeState,
                    { state }
                );
                if (oauthState) {
                    return redirectToApp(
                        oauthState.appOrigin,
                        oauthState.returnPath,
                        undefined,
                        errorDesc
                    );
                }
            }

            return new Response(
                `<html><body><h1>Authentication Error</h1><p>${errorDesc}</p><p><a href="/">Go back</a></p></body></html>`,
                {
                    status: 400,
                    headers: { "Content-Type": "text/html" },
                }
            );
        }

        if (!state || !code) {
            return new Response("Missing code or state parameter", {
                status: 400,
            });
        }

        // Consume the OAuth state to get provider + app origin
        const oauthState = await ctx.runMutation(
            internal.auth.oauthStates.consumeState,
            { state }
        );

        if (!oauthState) {
            return new Response(
                `<html><body><h1>Invalid or Expired State</h1><p>The authentication request has expired. Please try again.</p><p><a href="/">Go back</a></p></body></html>`,
                {
                    status: 400,
                    headers: { "Content-Type": "text/html" },
                }
            );
        }

        try {
            const result = await ctx.runAction(
                internal.auth.callback.handleCallback,
                {
                    code,
                    state,
                    provider: oauthState.provider,
                    appId: oauthState.appId,
                    // signicatSessionId field is reused to store PKCE code_verifier
                    signicatSessionId: oauthState.signicatSessionId,
                }
            );

            if (!result.success || !result.user) {
                return redirectToApp(
                    oauthState.appOrigin,
                    oauthState.returnPath,
                    undefined,
                    "Authentication failed"
                );
            }

            // Create session
            const user = result.user as { _id: string };
            const sessionToken: string = await ctx.runMutation(
                internal.auth.sessions.createSession,
                {
                    userId: user._id as any,
                    provider: oauthState.provider,
                    appId: oauthState.appId,
                }
            );

            // Redirect to app's auth callback page
            return redirectToApp(
                oauthState.appOrigin,
                oauthState.returnPath,
                sessionToken
            );
        } catch (e) {
            const errorMsg =
                e instanceof Error ? e.message : "Unknown error occurred";
            return redirectToApp(
                oauthState.appOrigin,
                oauthState.returnPath,
                undefined,
                errorMsg
            );
        }
    }),
});

function redirectToApp(
    appOrigin: string,
    returnPath: string,
    sessionToken?: string,
    error?: string
): Response {
    const callbackUrl = new URL("/auth/callback", appOrigin);
    if (sessionToken) {
        callbackUrl.searchParams.set("sessionToken", sessionToken);
    }
    if (returnPath && returnPath !== "/") {
        callbackUrl.searchParams.set("returnPath", returnPath);
    }
    if (error) {
        callbackUrl.searchParams.set("error", error);
    }

    return new Response(null, {
        status: 302,
        headers: { Location: callbackUrl.toString() },
    });
}

/**
 * Vipps ePayment webhook endpoint.
 * Receives payment status updates from Vipps.
 */
http.route({
    path: "/webhooks/vipps",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const payload = await request.json();
            const headers: Record<string, string> = {};
            request.headers.forEach((value, key) => {
                headers[key] = value;
            });

            await ctx.runAction(internal.billing.webhooks.vippsWebhook, {
                payload,
                headers,
            });

            return new Response(JSON.stringify({ received: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } catch (e) {
            console.error("Vipps webhook error:", e);
            return new Response(
                JSON.stringify({ error: "Webhook processing failed" }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    }),
});

// Handle CORS preflight for Adyen webhook route
http.route({
    path: "/webhooks/adyen",
    method: "OPTIONS",
    handler: httpAction(async (_ctx, request) => {
        return new Response(null, {
            status: 204,
            headers: corsHeaders(request.headers.get("Origin")),
        });
    }),
});

/**
 * Adyen webhook endpoint.
 * Receives payment status updates from Adyen.
 */
http.route({
    path: "/webhooks/adyen",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const payload = await request.json();
            const headers: Record<string, string> = {};
            request.headers.forEach((value, key) => {
                headers[key] = value;
            });

            await ctx.runAction(internal.billing.webhooks.adyenWebhook, {
                payload,
                headers,
            });

            // Adyen expects "[accepted]" in the response body
            return new Response(JSON.stringify({ "[accepted]": true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } catch (e) {
            console.error("Adyen webhook error:", e);
            return new Response(
                JSON.stringify({ error: "Webhook processing failed" }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    }),
});

// Handle CORS preflight for Stripe webhook route
http.route({
    path: "/webhooks/stripe",
    method: "OPTIONS",
    handler: httpAction(async (_ctx, request) => {
        return new Response(null, {
            status: 204,
            headers: corsHeaders(request.headers.get("Origin")),
        });
    }),
});

/**
 * Stripe webhook endpoint.
 * Receives Checkout Session and charge events from Stripe.
 */
http.route({
    path: "/webhooks/stripe",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.text();
            const signature = request.headers.get("stripe-signature") ?? "";

            await ctx.runAction(internal.billing.webhooks.stripeWebhook, {
                body,
                signature,
            });

            return new Response(JSON.stringify({ received: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } catch (e) {
            console.error("Stripe webhook error:", e);
            return new Response(
                JSON.stringify({ error: "Webhook processing failed" }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    }),
});

// =============================================================================
// REST API — OpenAPI-documented endpoints
// =============================================================================

import { apiRoutes, openApiSpec } from "./api/routes";
import { handleApiRequest } from "./lib/openapi";

// Swagger UI — interactive API documentation
http.route({
    path: "/api/docs",
    method: "GET",
    handler: httpAction(async (_ctx, request) => {
        const specUrl = new URL("/api/openapi.json", request.url).toString();
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "${specUrl}",
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: "BaseLayout",
      deepLinking: true,
      tryItOutEnabled: true,
    });
  </script>
</body>
</html>`;
        return new Response(html, {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                ...corsHeaders(request.headers.get("Origin")),
            },
        });
    }),
});

// Serve OpenAPI spec (no auth required)
http.route({
    path: "/api/openapi.json",
    method: "GET",
    handler: httpAction(async (_ctx, request) => {
        return new Response(JSON.stringify(openApiSpec, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders(request.headers.get("Origin")),
            },
        });
    }),
});

// ---------------------------------------------------------------------------
// REST API dispatch
//
// All /api/v1/* requests are handled by pathPrefix routes that delegate to
// handleApiRequest(), which matches the URL against the registered apiRoutes
// and dispatches to the corresponding Convex domain function.
// ---------------------------------------------------------------------------

/** Create an httpAction handler that dispatches via the REST adapter. */
function apiHandler() {
    return httpAction(async (ctx, request) => {
        return handleApiRequest(ctx, request, apiRoutes);
    });
}

// Register pathPrefix handlers for each HTTP method.
// Convex matches exact paths first, then pathPrefix. Since all our API routes
// live under /api/v1/, a single pathPrefix per method covers everything —
// including parameterized paths like /api/v1/resources/:id.

const apiMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

for (const method of apiMethods) {
    http.route({
        pathPrefix: "/api/v1/",
        method,
        handler: apiHandler(),
    });
}

// CORS preflight for all API routes
http.route({
    pathPrefix: "/api/v1/",
    method: "OPTIONS",
    handler: httpAction(async (_ctx, request) => {
        return new Response(null, {
            status: 204,
            headers: corsHeaders(request.headers.get("Origin")),
        });
    }),
});

export default http;
