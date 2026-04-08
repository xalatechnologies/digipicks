/**
 * Altinn Authorization Integration
 *
 * Convex actions for interacting with Altinn 3 Authorization API.
 * Provides organization representation and role validation through:
 * - Token exchange (ID-porten → Altinn)
 * - Authorized parties lookup
 * - Tilgangspakker (access package) retrieval
 */

import { action } from '../_generated/server';
import { v } from 'convex/values';

// =============================================================================
// Types
// =============================================================================

/** Organization party returned from Altinn */
export interface AltinnParty {
    partyId: string;
    orgNumber: string;
    name: string;
    type: 'Organization' | 'Person' | 'SubUnit';
    /** Roles the user has for this party */
    roles: AltinnRole[];
    /** Access packages delegated to the user */
    accessPackages: string[];
}

/** Role information from Altinn */
export interface AltinnRole {
    roleId: string;
    roleName: string;
    roleType: string;
}

/** Token exchange response */
interface TokenExchangeResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

// =============================================================================
// Configuration
// =============================================================================

const ALTINN_TOKEN_EXCHANGE_URL =
    process.env.ALTINN_TOKEN_EXCHANGE_URL ||
    'https://platform.altinn.no/authentication/api/v1/exchange/id-porten';

const ALTINN_AUTHORIZATION_URL =
    process.env.ALTINN_AUTHORIZATION_URL ||
    'https://platform.altinn.no/authorization/api/v1';

// =============================================================================
// Actions
// =============================================================================

/**
 * Exchange ID-porten token for Altinn token
 * This is required before making any Altinn Authorization API calls
 */
export const exchangeToken = action({
    args: {
        idPortenToken: v.string(),
    },
    handler: async (_ctx, args): Promise<{ altinnToken: string; expiresIn: number } | null> => {
        try {
            const response = await fetch(ALTINN_TOKEN_EXCHANGE_URL, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${args.idPortenToken}`,
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                console.error('Altinn token exchange failed:', response.status, await response.text());
                return null;
            }

            const data: TokenExchangeResponse = await response.json();
            return {
                altinnToken: data.access_token,
                expiresIn: data.expires_in,
            };
        } catch (error) {
            console.error('Altinn token exchange error:', error);
            return null;
        }
    },
});

/**
 * Fetch authorized parties (organizations the user can represent)
 * Uses the Altinn Authorization API to get the list of parties
 */
export const getAuthorizedParties = action({
    args: {
        altinnToken: v.string(),
    },
    handler: async (_ctx, args): Promise<AltinnParty[]> => {
        try {
            const response = await fetch(`${ALTINN_AUTHORIZATION_URL}/parties?includeSubunits=true`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${args.altinnToken}`,
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                console.error('Altinn parties fetch failed:', response.status, await response.text());
                return [];
            }

            const parties = await response.json();

            // Map Altinn response to our AltinnParty type
            return parties
                .filter((party: any) => party.orgNumber) // Only include organizations
                .map((party: any): AltinnParty => ({
                    partyId: String(party.partyId),
                    orgNumber: party.orgNumber,
                    name: party.name,
                    type: party.unitType === 'BEDR' ? 'SubUnit' : 'Organization',
                    roles: (party.roles || []).map((role: any) => ({
                        roleId: role.roleDefinitionId,
                        roleName: role.roleName,
                        roleType: role.roleType,
                    })),
                    accessPackages: party.accessPackages || [],
                }));
        } catch (error) {
            console.error('Altinn parties fetch error:', error);
            return [];
        }
    },
});

/**
 * Get roles for a specific party (organization)
 * Returns the user's roles and access packages for the specified org
 */
export const getPartyRoles = action({
    args: {
        altinnToken: v.string(),
        partyId: v.string(),
    },
    handler: async (_ctx, args): Promise<{ roles: AltinnRole[]; accessPackages: string[] } | null> => {
        try {
            const response = await fetch(`${ALTINN_AUTHORIZATION_URL}/parties/${args.partyId}/roles`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${args.altinnToken}`,
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                console.error('Altinn roles fetch failed:', response.status, await response.text());
                return null;
            }

            const data = await response.json();

            return {
                roles: (data.roles || []).map((role: any) => ({
                    roleId: role.roleDefinitionId,
                    roleName: role.roleName,
                    roleType: role.roleType,
                })),
                accessPackages: data.accessPackages || [],
            };
        } catch (error) {
            console.error('Altinn roles fetch error:', error);
            return null;
        }
    },
});

/**
 * Check if user has specific access package for an organization
 * Used for granular permission checks (e.g., "Eiendomsforvaltning")
 */
export const hasAccessPackage = action({
    args: {
        altinnToken: v.string(),
        partyId: v.string(),
        packageId: v.string(),
    },
    handler: async (_ctx, args): Promise<boolean> => {
        try {
            const rolesResult = await fetch(
                `${ALTINN_AUTHORIZATION_URL}/parties/${args.partyId}/roles`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${args.altinnToken}`,
                        Accept: 'application/json',
                    },
                }
            );

            if (!rolesResult.ok) {
                return false;
            }

            const data = await rolesResult.json();
            const packages = data.accessPackages || [];
            return packages.includes(args.packageId);
        } catch (error) {
            console.error('Access package check error:', error);
            return false;
        }
    },
});
