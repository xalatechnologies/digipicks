import { internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";

const BACKOFFICE_OWNER_PERMISSIONS = [
    "resource:view",
    "resource:write",
    "resource:publish",
    "resource:delete",
    "messaging:admin",
    "review:moderate",
    "user:manage",
    "user:deactivate",
    "tenant:configure",
    "org:manage",
    "audit:view",
];

/**
 * Handle OAuth callback from external providers.
 * Called by the HTTP router after consuming the oauthState.
 *
 * All providers use standard OIDC: code exchange → token → userinfo.
 */
export const handleCallback = internalAction({
    args: {
        code: v.optional(v.string()),
        state: v.string(),
        provider: v.string(),
        appId: v.optional(v.string()),
        signicatSessionId: v.optional(v.string()),
    },
    handler: async (
        ctx,
        { code, provider, appId, signicatSessionId: codeVerifier }
    ): Promise<{
        success: boolean;
        user: unknown;
        isNewUser: boolean;
    }> => {
        let userInfo: Record<string, unknown>;

        const siteUrl = process.env.CONVEX_SITE_URL;
        const redirectUri = `${siteUrl}/auth/callback`;

        switch (provider) {
            case "bankid":
            case "idporten": {
                // Standard OIDC: code exchange + userinfo via Signicat
                if (!code) throw new Error("Missing code for BankID callback");
                const tokenResponse = await exchangeBankidCode(code, redirectUri, codeVerifier);
                userInfo = await fetchBankidUserInfo(
                    tokenResponse.access_token as string
                );
                // Ensure NIN is extracted from Signicat-specific claims
                if (!userInfo.nin && userInfo["signicat.national_id"]) {
                    userInfo.nin = userInfo["signicat.national_id"];
                }
                // BankID may not return email — use NIN-based placeholder
                if (!userInfo.email && userInfo.nin) {
                    userInfo.email = `${userInfo.nin}@bankid.no`;
                }
                break;
            }

            case "vipps": {
                if (!code) throw new Error("Missing code for Vipps callback");
                const tokenResponse = await exchangeVippsCode(code, redirectUri);
                userInfo = await fetchVippsUserInfo(
                    tokenResponse.access_token as string
                );
                break;
            }

            case "google": {
                if (!code) throw new Error("Missing code for Google callback");
                const tokenResponse = await exchangeGoogleCode(code, redirectUri);
                userInfo = await fetchGoogleUserInfo(
                    tokenResponse.access_token as string
                );
                break;
            }

            case "azure":
            case "microsoft": {
                if (!code) throw new Error("Missing code for Azure callback");
                const tokenResponse = await exchangeAzureCode(code, redirectUri);
                userInfo = await fetchAzureUserInfo(
                    tokenResponse.access_token as string
                );
                break;
            }

            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }

        // Extract NIN (national identity number) from BankID/ID-porten
        const nin = (userInfo.nin || userInfo["signicat.national_id"]) as string | undefined;
        // Extract phone number from Vipps
        const phoneNumber = (userInfo.phone_number || userInfo.phoneNumber) as string | undefined;

        // Create or update user in database
        const result = await ctx.runMutation(internal.auth.callback.upsertUser, {
            email: userInfo.email as string,
            name: (userInfo.name || userInfo.given_name) as string | undefined,
            provider,
            providerId: (userInfo.sub || userInfo.id || userInfo.oid) as string,
            appId,
            nin,
            phoneNumber,
        });

        return {
            success: true,
            user: result.user,
            isNewUser: result.isNewUser,
        };
    },
});

// Internal mutation to create/update user
// Matches by NIN first (if available), then by email
export const upsertUser = internalMutation({
    args: {
        email: v.string(),
        name: v.optional(v.string()),
        provider: v.string(),
        providerId: v.string(),
        appId: v.optional(v.string()),
        nin: v.optional(v.string()),
        phoneNumber: v.optional(v.string()),
    },
    handler: async (ctx, { email, name, provider, providerId, appId, nin, phoneNumber }) => {
        const shouldProvisionBackoffice = appId === "backoffice";

        // 1. Try match by NIN (most reliable identifier from BankID)
        let existingUser = null;
        if (nin) {
            existingUser = await ctx.db
                .query("users")
                .withIndex("by_nin", (q) => q.eq("nin", nin))
                .first();
        }

        // 2. Fall back to email match
        if (!existingUser) {
            existingUser = await ctx.db
                .query("users")
                .withIndex("by_email", (q) => q.eq("email", email))
                .first();
        }

        if (existingUser) {
            const patch: Record<string, unknown> = {
                lastLoginAt: Date.now(),
                authUserId: providerId,
            };
            if (nin && !existingUser.nin) patch.nin = nin;
            if (phoneNumber) patch.phoneNumber = phoneNumber;
            if (shouldProvisionBackoffice && existingUser.role !== "owner" && existingUser.role !== "admin") {
                patch.role = "owner";
            }

            await ctx.db.patch(existingUser._id, patch);
            let updatedUser = await ctx.db.get(existingUser._id);
            if (shouldProvisionBackoffice && updatedUser) {
                const tenantId = await ensureDedicatedOwnerTenant(
                    ctx,
                    updatedUser._id as string,
                    updatedUser.email,
                    updatedUser.name
                );
                if (String(updatedUser.tenantId ?? "") !== tenantId) {
                    await ctx.db.patch(updatedUser._id, {
                        tenantId: tenantId as any,
                    });
                }
                await ensureBackofficeAccess(ctx, updatedUser._id as string, tenantId);
                updatedUser = await ctx.db.get(updatedUser._id);
            }
            return { user: updatedUser ?? { ...existingUser, ...patch }, isNewUser: false };
        }

        // 3. Create new public user (no tenant — web/minside users see everything;
        //    backoffice tenant membership is managed explicitly via admin tools)
        const initialRole = shouldProvisionBackoffice ? "owner" : "member";
        const userId = await ctx.db.insert("users", {
            email,
            name,
            authUserId: providerId,
            nin,
            phoneNumber,
            role: initialRole,
            status: "active",
            metadata: { provider },
            lastLoginAt: Date.now(),
        });

        const user = await ctx.db.get(userId);
        if (shouldProvisionBackoffice && user) {
            const tenantId = await ensureDedicatedOwnerTenant(
                ctx,
                user._id as string,
                user.email,
                user.name
            );
            if (String(user.tenantId ?? "") !== tenantId) {
                await ctx.db.patch(user._id, {
                    tenantId: tenantId as any,
                });
            }
            await ensureBackofficeAccess(ctx, user._id as string, tenantId);
            const hydratedUser = await ctx.db.get(user._id);
            return { user: hydratedUser, isNewUser: true };
        }
        return { user, isNewUser: true };
    },
});

function normalizeTenantSlug(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
}

async function ensureUniqueTenantSlug(ctx: any, preferred: string): Promise<string> {
    let slug = preferred || `tenant-${Date.now()}`;
    let suffix = 1;
    while (true) {
        const existing = await ctx.db
            .query("tenants")
            .withIndex("by_slug", (q: any) => q.eq("slug", slug))
            .first();
        if (!existing) return slug;
        slug = `${preferred}-${suffix}`;
        suffix += 1;
    }
}

async function ensureDedicatedOwnerTenant(
    ctx: any,
    userId: string,
    email: string,
    name?: string
): Promise<string> {
    const currentUser = await ctx.db.get(userId as any);
    if (!currentUser) throw new Error("User not found");

    if (currentUser.tenantId) {
        const existingTenant = await ctx.db.get(currentUser.tenantId);
        if (existingTenant && String(existingTenant.ownerId ?? "") === userId) {
            return String(existingTenant._id);
        }
    }

    const baseSlug = normalizeTenantSlug(email.split("@")[0] || `tenant-${userId.slice(-6)}`);
    const slug = await ensureUniqueTenantSlug(ctx, baseSlug);
    const tenantName = name?.trim() ? `${name} - Backoffice` : `${email} - Backoffice`;

    const tenantId = await ctx.db.insert("tenants", {
        name: tenantName,
        slug,
        status: "active",
        settings: {},
        seatLimits: { admin: 3, user: 50 },
        featureFlags: {},
        enabledCategories: ["ALLE", "LOKALER", "ARRANGEMENTER", "SPORT", "TORG"],
        ownerId: userId as any,
        contactEmail: email,
        onboardingStep: "tenant_created",
        plan: "starter",
    } as any);

    return String(tenantId);
}

async function ensureBackofficeAccess(
    ctx: any,
    userId: string,
    tenantId: string
) {
    const membership = await ctx.db
        .query("tenantUsers")
        .withIndex("by_tenant_user", (q: any) =>
            q.eq("tenantId", tenantId as any).eq("userId", userId as any)
        )
        .first();

    if (!membership) {
        await ctx.db.insert("tenantUsers", {
            tenantId: tenantId as any,
            userId: userId as any,
            status: "active",
            joinedAt: Date.now(),
        });
    } else if (membership.status !== "active") {
        await ctx.db.patch(membership._id, {
            status: "active",
            joinedAt: membership.joinedAt ?? Date.now(),
        });
    }

    const roles = await ctx.runQuery(components.rbac.queries.listRoles, {
        tenantId,
        limit: 200,
    });
    let ownerRole = roles.find((r: any) => r.name === "Owner");
    if (!ownerRole) {
        const created = await ctx.runMutation(components.rbac.mutations.createRole, {
            tenantId,
            name: "Owner",
            permissions: BACKOFFICE_OWNER_PERMISSIONS,
            isSystem: true,
        });
        ownerRole = { _id: created.id };
    }

    const userRoles = await ctx.runQuery(components.rbac.queries.listUserRoles, {
        userId,
        tenantId,
        limit: 200,
    });
    const hasOwnerRole = userRoles.some((assignment: any) => {
        const roleId = assignment.role?._id ?? assignment.roleId;
        return roleId === ownerRole._id;
    });

    if (!hasOwnerRole) {
        await ctx.runMutation(components.rbac.mutations.assignRole, {
            userId,
            roleId: ownerRole._id,
            tenantId,
        });
    }
}

// ============================================================================
// OIDC Token Exchange Helpers (BankID/Signicat, Vipps, Google, Azure)
// ============================================================================

async function exchangeBankidCode(
    code: string,
    redirectUri: string,
    codeVerifier?: string
): Promise<Record<string, unknown>> {
    const clientId = process.env.BANKID_CLIENT_ID!;
    const clientSecret = process.env.BANKID_CLIENT_SECRET!;
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    const body: Record<string, string> = {
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
    };
    if (codeVerifier) {
        body.code_verifier = codeVerifier;
    }

    const response = await fetch(
        process.env.BANKID_TOKEN_URL ||
        "https://digilist.sandbox.signicat.com/auth/open/connect/token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${basicAuth}`,
            },
            body: new URLSearchParams(body),
        }
    );

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`BankID token exchange failed (${response.status}): ${text}`);
    }

    return response.json();
}

