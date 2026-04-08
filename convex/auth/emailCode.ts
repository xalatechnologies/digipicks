/**
 * Email Code Login — Vend/FINN-style OTP Authentication
 *
 * Flow:
 *   1. User enters email → requestEmailCode sends a 6-digit code via Resend
 *   2. User enters code  → verifyEmailCode validates code, creates session
 *
 * Codes expire after 10 minutes. Max 5 attempts per code.
 */

import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { wrapInEmailLayout } from "../email/baseLayout";

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

// =============================================================================
// Request Email Code
// =============================================================================

/**
 * Generate and send a 6-digit login code to the user's email.
 * Returns a verificationId to be used when verifying the code.
 */
export const requestEmailCode = action({
    args: {
        email: v.string(),
        appId: v.string(),
    },
    handler: async (ctx, { email, appId }) => {
        const normalizedEmail = email.toLowerCase().trim();

        // Generate 6-digit code
        const code = generateSixDigitCode();
        const now = Date.now();

        // Store the verification record
        const verificationId: string = await ctx.runMutation(
            internal.auth.emailCode.storeEmailCode,
            {
                email: normalizedEmail,
                code,
                appId,
                createdAt: now,
                expiresAt: now + CODE_EXPIRY_MS,
            }
        );

        // Send code via email
        await sendCodeEmail(normalizedEmail, code);

        return {
            success: true,
            verificationId,
        };
    },
});

/**
 * Internal mutation to store the email verification code.
 */
export const storeEmailCode = internalMutation({
    args: {
        email: v.string(),
        code: v.string(),
        appId: v.string(),
        createdAt: v.number(),
        expiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        // Invalidate any existing codes for this email
        const existing = await ctx.db
            .query("emailCodes")
            .withIndex("by_email", (q: any) => q.eq("email", args.email))
            .collect();

        for (const record of existing) {
            if (record.status === "pending") {
                await ctx.db.patch(record._id, { status: "expired" });
            }
        }

        // Create new code record
        const id = await ctx.db.insert("emailCodes", {
            email: args.email,
            code: args.code,
            appId: args.appId,
            status: "pending",
            attempts: 0,
            maxAttempts: MAX_ATTEMPTS,
            createdAt: args.createdAt,
            expiresAt: args.expiresAt,
        });

        return String(id);
    },
});

// =============================================================================
// Verify Email Code
// =============================================================================

/**
 * Verify the 6-digit code and create a session.
 * Returns session token and user data on success.
 */
export const verifyEmailCode = action({
    args: {
        verificationId: v.string(),
        code: v.string(),
        email: v.string(),
        appId: v.string(),
    },
    handler: async (ctx, { verificationId, code, email, appId }): Promise<{
        success: boolean;
        error?: string;
        sessionToken?: string;
        user?: { id: string; email: string; name?: string; role: string; tenantId?: string };
        isNewUser?: boolean;
    }> => {
        const normalizedEmail = email.toLowerCase().trim();

        // Validate the code
        const validation = await ctx.runMutation(
            internal.auth.emailCode.validateCode,
            {
                verificationId,
                code,
                email: normalizedEmail,
            }
        );

        if (!validation.success) {
            return {
                success: false,
                error: validation.error,
            };
        }

        // Find or create user (reuse magic link's findOrCreateUser)
        const result = await ctx.runMutation(
            internal.auth.magicLink.findOrCreateUser,
            { email: normalizedEmail, appId }
        );

        // Create session
        const sessionToken: string = await ctx.runMutation(
            internal.auth.sessions.createSession,
            {
                userId: result.userId,
                provider: "email-code",
                appId,
            }
        );

        return {
            success: true,
            sessionToken,
            user: result.user,
            isNewUser: result.isNewUser,
        };
    },
});

/**
 * Internal mutation to validate the code.
 */
export const validateCode = internalMutation({
    args: {
        verificationId: v.string(),
        code: v.string(),
        email: v.string(),
    },
    handler: async (ctx, { verificationId, code, email }) => {
        const record: any = await ctx.db.get(verificationId as any);

        if (!record) {
            return { success: false, error: "Ugyldig verifisering" };
        }

        if (record.status !== "pending") {
            return { success: false, error: "Koden er allerede brukt eller utløpt" };
        }

        if (record.expiresAt < Date.now()) {
            await ctx.db.patch(record._id, { status: "expired" });
            return { success: false, error: "Koden har utløpt. Be om en ny kode." };
        }

        if (record.email !== email) {
            return { success: false, error: "E-postadressen stemmer ikke" };
        }

        // Increment attempts
        const newAttempts = (record.attempts || 0) + 1;
        await ctx.db.patch(record._id, { attempts: newAttempts });

        if (newAttempts > record.maxAttempts) {
            await ctx.db.patch(record._id, { status: "expired" });
            return { success: false, error: "For mange forsøk. Be om en ny kode." };
        }

        // Check code
        if (record.code !== code) {
            return {
                success: false,
                error: `Feil kode. ${record.maxAttempts - newAttempts} forsøk gjenstår.`,
            };
        }

        // Mark as verified
        await ctx.db.patch(record._id, { status: "verified" });
        return { success: true };
    },
});

// =============================================================================
// Helpers
// =============================================================================

function generateSixDigitCode(): string {
    const array = new Uint8Array(4);
    crypto.getRandomValues(array);
    const num = ((array[0] << 24) | (array[1] << 16) | (array[2] << 8) | array[3]) >>> 0;
    return String(num % 900000 + 100000); // Always 6 digits (100000–999999)
}

/**
 * Send the login code via Resend email with branded template.
 */
async function sendCodeEmail(email: string, code: string): Promise<void> {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
        // Development fallback
        console.log("=== EMAIL CODE (dev mode) ===");
        console.log("To:", email);
        console.log("Code:", code);
        console.log("=============================");
        return;
    }

    const fromEmail = process.env.EMAIL_FROM || "noreply@example.com";
    const fromName = process.env.EMAIL_FROM_NAME || "Xala";

    const bodyContent = `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1C362D;">Din innloggingskode</h2>
<p style="margin:0 0 24px;color:#666;">Bruk koden under for å logge inn.</p>

<div style="margin:0 0 24px;text-align:center;">
    <div style="display:inline-block;background:#F3F4F6;border-radius:12px;padding:20px 40px;letter-spacing:12px;font-size:36px;font-weight:700;font-family:'Courier New',monospace;color:#1C362D;">
        ${code}
    </div>
</div>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr>
        <td style="background-color:#FFFBEB;border-left:4px solid #F59E0B;border-radius:6px;padding:14px 18px;font-size:14px;line-height:1.5;color:#92400E;">
            Koden utl&oslash;per om <strong>10 minutter</strong>. Den kan bare brukes &eacute;n gang.
        </td>
    </tr>
</table>

<p style="margin:0;font-size:13px;color:#999;">Hvis du ikke ba om denne koden, kan du trygt ignorere denne e-posten.</p>`;

    const html = wrapInEmailLayout({
        body: bodyContent.trim(),
        subject: `Din innloggingskode for ${fromName}`,
        preheader: `Din kode: ${code} — utløper om 10 minutter`,
    });

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [email],
            subject: `${code} er din innloggingskode`,
            html,
            text: `Din innloggingskode for ${fromName}: ${code}\n\nKoden utløper om 10 minutter og kan bare brukes én gang.\n\nHvis du ikke ba om denne koden, kan du trygt ignorere denne e-posten.`,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("Failed to send code email:", error);
        throw new Error("Kunne ikke sende kode. Prøv igjen.");
    }
}
