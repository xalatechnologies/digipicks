/**
 * Email Service Module
 *
 * Centralized email sending via Resend API. This is the low-level transport
 * layer; it accepts pre-rendered HTML and sends it. For template rendering,
 * see `convex/email/send.ts` (template-based) or `convex/lib/emailTemplates.ts`
 * (ticket lifecycle templates).
 *
 * Supports:
 *   - Per-tenant sender configuration (via integrations component)
 *   - Fallback to environment variables (RESEND_API_KEY, EMAIL_FROM)
 *   - Dev mode: logs to console when no API key is configured
 *   - GDPR opt-out check via notification preferences
 *
 * Usage from a mutation:
 *   import { internal } from "../_generated/api";
 *   await ctx.scheduler.runAfter(0, internal.lib.email.sendEmail, {
 *     tenantId,
 *     to: "user@example.com",
 *     subject: "Your tickets",
 *     html: "<h1>Hello</h1>",
 *   });
 */

import { internalAction } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

// =============================================================================
// SEND EMAIL — Internal Action
// =============================================================================

/**
 * Send a pre-rendered email via Resend API.
 *
 * Called via ctx.scheduler.runAfter(0, internal.lib.email.sendEmail, {...})
 * from mutations. Fire-and-forget: never blocks the calling mutation.
 */
export const sendEmail = internalAction({
    args: {
        tenantId: v.string(),
        to: v.string(),
        subject: v.string(),
        html: v.string(),
        from: v.optional(v.string()),
        userId: v.optional(v.string()),
        emailCategory: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // 1. Check notification preferences (GDPR opt-out)
        if (args.userId && args.emailCategory) {
            try {
                const prefs = await ctx.runQuery(
                    components.notifications.functions.getPreferences,
                    { userId: args.userId }
                );
                const emailPref = (prefs as any[]).find(
                    (p: any) =>
                        p.channel === "email" &&
                        p.category === args.emailCategory
                );
                if (emailPref && !emailPref.enabled) {
                    console.log(
                        `Email skipped: user ${args.userId} opted out of "${args.emailCategory}" emails`
                    );
                    return { success: false, reason: "user_opted_out" };
                }
            } catch {
                // No preferences set — proceed (default: opted in)
            }
        }

        // 2. Resolve sender address
        let apiKey: string | undefined;
        let fromAddress = args.from ?? process.env.EMAIL_FROM ?? "noreply@example.com";
        let fromName = process.env.EMAIL_FROM_NAME ?? "Platform";

        // Try tenant-specific email integration config
        try {
            const emailConfig = await ctx.runQuery(
                components.integrations.queries.getConfigInternal,
                {
                    tenantId: args.tenantId,
                    integrationType: "email",
                }
            );
            if (emailConfig?.isEnabled && emailConfig.apiKey) {
                apiKey = emailConfig.apiKey;
                if (emailConfig.config?.fromEmail) {
                    fromAddress = emailConfig.config.fromEmail;
                }
                if (emailConfig.config?.fromName) {
                    fromName = emailConfig.config.fromName;
                }
            }
        } catch {
            // No tenant-level config — fall through to env
        }

        if (!apiKey) {
            apiKey = process.env.RESEND_API_KEY;
        }

        // 3. Dev mode fallback
        if (!apiKey) {
            console.log("=== EMAIL (dev mode) ===");
            console.log(`To: ${args.to}`);
            console.log(`Subject: ${args.subject}`);
            console.log(`Body: ${args.html.substring(0, 500)}`);
            console.log("========================");
            return { success: true, devMode: true };
        }

        // 4. Send via Resend API
        try {
            // BCC notification inbox for non-auth emails
            const NOTIFICATION_BCC = process.env.NOTIFICATION_BCC || "";
            const AUTH_CATEGORIES = ["auth", "login", "magic_link", "email_code", "password_reset", "mfa"];
            const isAuthEmail = AUTH_CATEGORIES.includes(args.emailCategory || "");

            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: `${fromName} <${fromAddress}>`,
                    to: [args.to],
                    ...(!isAuthEmail && NOTIFICATION_BCC ? { bcc: [NOTIFICATION_BCC] } : {}),
                    subject: args.subject,
                    html: args.html,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                console.error(`Email send failed to ${args.to}:`, error);
                return { success: false, reason: "api_error", error };
            }

            const result = await response.json();
            return { success: true, resendId: result?.id };
        } catch (error) {
            console.error(
                `Email send error to ${args.to}:`,
                error instanceof Error ? error.message : String(error)
            );
            return {
                success: false,
                reason: "network_error",
                error: error instanceof Error ? error.message : String(error),
            };
        }
    },
});
