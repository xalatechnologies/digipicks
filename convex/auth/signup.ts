/**
 * Public User Registration (Signup)
 *
 * Allows anyone to create an account on the DigiList platform.
 * New users start with role="user" and can become owners by creating a tenant.
 *
 * Flow:
 *   1. signUp: email + password + name → user record + hashed password
 *   2. Email verification triggered via existing verifyApi
 *   3. User logs in and can browse/book immediately
 *   4. To become an owner, user creates a tenant (Phase 2)
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { hashPassword } from "../lib/passwordHash";

// =============================================================================
// SIGNUP
// =============================================================================

/**
 * Register a new user account.
 *
 * - Validates uniqueness of email
 * - Hashes password with PBKDF2-SHA512
 * - Creates user with status="active" and role="user"
 * - Returns session token for immediate login
 */
export const signUp = mutation({
    args: {
        email: v.string(),
        password: v.string(),
        name: v.string(),
        appId: v.optional(v.string()),
    },
    handler: async (ctx, { email, password, name, appId }) => {
        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return { success: false, error: "Invalid email format" };
        }

        // Validate password strength
        const MIN_PASSWORD_LENGTH = 8;
        if (password.length < MIN_PASSWORD_LENGTH) {
            return {
                success: false,
                error: "Password must be at least 8 characters",
            };
        }

        // Check if email already exists
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
            .first();

        if (existingUser) {
            // Don't reveal whether the email exists (security)
            return { success: false, error: "Registration failed. Please try again." };
        }

        // Hash password with PBKDF2-SHA512
        const passwordHash = await hashPassword(password);

        // Create user record
        const userId = await ctx.db.insert("users", {
            email: normalizedEmail,
            name,
            displayName: name,
            role: "user",
            status: "active",
            passwordHash,
            emailVerified: false,
            phoneVerified: false,
            mfaEnabled: false,
            metadata: {},
            lastLoginAt: Date.now(),
        });

        // Create a session for immediate login
        const sessionToken: string = await ctx.runMutation(
            internal.auth.sessions.createSession,
            {
                userId,
                provider: "password",
                appId,
            }
        );

        return {
            success: true as const,
            user: {
                id: userId,
                email: normalizedEmail,
                name,
                displayName: name,
                role: "user",
            },
            sessionToken,
        };
    },
});

// =============================================================================
// CHECK EMAIL AVAILABILITY
// =============================================================================

/**
 * Check if an email is available for registration.
 * Used by the registration form for real-time validation.
 */
export const checkEmailAvailable = query({
    args: {
        email: v.string(),
    },
    handler: async (ctx, { email }) => {
        const normalizedEmail = email.toLowerCase().trim();
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
            .first();

        return { available: !existing };
    },
});
