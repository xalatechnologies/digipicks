/**
 * AccountContextProvider — Web App
 *
 * Manages user account type (personal vs organization) and selected organization.
 * Ported from minside app with enhancements for Altinn integration.
 *
 * Features:
 * - Persist account selection in localStorage
 * - Fetch user's organizations from SDK
 * - Provide methods to switch between personal/organization mode
 * - Validate organization selection
 * - Support for Altinn-authorized organizations (future)
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useOrganizations, useSessionTenantId, type Organization } from '@digilist-saas/sdk';

// =============================================================================
// Types
// =============================================================================

export type AccountType = 'personal' | 'organization';

/**
 * Dashboard context type for RBAC-based UI filtering
 * Used by Sidebar, ProtectedRoute, and other context-aware components
 */
export type DashboardContext = 'personal' | 'organization';

export interface AccountContextState {
    accountType: AccountType;
    selectedOrganization: Organization | null;
    organizations: Organization[];
    isLoadingOrganizations: boolean;
    hasSelectedAccount: boolean;
    rememberChoice: boolean;
    /** Message shown when user's organization membership was lost */
    lostOrganizationMessage: string | null;
}

export interface AccountContextValue extends AccountContextState {
    switchToPersonal: () => void;
    switchToOrganization: (organizationId: string) => void;
    getActiveAccount: () => ActiveAccount;
    markAccountAsSelected: () => void;
    setRememberChoice: (value: boolean) => void;
    clearLostOrganizationMessage: () => void;
}

export interface ActiveAccount {
    type: AccountType;
    id: string;
    name: string;
    displayName: string;
}

// =============================================================================
// Context
// =============================================================================

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

// =============================================================================
// Local Storage Keys
// =============================================================================

const STORAGE_KEYS = {
    ACCOUNT_TYPE: 'web_account_type',
    SELECTED_ORG_ID: 'web_selected_organization',
    HAS_SELECTED: 'web_has_selected_account',
    REMEMBER_CHOICE: 'web_remember_choice',
} as const;

// =============================================================================
// Provider Component
// =============================================================================

interface AccountContextProviderProps {
    children: React.ReactNode;
    userId?: string;
    userName?: string;
}

