/**
 * DigilistSaaS SDK — Compliance Hooks
 *
 * React hooks for compliance checks and reporting.
 * Connected to Convex domain/compliance.ts.
 */

import { useQuery as useConvexQuery, useMutation } from "convex/react";
import { api } from "../convex-api";

export function useConsentSummary(userId: string | undefined) {
    const data = useConvexQuery(api.domain.compliance.getConsentSummary, userId ? { userId } : "skip");
    return { data: data ?? null, isLoading: userId !== undefined && data === undefined, error: null };
}

export function useUpdateConsent() { return useMutation(api.domain.compliance.updateConsent); }
export function useSubmitDSAR() { return useMutation(api.domain.compliance.submitDSAR); }
