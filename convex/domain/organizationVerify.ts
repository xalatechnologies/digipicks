/**
 * Organization Verification — Brønnøysundregistrene (BRREG) lookup.
 *
 * Convex ACTION (not mutation) because it performs external HTTP calls.
 * Verifies a Norwegian organization number against the Enhetsregisteret API.
 */

import { action } from "../_generated/server";
import { v } from "convex/values";

export const verify = action({
    args: { orgNumber: v.string() },
    handler: async (_ctx, { orgNumber }) => {
        try {
            const res = await fetch(
                `https://data.brreg.no/enhetsregisteret/api/enheter/${orgNumber}`,
                { signal: AbortSignal.timeout(5000) },
            );
            if (!res.ok) {
                return { valid: false, name: null, orgForm: null, address: null };
            }
            const data = await res.json();
            return {
                valid: true,
                name: data.navn || null,
                orgForm: data.organisasjonsform?.kode || null,
                address: data.forretningsadresse?.adresse?.[0] || null,
            };
        } catch {
            return { valid: false, name: null, orgForm: null, address: null };
        }
    },
});
