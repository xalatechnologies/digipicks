/**
 * Altinn adapter — Maps Altinn API responses to shared AltinnParty type.
 * Extracted from AltinnProvider to reduce business logic in provider (guardrail compliance).
 */

import type { AltinnParty } from '@digipicks/shared';

export interface AltinnApiParty {
  partyId: number;
  orgNumber?: string;
  name?: string;
  unitType?: string;
  roles?: Array<{ roleDefinitionId: string; roleName: string; roleType: string }>;
  accessPackages?: string[];
}

/**
 * Maps Altinn API party response to AltinnParty
 */
export function mapAltinnParty(party: AltinnApiParty): AltinnParty {
  return {
    partyId: String(party.partyId),
    orgNumber: party.orgNumber ?? '',
    name: party.name ?? '',
    type: party.unitType === 'BEDR' ? 'SubUnit' : 'Organization',
    roles: (party.roles || []).map((r) => ({
      roleId: r.roleDefinitionId,
      roleName: r.roleName,
      roleType: r.roleType,
    })),
    accessPackages: party.accessPackages || [],
  };
}
