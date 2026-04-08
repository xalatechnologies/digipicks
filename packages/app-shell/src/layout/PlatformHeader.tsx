/**
 * PlatformHeader
 *
 * Reusable header for saas-admin, monitoring, dashboard.
 * Renders logo, optional search, theme toggle, settings. Matches PlatformLayout header slot.
 */

import { HeaderActions, HeaderThemeToggle, HeaderIconButton, SettingsIcon } from '@digilist-saas/ds';

export interface PlatformHeaderProps {
  /** Logo / left content */
  logo?: React.ReactNode;
  /** Optional search slot (centered) */
  search?: React.ReactNode;
  /** Show theme toggle */
  showThemeToggle?: boolean;
  /** Current theme - dark mode */
  isDark?: boolean;
  /** Theme toggle callback */
  onThemeToggle?: () => void;
  /** Settings click callback */
  onSettingsClick?: () => void;
  /** Optional data-testid */
  'data-testid'?: string;
}

export function PlatformHeader({
  logo,
  search,
  showThemeToggle = true,
  isDark = false,
  onThemeToggle,
  onSettingsClick,
  'data-testid': dataTestId,
}: PlatformHeaderProps): React.ReactElement {
  return (
    <header
      data-testid={dataTestId}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--ds-color-neutral-surface-default)',
        borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
        boxShadow: 'var(--ds-shadow-xs)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '72px',
          padding: '0 var(--ds-size-6)',
          gap: 'var(--ds-size-4)',
        }}
      >
        {logo && (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {logo}
          </div>
        )}

        {search ? (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              maxWidth: 600,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {search}
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <HeaderActions spacing="var(--ds-size-3)">
            {showThemeToggle && onThemeToggle && (
              <HeaderThemeToggle
                isDark={isDark}
                onToggle={onThemeToggle}
              />
            )}
            {onSettingsClick && (
              <HeaderIconButton
                icon={<SettingsIcon size={22} />}
                size="md"
                aria-label="Innstillinger"
                title="Innstillinger"
                onClick={onSettingsClick}
              />
            )}
          </HeaderActions>
        </div>
      </div>
    </header>
  );
}
