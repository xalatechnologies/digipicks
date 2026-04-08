/**
 * AccountSelectionModal Component
 *
 * Post-login modal for selecting account type (personal or organization).
 * Shows when user hasn't made a selection yet. Reusable multi-tenant UX.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Heading, Paragraph, Card, Spinner, Checkbox } from '@digilist-saas/ds';
import { useAccountContext } from '../providers/AccountContextProvider';

// =============================================================================
// Icons
// =============================================================================

function UserIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// =============================================================================
// Props
// =============================================================================

export interface AccountSelectionModalProps {
  open: boolean;
  /** Path to navigate when selecting personal account. Default: / */
  personalPath?: string;
  /** Path to navigate when selecting organization account. Default: /org */
  organizationPath?: string;
}

type SelectionStep = 'account-type' | 'organization';

// =============================================================================
// Component
// =============================================================================

export function AccountSelectionModal({
  open,
  personalPath = '/',
  organizationPath = '/org',
}: AccountSelectionModalProps) {
  const accountContext = useAccountContext();
  if (!accountContext) return null;

  const {
    organizations,
    isLoadingOrganizations,
    switchToPersonal,
    switchToOrganization,
    markAccountAsSelected,
    rememberChoice,
    setRememberChoice,
  } = accountContext;

  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<SelectionStep>('account-type');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  const handlePersonalSelect = () => {
    switchToPersonal();
    markAccountAsSelected();
    dialogRef.current?.close();
    navigate(personalPath);
  };

  const handleOrganizationSelect = () => {
    if (organizations.length === 0) return;
    setStep('organization');
  };

  const handleOrganizationConfirm = () => {
    if (!selectedOrgId) return;

    switchToOrganization(selectedOrgId);
    markAccountAsSelected();
    dialogRef.current?.close();
    navigate(organizationPath);
  };

  const handleBack = () => {
    setStep('account-type');
    setSelectedOrgId(null);
  };

  useEffect(() => {
    if (!open) {
      setStep('account-type');
      setSelectedOrgId(null);
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      style={{
        border: 'none',
        borderRadius: 'var(--ds-border-radius-lg)',
        padding: 0,
        maxWidth: '560px',
        width: '90vw',
        boxShadow: 'var(--ds-shadow-xlarge)',
        backgroundColor: 'var(--ds-color-neutral-background-default)',
      }}
    >
      <div
        style={{
          padding: 'var(--ds-size-6)',
          borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
          textAlign: 'center',
        }}
      >
        <Heading level={2} data-size="md" style={{ margin: 0, marginBottom: 'var(--ds-size-2)' }}>
          {step === 'account-type' ? 'Hvordan vil du fortsette?' : 'Velg organisasjon'}
        </Heading>
        <Paragraph style={{ margin: 0, color: 'var(--ds-color-neutral-text-subtle)' }}>
          {step === 'account-type'
            ? 'Velg om du vil bruke tjenesten som privatperson eller på vegne av en organisasjon'
            : 'Velg hvilken organisasjon du representerer'}
        </Paragraph>
      </div>

      <div style={{ padding: 'var(--ds-size-6)' }}>
        {step === 'account-type' && (
          <div
            style={{
              display: 'grid',
              gap: 'var(--ds-size-4)',
              gridTemplateColumns: window.innerWidth >= 768 ? '1fr 1fr' : '1fr',
            }}
          >
            <Button
              type="button"
              variant="tertiary"
              onClick={handlePersonalSelect}
              style={{
                all: 'unset',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                const card = e.currentTarget.firstChild as HTMLElement;
                if (card) {
                  card.style.borderColor = 'var(--ds-color-accent-border-default)';
                  card.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget.firstChild as HTMLElement;
                if (card) {
                  card.style.borderColor = 'var(--ds-color-neutral-border-default)';
                  card.style.transform = 'translateY(0)';
                }
              }}
            >
              <Card
                style={{
                  padding: 'var(--ds-size-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--ds-size-3)',
                  textAlign: 'center',
                  border: '2px solid var(--ds-color-neutral-border-default)',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--ds-border-radius-full)',
                    backgroundColor: 'var(--ds-color-accent-surface-default)',
                    color: 'var(--ds-color-accent-base-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserIcon />
                </div>
                <Heading level={3} data-size="sm" style={{ margin: 0 }}>
                  Som privatperson
                </Heading>
                <Paragraph data-size="sm" style={{ margin: 0, color: 'var(--ds-color-neutral-text-subtle)' }}>
                  Book og administrer egne aktiviteter
                </Paragraph>
              </Card>
            </Button>

            <Button
              type="button"
              variant="tertiary"
              onClick={handleOrganizationSelect}
              disabled={isLoadingOrganizations}
              style={{
                all: 'unset',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: isLoadingOrganizations ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoadingOrganizations) {
                  const card = e.currentTarget.firstChild as HTMLElement;
                  if (card) {
                    card.style.borderColor = 'var(--ds-color-accent-border-default)';
                    card.style.transform = 'translateY(-2px)';
                  }
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoadingOrganizations) {
                  const card = e.currentTarget.firstChild as HTMLElement;
                  if (card) {
                    card.style.borderColor = 'var(--ds-color-neutral-border-default)';
                    card.style.transform = 'translateY(0)';
                  }
                }
              }}
            >
              <Card
                style={{
                  padding: 'var(--ds-size-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--ds-size-3)',
                  textAlign: 'center',
                  border: '2px solid var(--ds-color-neutral-border-default)',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--ds-border-radius-full)',
                    backgroundColor: 'var(--ds-color-success-surface-default)',
                    color: 'var(--ds-color-success-base-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isLoadingOrganizations ? <Spinner aria-hidden="true" /> : <BuildingIcon />}
                </div>
                <Heading level={3} data-size="sm" style={{ margin: 0 }}>
                  På vegne av organisasjon
                </Heading>
                <Paragraph data-size="sm" style={{ margin: 0, color: 'var(--ds-color-neutral-text-subtle)' }}>
                  Representér en organisasjon du er tilknyttet
                </Paragraph>
              </Card>
            </Button>
          </div>
        )}

        {step === 'organization' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-size-3)' }}>
            {organizations.length === 0 ? (
              <Card style={{ padding: 'var(--ds-size-5)', textAlign: 'center' }}>
                <Paragraph style={{ margin: 0, color: 'var(--ds-color-neutral-text-subtle)' }}>
                  Du er ikke tilknyttet noen organisasjoner ennå.
                </Paragraph>
              </Card>
            ) : (
              organizations.map((org: { id: string; name: string; organizationNumber?: string }) => (
                <Button
                  key={org.id}
                  type="button"
                  variant="tertiary"
                  onClick={() => setSelectedOrgId(org.id)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Card
                    style={{
                      padding: 'var(--ds-size-4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--ds-size-3)',
                      border: selectedOrgId === org.id
                        ? '2px solid var(--ds-color-accent-border-default)'
                        : '2px solid var(--ds-color-neutral-border-default)',
                      backgroundColor: selectedOrgId === org.id
                        ? 'var(--ds-color-accent-surface-default)'
                        : undefined,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--ds-border-radius-md)',
                        backgroundColor: 'var(--ds-color-success-surface-default)',
                        color: 'var(--ds-color-success-base-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <BuildingIcon />
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <Heading level={4} data-size="xs" style={{ margin: 0 }}>
                        {org.name}
                      </Heading>
                      {org.organizationNumber && (
                        <Paragraph data-size="sm" style={{ margin: 0, color: 'var(--ds-color-neutral-text-subtle)' }}>
                          Org.nr: {org.organizationNumber}
                        </Paragraph>
                      )}
                    </div>
                    {selectedOrgId === org.id && (
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--ds-border-radius-full)',
                          backgroundColor: 'var(--ds-color-accent-base-default)',
                          color: 'var(--ds-color-neutral-contrast-default)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CheckIcon />
                      </div>
                    )}
                  </Card>
                </Button>
              ))
            )}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--ds-size-3)',
          padding: 'var(--ds-size-4) var(--ds-size-6)',
          borderTop: '1px solid var(--ds-color-neutral-border-subtle)',
          backgroundColor: 'var(--ds-color-neutral-background-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-size-2)' }}>
          <Checkbox
            id="remember-choice"
            aria-label="Husk mitt valg"
            checked={rememberChoice}
            onChange={(e) => setRememberChoice(e.target.checked)}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: step === 'organization' ? 'space-between' : 'flex-end',
            gap: 'var(--ds-size-3)',
          }}
        >
          {step === 'organization' && (
            <Button type="button" variant="secondary" onClick={handleBack}>
              Tilbake
            </Button>
          )}
          {step === 'organization' && (
            <Button
              type="button"
              variant="primary"
              onClick={handleOrganizationConfirm}
              disabled={!selectedOrgId}
            >
              Fortsett
            </Button>
          )}
        </div>
      </div>
    </dialog>
  );
}
