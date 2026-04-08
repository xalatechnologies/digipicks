/**
 * DigilistSaaS SDK - Signup Hooks
 *
 * React hooks for user registration.
 * Mutation hooks: { mutate, mutateAsync }
 * Query hooks: { data, isLoading, error }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";

// ============================================================================
// Types
// ============================================================================

export interface SignUpInput {
    email: string;
    password: string;
    name: string;
    appId?: string;
}

export interface SignUpResult {
    success: boolean;
    error?: string;
    user?: {
        id: string;
        email: string;
        name: string;
        displayName: string;
        role: string;
    };
    sessionToken?: string;
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Register a new user account.
 * Connected to: api.auth.signup.signUp
 */
export function useSignUp() {
    const mutationFn = useConvexMutation(api.auth.signup.signUp);

    return {
        mutate: (args: SignUpInput) => {
            mutationFn(args);
        },
        mutateAsync: (args: SignUpInput): Promise<SignUpResult> => {
            return mutationFn(args) as Promise<SignUpResult>;
        },
    };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Check if an email is available for registration.
 * Connected to: api.auth.signup.checkEmailAvailable
 */
export function useCheckEmailAvailable(email: string | undefined) {
    const data = useConvexQuery(
        api.auth.signup.checkEmailAvailable,
        email && email.includes('@') ? { email } : "skip"
    );

    return {
        data: data as { available: boolean } | undefined,
        isLoading: email !== undefined && email.includes('@') && data === undefined,
        error: null,
    };
}
