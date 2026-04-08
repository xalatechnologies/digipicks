/**
 * Altinn Integration Types
 *
 * Types for Altinn authorization (organizations, roles).
 * Used by web app and potentially backoffice when Altinn integration is enabled.
 */

export interface AltinnParty {
    partyId: string;
    orgNumber: string;
    name: string;
    type: 'Organization' | 'Person' | 'SubUnit';
    roles: AltinnRole[];
    accessPackages: string[];
}

export interface AltinnRole {
    roleId: string;
    roleName: string;
    roleType: string;
}
