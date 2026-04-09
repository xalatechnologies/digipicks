/**
 * AltinnProvider — Shared Altinn Authorization
 *
 * SSO invariants (docs/SHARED_INFRASTRUCTURE.md §3):
 * - Depends on IdPorten token in localStorage (digilist_saas_idporten_token)
 * - Token obtained via main auth flow; do not change AuthProvider or OAuth callback without verifying Altinn
 *
 * Opt-in: Wrap only when VITE_ALTINN_ENABLED=true. Use LazyAltinnProvider for tree-shaking.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthProvider';
import type { AltinnParty, AltinnRole } from '@digipicks/shared';
import { mapAltinnParty } from '../adapters/altinn-adapter';
import { env } from '../env';

export type { AltinnParty, AltinnRole };

interface AltinnContextType {
  altinnToken: string | null;
  isExchangingToken: boolean;
  authorizedParties: AltinnParty[];
  isLoadingParties: boolean;
  error: string | null;
  isEnabled: boolean;
  refreshParties: () => Promise<void>;
  hasRole: (partyId: string, roleId: string) => boolean;
  hasPackage: (partyId: string, packageId: string) => boolean;
  getPartyByOrgNumber: (orgNumber: string) => AltinnParty | undefined;
}

const AltinnContext = createContext<AltinnContextType | null>(null);

const ALTINN_TOKEN_EXCHANGE_URL =
  env.altinnTokenExchangeUrl || 'https://platform.altinn.no/authentication/api/v1/exchange/id-porten';

const ALTINN_AUTHORIZATION_URL = env.altinnAuthorizationUrl || 'https://platform.altinn.no/authorization/api/v1';

export function AltinnProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { isAuthenticated } = useAuth();

  const [altinnToken, setAltinnToken] = useState<string | null>(null);
  const [authorizedParties, setAuthorizedParties] = useState<AltinnParty[]>([]);
  const [isExchangingToken, setIsExchangingToken] = useState(false);
  const [isLoadingParties, setIsLoadingParties] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const exchangeToken = async () => {
      if (!env.altinnEnabled || !isAuthenticated) return;

      const idPortenToken = localStorage.getItem('digilist_saas_idporten_token');
      if (!idPortenToken || altinnToken) return;

      setIsExchangingToken(true);
      setError(null);

      try {
        const response = await fetch(ALTINN_TOKEN_EXCHANGE_URL, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${idPortenToken}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) throw new Error(`Token exchange failed: ${response.status}`);

        const data = await response.json();
        setAltinnToken(data.access_token);
        localStorage.setItem('digilist_saas_altinn_token', data.access_token);
        localStorage.setItem('digilist_saas_altinn_token_expiry', String(Date.now() + data.expires_in * 1000));
      } catch {
        setError('Kunne ikke koble til Altinn');
      } finally {
        setIsExchangingToken(false);
      }
    };

    exchangeToken();
  }, [isAuthenticated, altinnToken]);

  useEffect(() => {
    const fetchParties = async () => {
      if (!altinnToken) return;

      setIsLoadingParties(true);
      try {
        const response = await fetch(`${ALTINN_AUTHORIZATION_URL}/parties?includeSubunits=true`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${altinnToken}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) throw new Error(`Failed to fetch parties: ${response.status}`);

        const parties = await response.json();
        const mapped: AltinnParty[] = parties.filter((p: { orgNumber?: string }) => p.orgNumber).map(mapAltinnParty);

        setAuthorizedParties(mapped);
      } catch {
        setError('Kunne ikke hente organisasjoner fra Altinn');
      } finally {
        setIsLoadingParties(false);
      }
    };

    fetchParties();
  }, [altinnToken]);

  const refreshParties = useCallback(async () => {
    if (!altinnToken) return;

    setIsLoadingParties(true);
    try {
      const response = await fetch(`${ALTINN_AUTHORIZATION_URL}/parties?includeSubunits=true`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${altinnToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) throw new Error('Refresh failed');

      const parties = await response.json();
      const mapped: AltinnParty[] = parties.filter((p: { orgNumber?: string }) => p.orgNumber).map(mapAltinnParty);

      setAuthorizedParties(mapped);
      setError(null);
    } catch {
      setError('Kunne ikke oppdatere organisasjoner');
    } finally {
      setIsLoadingParties(false);
    }
  }, [altinnToken]);

  const hasRole = useCallback(
    (partyId: string, roleId: string): boolean => {
      const party = authorizedParties.find((p) => p.partyId === partyId);
      return party?.roles.some((r) => r.roleId === roleId) ?? false;
    },
    [authorizedParties],
  );

  const hasPackage = useCallback(
    (partyId: string, packageId: string): boolean => {
      const party = authorizedParties.find((p) => p.partyId === partyId);
      return party?.accessPackages?.includes(packageId) ?? false;
    },
    [authorizedParties],
  );

  const getPartyByOrgNumber = useCallback(
    (orgNumber: string): AltinnParty | undefined => authorizedParties.find((p) => p.orgNumber === orgNumber),
    [authorizedParties],
  );

  const contextValue = useMemo(
    (): AltinnContextType => ({
      altinnToken,
      isExchangingToken,
      authorizedParties,
      isLoadingParties,
      error,
      isEnabled: env.altinnEnabled,
      refreshParties,
      hasRole,
      hasPackage,
      getPartyByOrgNumber,
    }),
    [
      altinnToken,
      isExchangingToken,
      authorizedParties,
      isLoadingParties,
      error,
      refreshParties,
      hasRole,
      hasPackage,
      getPartyByOrgNumber,
    ],
  );

  return <AltinnContext.Provider value={contextValue}>{children}</AltinnContext.Provider>;
}

export function useAltinn(): AltinnContextType | null {
  return useContext(AltinnContext);
}

export function useRequiredAltinn(): AltinnContextType {
  const context = useContext(AltinnContext);
  if (!context) {
    throw new Error('useRequiredAltinn must be used within an AltinnProvider');
  }
  return context;
}

export function useAltinnParties() {
  const altinn = useRequiredAltinn();
  return {
    parties: altinn.authorizedParties,
    isLoading: altinn.isLoadingParties,
    isEnabled: altinn.isEnabled,
    error: altinn.error,
    refresh: altinn.refreshParties,
  };
}

export function useAltinnRoles(partyId: string) {
  const altinn = useRequiredAltinn();
  const party = altinn.authorizedParties.find((p) => p.partyId === partyId);

  return {
    roles: party?.roles ?? [],
    accessPackages: party?.accessPackages ?? [],
    hasRole: (roleId: string) => altinn.hasRole(partyId, roleId),
    hasPackage: (packageId: string) => altinn.hasPackage(partyId, packageId),
    isLoading: altinn.isLoadingParties,
  };
}
