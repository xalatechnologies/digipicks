/**
 * AccountSwitcher Component
 *
 * Dropdown button in header for switching between personal and organization accounts.
 * Reusable multi-tenant UX component — moved from minside.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Paragraph } from '@digipicks/ds';
import { useAccountContext } from '../providers/AccountContextProvider';

// =============================================================================
// Icons
// =============================================================================

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6m8.66-16.66l-4.24 4.24m-8.49 8.49l-4.24 4.24M23 12h-6m-6 0H1m16.66 8.66l-4.24-4.24m-8.49-8.49L.93 3.93" />
    </svg>
  );
}

// =============================================================================
// Props
// =============================================================================

export interface AccountSwitcherProps {
  /** Path to navigate when switching to personal account. Default: / */
  personalPath?: string;
  /** Path to navigate when switching to organization account. Default: /org */
  organizationPath?: string;
  /** Path for "Manage organizations" link. Default: /settings */
  settingsPath?: string;
}

// =============================================================================
// Component
// =============================================================================

export function AccountSwitcher({
  personalPath = '/',
  organizationPath = '/org',
  settingsPath = '/settings',
}: AccountSwitcherProps = {}) {
  const accountContext = useAccountContext();
  if (!accountContext) return null;

  const { accountType, selectedOrganization, organizations, switchToPersonal, switchToOrganization, getActiveAccount } =
    accountContext;

  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeAccount = getActiveAccount();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handlePersonalClick = () => {
    switchToPersonal();
    setIsOpen(false);
    navigate(personalPath);
  };

  const handleOrganizationClick = (orgId: string) => {
    switchToOrganization(orgId);
    setIsOpen(false);
    navigate(organizationPath);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <Button
        type="button"
        variant="secondary"
        data-size="sm"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-size-2)',
          minWidth: '180px',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: 'var(--ds-border-radius-full)',
            backgroundColor:
              accountType === 'personal'
                ? 'var(--ds-color-accent-surface-default)'
                : 'var(--ds-color-success-surface-default)',
            color:
              accountType === 'personal'
                ? 'var(--ds-color-accent-base-default)'
                : 'var(--ds-color-success-base-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {accountType === 'personal' ? <UserIcon /> : <BuildingIcon />}
        </div>
        <span
          style={{
            flex: 1,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activeAccount.displayName}
        </span>
        <ChevronDownIcon />
      </Button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + var(--ds-size-2))',
            left: 0,
            width: '280px',
            backgroundColor: 'var(--ds-color-neutral-background-default)',
            border: '1px solid var(--ds-color-neutral-border-default)',
            borderRadius: 'var(--ds-border-radius-md)',
            boxShadow: 'var(--ds-shadow-large)',
            zIndex: 1000,
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: 'var(--ds-size-2) 0' }}>
            <Button
              type="button"
              variant="tertiary"
              onClick={handlePersonalClick}
              style={{
                all: 'unset',
                width: '100%',
                padding: 'var(--ds-size-3) var(--ds-size-4)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--ds-size-3)',
                cursor: 'pointer',
                backgroundColor: accountType === 'personal' ? 'var(--ds-color-accent-surface-default)' : 'transparent',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (accountType !== 'personal') {
                  e.currentTarget.style.backgroundColor = 'var(--ds-color-neutral-surface-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (accountType !== 'personal') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--ds-border-radius-full)',
                  backgroundColor: 'var(--ds-color-accent-surface-default)',
                  color: 'var(--ds-color-accent-base-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <UserIcon />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <Paragraph data-size="sm" style={{ margin: 0, fontWeight: 'var(--ds-font-weight-medium)' }}>
                  Som privatperson
                </Paragraph>
              </div>
              {accountType === 'personal' && (
                <div style={{ color: 'var(--ds-color-accent-base-default)' }}>
                  <CheckIcon />
                </div>
              )}
            </Button>
          </div>

          {organizations.length > 0 && (
            <div
              style={{
                height: '1px',
                backgroundColor: 'var(--ds-color-neutral-border-subtle)',
                margin: '0 var(--ds-size-2)',
              }}
            />
          )}

          {organizations.length > 0 && (
            <div style={{ padding: 'var(--ds-size-2) 0' }}>
              <div style={{ padding: 'var(--ds-size-2) var(--ds-size-4)' }}>
                <Paragraph
                  data-size="xs"
                  style={{
                    margin: 0,
                    color: 'var(--ds-color-neutral-text-subtle)',
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--ds-font-letter-spacing-wide)',
                    fontWeight: 'var(--ds-font-weight-semibold)',
                  }}
                >
                  Organisasjoner
                </Paragraph>
              </div>
              {organizations.map((org: { id: string; name: string; organizationNumber?: string }) => (
                <Button
                  key={org.id}
                  type="button"
                  variant="tertiary"
                  onClick={() => handleOrganizationClick(org.id)}
                  style={{
                    all: 'unset',
                    width: '100%',
                    padding: 'var(--ds-size-3) var(--ds-size-4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--ds-size-3)',
                    cursor: 'pointer',
                    backgroundColor:
                      accountType === 'organization' && selectedOrganization?.id === org.id
                        ? 'var(--ds-color-success-surface-default)'
                        : 'transparent',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!(accountType === 'organization' && selectedOrganization?.id === org.id)) {
                      e.currentTarget.style.backgroundColor = 'var(--ds-color-neutral-surface-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(accountType === 'organization' && selectedOrganization?.id === org.id)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
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
                    <Paragraph
                      data-size="sm"
                      style={{
                        margin: 0,
                        fontWeight: 'var(--ds-font-weight-medium)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {org.name}
                    </Paragraph>
                    {org.organizationNumber && (
                      <Paragraph data-size="xs" style={{ margin: 0, color: 'var(--ds-color-neutral-text-subtle)' }}>
                        {org.organizationNumber}
                      </Paragraph>
                    )}
                  </div>
                  {accountType === 'organization' && selectedOrganization?.id === org.id && (
                    <div style={{ color: 'var(--ds-color-success-base-default)' }}>
                      <CheckIcon />
                    </div>
                  )}
                </Button>
              ))}
            </div>
          )}

          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--ds-color-neutral-border-subtle)',
              margin: '0 var(--ds-size-2)',
            }}
          />

          <div style={{ padding: 'var(--ds-size-2)' }}>
            <Button
              type="button"
              variant="tertiary"
              onClick={() => {
                setIsOpen(false);
                window.location.href = settingsPath;
              }}
              style={{
                all: 'unset',
                width: '100%',
                padding: 'var(--ds-size-3) var(--ds-size-4)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--ds-size-3)',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--ds-color-neutral-surface-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ds-color-neutral-text-subtle)',
                }}
              >
                <SettingsIcon />
              </div>
              <Paragraph data-size="sm" style={{ margin: 0, color: 'var(--ds-color-neutral-text-subtle)' }}>
                Administrer organisasjoner
              </Paragraph>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
