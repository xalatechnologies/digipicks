/**
 * Email Sending Action
 *
 * Convex internalAction that renders an email template, wraps it in a
 * professional branded HTML layout, and sends via Resend API.
 *
 * Called via ctx.scheduler.runAfter(0, ...) from booking lifecycle mutations.
 *
 * Flow:
 * 1. Look up template by tenantId + category/name
 * 2. Check user notification preferences (GDPR opt-out)
 * 3. Render template with variables
 * 4. Look up tenant branding (logo, colors) for layout
 * 5. Wrap in professional HTML email layout
 * 6. Get Resend API key (tenant integration config → env fallback)
 * 7. Send via Resend API (or console.log in dev)
 */

import { internalAction } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";
import { renderTemplate } from "./templateRenderer";
import { wrapInEmailLayout } from "./baseLayout";

export const send = internalAction({
    args: {
        tenantId: v.string(),
        templateCategory: v.string(),
        templateName: v.optional(v.string()),
        recipientEmail: v.string(),
        recipientName: v.optional(v.string()),
        userId: v.optional(v.string()),
        variables: v.any(),
    },
    handler: async (ctx, args) => {
        // 1. Look up template
        const templates = await ctx.runQuery(
            components.notifications.functions.listEmailTemplates,
            { tenantId: args.tenantId }
        );

        const template = args.templateName
            ? templates.find(
                  (t: any) =>
                      t.name === args.templateName && t.isActive
              )
            : templates.find(
                  (t: any) =>
                      t.category === args.templateCategory &&
                      t.isActive &&
                      t.isDefault
              ) ??
              templates.find(
                  (t: any) =>
                      t.category === args.templateCategory && t.isActive
              );

        if (!template) {
            console.warn(
                `No active email template for category="${args.templateCategory}" tenant="${args.tenantId}"`
            );
            return { success: false, reason: "no_template" };
        }

        // 2. Check notification preferences (GDPR opt-out)
        if (args.userId) {
            try {
                const prefs = await ctx.runQuery(
                    components.notifications.functions.getPreferences,
                    { userId: args.userId }
                );
                const emailPref = (prefs as any[]).find(
                    (p: any) =>
                        p.channel === "email" &&
                        p.category === args.templateCategory
                );
                if (emailPref && !emailPref.enabled) {
                    return { success: false, reason: "user_opted_out" };
                }
            } catch {
                // No preferences set — proceed (default: opted in)
            }
        }

        // 3. Render template
        const subject = renderTemplate(
            (template as any).subject,
            args.variables
        );
        const bodyContent = renderTemplate(
            (template as any).body,
            args.variables
        );

        // 4. Look up tenant branding for layout
        let logoUrl: string | undefined;
        let primaryColor: string | undefined;
        let accentColor: string | undefined;
        let tenantName = args.variables?.tenant?.name || (process.env.PLATFORM_NAME || "Platform");
        let tenantUrl = process.env.WEB_APP_URL || "http://localhost:5190";

        try {
            // Try brand assets for logo
            const brandAssets = await ctx.runQuery(
                components.tenantConfig.queries.listBrandAssets,
                { tenantId: args.tenantId }
            );
            const logo = (brandAssets as any[]).find(
                (a: any) => a.assetType === "logo"
            );
            if (logo?.url) logoUrl = logo.url;

            // Try brand config for colors
            const brandConfig = await ctx.runQuery(
                components.tenantConfig.queries.getBranding,
                { tenantId: args.tenantId }
            );
            if (brandConfig) {
                primaryColor = (brandConfig as any).primaryColor;
                accentColor = (brandConfig as any).accentColor;
            }
        } catch {
            // No branding config — use defaults
        }

        // 5. Wrap in professional HTML email layout
        const html = wrapInEmailLayout({
            body: bodyContent,
            subject,
            tenantName,
            tenantUrl,
            primaryColor,
            accentColor,
            logoUrl,
        });

        // 6. Get Resend API key (tenant integration → env fallback)
        let apiKey: string | undefined;
        let fromEmail =
            process.env.EMAIL_FROM || "noreply@example.com";
        let fromName =
            process.env.EMAIL_FROM_NAME || "Xala";

        try {
            const emailConfig = await ctx.runQuery(
                components.integrations.queries.getConfigInternal,
                {
                    tenantId: args.tenantId,
                    integrationType: "email",
                }
            );
            if (
                emailConfig?.isEnabled &&
                emailConfig.apiKey
            ) {
                apiKey = emailConfig.apiKey;
                if (emailConfig.config?.fromEmail)
                    fromEmail = emailConfig.config.fromEmail;
                if (emailConfig.config?.fromName)
                    fromName = emailConfig.config.fromName;
            }
        } catch {
            // No tenant-level config, fall through to env
        }

        if (!apiKey) {
            apiKey = process.env.RESEND_API_KEY;
        }

        // 7. Dev mode fallback
        if (!apiKey) {
            console.log("=== EMAIL (dev mode) ===");
            console.log("To:", args.recipientEmail);
            console.log("Subject:", subject);
            console.log(
                "Body:",
                bodyContent.substring(0, 300)
            );
            console.log("========================");
            return { success: true, devMode: true };
        }

        // 8. Send via Resend API
        // BCC notification inbox for all non-auth emails (booking, tenant, user events)
        const NOTIFICATION_BCC = process.env.NOTIFICATION_BCC || "";
        const AUTH_CATEGORIES = ["auth", "login", "magic_link", "email_code", "password_reset", "mfa"];
        const isAuthEmail = AUTH_CATEGORIES.includes(args.templateCategory);

        const response = await fetch(
            "https://api.resend.com/emails",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: `${fromName} <${fromEmail}>`,
                    to: [args.recipientEmail],
                    ...(!isAuthEmail && NOTIFICATION_BCC ? { bcc: [NOTIFICATION_BCC] } : {}),
                    subject,
                    html,
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error("Email send failed:", error);
            return {
                success: false,
                reason: "api_error",
                error,
            };
        }

        const result = await response.json();

        // 9. Increment template sendCount
        try {
            await ctx.runMutation(
                components.notifications.functions
                    .updateEmailTemplate,
                {
                    id: (template as any)._id,
                    sendCount:
                        ((template as any).sendCount ?? 0) + 1,
                } as any
            );
        } catch {
            // Non-critical — don't fail the send
        }

        return {
            success: true,
            resendId: result?.id,
        };
    },
});
