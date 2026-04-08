import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Start OAuth flow for external providers.
 *
 * All providers use standard OIDC authorize URL redirect.
 * BankID/ID-porten goes via Signicat OIDC with acr_values for BankID method.
 */
export const startOAuth = action({
    args: {
        provider: v.string(), // "bankid" | "idporten" | "vipps" | "google" | "azure" | "microsoft"
        appOrigin: v.string(), // e.g. "http://localhost:5173"
        returnPath: v.optional(v.string()), // e.g. "/dashboard"
        appId: v.string(), // "web" | "backoffice" | "minside"
    },
    handler: async (ctx, { provider, appOrigin, returnPath, appId }) => {
        const state = crypto.randomUUID();

        // The callback URL is the Convex HTTP endpoint
        const siteUrl = process.env.CONVEX_SITE_URL;
        const redirectUri = `${siteUrl}/auth/callback`;

        let authUrl: string;
        let codeVerifier: string | undefined;

        switch (provider) {
            case "bankid":
            case "idporten": {
                // Standard OIDC flow via Signicat sandbox (with PKCE)
                const bankidClientId = process.env.BANKID_CLIENT_ID;
                const bankidAuthorizeUrl =
                    process.env.BANKID_AUTHORIZE_URL ||
                    "https://digilist.sandbox.signicat.com/auth/open/connect/authorize";

                // Generate PKCE code verifier + challenge
                codeVerifier = generateCodeVerifier();
                const codeChallenge = await computeCodeChallenge(codeVerifier);

                authUrl =
                    `${bankidAuthorizeUrl}?` +
                    new URLSearchParams({
                        response_type: "code",
                        client_id: bankidClientId!,
                        redirect_uri: redirectUri,
                        scope: "openid profile nin",
                        state,
                        prompt: "login",
                        acr_values: "urn:signicat:oidc:method:nbid",
                        code_challenge: codeChallenge,
                        code_challenge_method: "S256",
                    }).toString();
                break;
            }

            case "vipps": {
                const vippsClientId = process.env.VIPPS_CLIENT_ID;
                const vippsAuthorizeUrl =
                    process.env.VIPPS_AUTHORIZE_URL ||
                    "https://apitest.vipps.no/access-management-1.0/access/oauth2/auth";

                authUrl =
                    `${vippsAuthorizeUrl}?` +
                    new URLSearchParams({
                        response_type: "code",
                        client_id: vippsClientId!,
                        redirect_uri: redirectUri,
                        scope: "openid name email phoneNumber",
                        state,
                    }).toString();
                break;
            }

            case "google": {
                const googleClientId = process.env.GOOGLE_CLIENT_ID;
                authUrl =
                    `https://accounts.google.com/o/oauth2/v2/auth?` +
                    new URLSearchParams({
                        response_type: "code",
                        client_id: googleClientId!,
                        redirect_uri: redirectUri,
                        scope: "openid email profile",
                        state,
                    }).toString();
                break;
            }

            case "azure":
            case "microsoft": {
                const azureClientId = process.env.AZURE_CLIENT_ID;
                const azureTenantId =
                    process.env.AZURE_TENANT_ID || "common";

                authUrl =
                    `https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/authorize?` +
                    new URLSearchParams({
                        response_type: "code",
                        client_id: azureClientId!,
                        redirect_uri: redirectUri,
                        scope: "openid email profile",
                        state,
                    }).toString();
                break;
            }

            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }

        // Store state in oauthStates table for CSRF validation
        // codeVerifier is stored in signicatSessionId field (reused for PKCE)
        await ctx.runMutation(internal.auth.oauthStates.createState, {
            state,
            provider,
            appOrigin,
            returnPath: returnPath || "/",
            appId,
            signicatSessionId: codeVerifier,
        });

        return {
            authUrl,
            state,
            provider,
        };
    },
});

// =============================================================================
// PKCE Helpers
// =============================================================================

function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
}

async function computeCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
