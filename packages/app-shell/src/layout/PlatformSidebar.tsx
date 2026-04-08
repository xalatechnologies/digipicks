/**
 * PlatformSidebar
 *
 * Reusable sidebar for saas-admin, monitoring, dashboard.
 * Renders nav sections using @digilist-saas/ds. Matches PlatformLayout sidebar slot.
 */

import { NavLink, useLocation } from 'react-router-dom';
import { Paragraph } from '@digilist-saas/ds';

export interface PlatformSidebarNavItem {
  name: string;
  description?: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface PlatformSidebarSection {
  title?: string;
  items: PlatformSidebarNavItem[];
}

export interface PlatformSidebarProps {
  /** Logo/content for sidebar header */
  logo: React.ReactNode;
  /** Nav sections with items */
  sections: PlatformSidebarSection[];
  /** Optional width (default 360px) */
  width?: number;
  /** Optional id for accessibility */
  id?: string;
  /** Optional data-testid */
  'data-testid'?: string;
}

function SidebarNavItem({ item }: { item: PlatformSidebarNavItem }) {
  const location = useLocation();
  const isActive =
    item.href === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.href);

  return (
    <NavLink
      to={item.href}
      end={item.href === '/'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--ds-size-4)',
        padding: 'var(--ds-size-4) var(--ds-size-5)',
        borderRadius: 'var(--ds-border-radius-lg)',
        textDecoration: 'none',
        position: 'relative',
        backgroundColor: isActive
          ? 'var(--ds-color-neutral-surface-hover)'
          : 'transparent',
        borderLeft: isActive
          ? '3px solid var(--ds-color-accent-base-default)'
          : '3px solid transparent',
        transition: 'all 0.15s ease',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--ds-border-radius-md)',
          backgroundColor: isActive
            ? 'var(--ds-color-accent-surface-default)'
            : 'var(--ds-color-neutral-surface-hover)',
          color: isActive
            ? 'var(--ds-color-accent-text-default)'
            : 'var(--ds-color-neutral-text-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s ease',
        }}
      >
        {item.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Paragraph
          data-size="sm"
          style={{
            margin: 0,
            fontWeight: isActive
              ? ('var(--ds-font-weight-semibold)' as React.CSSProperties['fontWeight'])
              : ('var(--ds-font-weight-medium)' as React.CSSProperties['fontWeight']),
            color: isActive
              ? 'var(--ds-color-accent-text-default)'
              : 'var(--ds-color-neutral-text-default)',
          }}
        >
          {item.name}
        </Paragraph>
        {item.description && (
          <Paragraph
            data-size="xs"
            style={{
              margin: 0,
              marginTop: '2px',
              color: 'var(--ds-color-neutral-text-subtle)',
            }}
          >
            {item.description}
          </Paragraph>
        )}
      </div>

      {item.badge != null && item.badge > 0 && (
        <div
          style={{
            minWidth: '32px',
            height: '32px',
            borderRadius: 'var(--ds-border-radius-full)',
            backgroundColor: 'var(--ds-color-neutral-surface-hover)',
            color: 'var(--ds-color-neutral-text-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--ds-font-size-sm)',
            fontWeight: 'var(--ds-font-weight-medium)' as React.CSSProperties['fontWeight'],
            padding: '0 var(--ds-size-3)',
          }}
        >
          {item.badge}
        </div>
      )}
    </NavLink>
  );
}

export function PlatformSidebar({
  logo,
  sections,
  width = 360,
  id,
  'data-testid': dataTestId,
}: PlatformSidebarProps): React.ReactElement {
  return (
    <aside
      id={id}
      data-testid={dataTestId}
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        flexShrink: 0,
        backgroundColor: 'var(--ds-color-neutral-surface-default)',
        borderRight: '1px solid var(--ds-color-neutral-border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div
        style={{
          height: '72px',
          padding: '0 var(--ds-size-6)',
          borderBottom: '1px solid var(--ds-color-neutral-border-subtle)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {logo}
      </div>

      <nav
        style={{
          flex: 1,
          padding: 'var(--ds-size-4) var(--ds-size-3)',
          overflowY: 'auto',
        }}
      >
        {sections.map((section, sectionIndex) => (
          <div
            key={sectionIndex}
            style={{ marginBottom: 'var(--ds-size-6)' }}
          >
            {section.title && (
              <Paragraph
                data-size="xs"
                style={{
                  margin: 0,
                  fontWeight: 'var(--ds-font-weight-semibold)' as React.CSSProperties['fontWeight'],
                  color: 'var(--ds-color-neutral-text-subtle)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--ds-font-letter-spacing-md)',
                  padding: 'var(--ds-size-2) var(--ds-size-5)',
                  marginBottom: 'var(--ds-size-2)',
                }}
              >
                {section.title}
              </Paragraph>
            )}
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--ds-size-2)',
              }}
            >
              {section.items.map((item) => (
                <li key={item.href}>
                  <SidebarNavItem item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