export const AccountContextProvider: React.FC<AccountContextProviderProps> = ({
    children,
    userId = 'current-user',
    userName = 'Bruker',
}) => {
    // Resolve tenantId from session so we can fetch orgs
    const tenantId = useSessionTenantId();

    // Fetch user's organizations from SDK
    const { data: organizationsResponse, isLoading: isLoadingOrganizations } = useOrganizations(
        tenantId ? { tenantId, status: 'active' } : undefined,
    );

    const organizations = organizationsResponse?.data ?? [];

    // State: Account type (personal or organization)
    // Initialize with safe defaults to avoid hydration mismatch
    const [accountType, setAccountType] = useState<AccountType>('personal');

    // State: Selected organization
    const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);

    // State: Remember choice preference
    const [rememberChoice, setRememberChoice] = useState<boolean>(false);

    // State: Has user made initial account selection
    const [hasSelectedAccount, setHasSelectedAccount] = useState<boolean>(false);

    // State: Track if localStorage has been initialized
    const [isStorageInitialized, setIsStorageInitialized] = useState(false);

    // Effect: Initialize state from localStorage after mount (avoids hydration mismatch)
    useEffect(() => {
        const storedAccountType = localStorage.getItem(STORAGE_KEYS.ACCOUNT_TYPE);
        if (storedAccountType === 'organization' || storedAccountType === 'personal') {
            setAccountType(storedAccountType);
        }

        const storedRememberChoice = localStorage.getItem(STORAGE_KEYS.REMEMBER_CHOICE) === 'true';
        setRememberChoice(storedRememberChoice);

        const storedHasSelected = localStorage.getItem(STORAGE_KEYS.HAS_SELECTED);
        if (storedRememberChoice) {
            localStorage.setItem(STORAGE_KEYS.HAS_SELECTED, 'true');
            setHasSelectedAccount(true);
        } else if (storedHasSelected === null) {
            // First login — leave hasSelectedAccount false so the modal shows
            setHasSelectedAccount(false);
        } else {
            setHasSelectedAccount(storedHasSelected === 'true');
        }

        setIsStorageInitialized(true);
    }, []);

    // State: Lost organization message
    const [lostOrganizationMessage, setLostOrganizationMessage] = useState<string | null>(null);

    // =============================================================================
    // Context Validation
    // =============================================================================

    const validateContext = useCallback(
        (
            storedAccountType: AccountType,
            storedOrgId: string | null,
            availableOrgs: Organization[]
        ): { accountType: AccountType; organization: Organization | null; forcePersonal: boolean } => {
            // Force personal if user has no organizations
            if (availableOrgs.length === 0) {
                return {
                    accountType: 'personal',
                    organization: null,
                    forcePersonal: storedAccountType === 'organization',
                };
            }

            // If account type is personal, no org validation needed
            if (storedAccountType === 'personal') {
                return {
                    accountType: 'personal',
                    organization: null,
                    forcePersonal: false,
                };
            }

            // Validate organization mode - check if remembered org still exists
            if (storedOrgId) {
                const org = availableOrgs.find((o) => o.id === storedOrgId);
                if (org) {
                    return {
                        accountType: 'organization',
                        organization: org,
                        forcePersonal: false,
                    };
                }
            }

            // Organization mode selected but org not found - force personal
            return {
                accountType: 'personal',
                organization: null,
                forcePersonal: true,
            };
        },
        []
    );

    // Effect: Validate and restore context once organizations are loaded AND storage is initialized
    useEffect(() => {
        if (isLoadingOrganizations || !isStorageInitialized) return;

        const storedAccountType = localStorage.getItem(STORAGE_KEYS.ACCOUNT_TYPE) as AccountType | null;
        const storedOrgId = localStorage.getItem(STORAGE_KEYS.SELECTED_ORG_ID);
        const currentAccountType = storedAccountType === 'organization' ? 'organization' : 'personal';

        const validated = validateContext(currentAccountType, storedOrgId, organizations);

        if (validated.forcePersonal) {
            localStorage.removeItem(STORAGE_KEYS.SELECTED_ORG_ID);
            localStorage.setItem(STORAGE_KEYS.ACCOUNT_TYPE, 'personal');
            setAccountType('personal');
            setSelectedOrganization(null);
            setLostOrganizationMessage(
                'Du har ikke lenger tilgang til den valgte organisasjonen. Du er nå i personlig modus.'
            );
        } else if (validated.accountType === 'organization' && validated.organization) {
            setAccountType('organization');
            setSelectedOrganization(validated.organization);
        } else {
            setAccountType('personal');
            setSelectedOrganization(null);
        }
    }, [isLoadingOrganizations, isStorageInitialized, organizations, validateContext]);

    // Method: Switch to personal account
    const switchToPersonal = useCallback(() => {
        setAccountType('personal');
        setSelectedOrganization(null);
        localStorage.setItem(STORAGE_KEYS.ACCOUNT_TYPE, 'personal');
        localStorage.removeItem(STORAGE_KEYS.SELECTED_ORG_ID);
    }, []);

    // Method: Switch to organization account
    const switchToOrganization = useCallback(
        (organizationId: string) => {
            const org = organizations.find((o) => o.id === organizationId);

            if (!org) return;

            setAccountType('organization');
            setSelectedOrganization(org);
            localStorage.setItem(STORAGE_KEYS.ACCOUNT_TYPE, 'organization');
            localStorage.setItem(STORAGE_KEYS.SELECTED_ORG_ID, organizationId);
        },
        [organizations]
    );

    // Method: Get active account details
    const getActiveAccount = useCallback((): ActiveAccount => {
        if (accountType === 'organization' && selectedOrganization) {
            return {
                type: 'organization',
                id: selectedOrganization.id,
                name: selectedOrganization.name,
                displayName: selectedOrganization.name,
            };
        }

        return {
            type: 'personal',
            id: userId,
            name: userName,
            displayName: userName,
        };
    }, [accountType, selectedOrganization, userId, userName]);

    // Method: Mark that user has made initial account selection
    const markAccountAsSelected = useCallback(() => {
        setHasSelectedAccount(true);
        localStorage.setItem(STORAGE_KEYS.HAS_SELECTED, 'true');
    }, []);

    // Method: Set remember choice preference
    const handleSetRememberChoice = useCallback((value: boolean) => {
        setRememberChoice(value);
        localStorage.setItem(STORAGE_KEYS.REMEMBER_CHOICE, String(value));
    }, []);

    // Method: Clear the lost organization message
    const clearLostOrganizationMessage = useCallback(() => {
        setLostOrganizationMessage(null);
    }, []);

    // Memoized context value
    const value = useMemo<AccountContextValue>(
        () => ({
            accountType,
            selectedOrganization,
            organizations,
            isLoadingOrganizations,
            hasSelectedAccount,
            rememberChoice,
            lostOrganizationMessage,
            switchToPersonal,
            switchToOrganization,
            getActiveAccount,
            markAccountAsSelected,
            setRememberChoice: handleSetRememberChoice,
            clearLostOrganizationMessage,
        }),
        [
            accountType,
            selectedOrganization,
            organizations,
            isLoadingOrganizations,
            hasSelectedAccount,
            rememberChoice,
            lostOrganizationMessage,
            switchToPersonal,
            switchToOrganization,
            getActiveAccount,
            markAccountAsSelected,
            handleSetRememberChoice,
            clearLostOrganizationMessage,
        ]
    );

    return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

// =============================================================================
// Custom Hook
// =============================================================================

export const useAccountContext = (): AccountContextValue | undefined => {
    return useContext(AccountContext);
};

/**
 * Hook that throws if not in AccountContextProvider
 * Use this in components that require account context
 */
export const useRequiredAccountContext = (): AccountContextValue => {
    const context = useContext(AccountContext);

    if (!context) {
        throw new Error('useRequiredAccountContext must be used within AccountContextProvider');
    }

    return context;
};