async function fetchBankidUserInfo(
    accessToken: string
): Promise<Record<string, unknown>> {
    const response = await fetch(
        process.env.BANKID_USERINFO_URL ||
        "https://digilist.sandbox.signicat.com/auth/open/connect/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`BankID userinfo failed (${response.status}): ${text}`);
    }

    return response.json();
}

async function exchangeVippsCode(
    code: string,
    redirectUri: string
): Promise<Record<string, unknown>> {
    const clientId = process.env.VIPPS_CLIENT_ID!;
    const clientSecret = process.env.VIPPS_CLIENT_SECRET!;
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    const response = await fetch(
        process.env.VIPPS_TOKEN_URL ||
        "https://apitest.vipps.no/access-management-1.0/access/oauth2/token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${basicAuth}`,
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
            }),
        }
    );
    return response.json();
}

async function fetchVippsUserInfo(
    accessToken: string
): Promise<Record<string, unknown>> {
    const response = await fetch(
        process.env.VIPPS_USERINFO_URL ||
        "https://apitest.vipps.no/vipps-userinfo-api/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response.json();
}

async function exchangeGoogleCode(
    code: string,
    redirectUri: string
): Promise<Record<string, unknown>> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: redirectUri,
        }),
    });
    return response.json();
}

async function fetchGoogleUserInfo(
    accessToken: string
): Promise<Record<string, unknown>> {
    const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response.json();
}

async function exchangeAzureCode(
    code: string,
    redirectUri: string
): Promise<Record<string, unknown>> {
    const tenantId = process.env.AZURE_TENANT_ID || "common";
    const response = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                client_id: process.env.AZURE_CLIENT_ID!,
                client_secret: process.env.AZURE_CLIENT_SECRET!,
                redirect_uri: redirectUri,
            }),
        }
    );
    return response.json();
}

async function fetchAzureUserInfo(
    accessToken: string
): Promise<Record<string, unknown>> {
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    return {
        sub: data.id,
        oid: data.id,
        email: data.mail || data.userPrincipalName,
        name: data.displayName,
        given_name: data.givenName,
        family_name: data.surname,
    };
}
