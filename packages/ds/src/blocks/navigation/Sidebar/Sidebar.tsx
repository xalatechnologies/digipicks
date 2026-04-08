/**
 * Sidebar
 *
 * Config-driven nav sidebar for dashboard apps.
 * Desktop: aside with logo + nav. Mobile: hamburger + drawer.
 * Uses .module.css and design tokens only. No inline styles.
 */

import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Paragraph, Button } from '@digdir/designsystemet-react';
import { Drawer } from '../../../composed/Drawer';
import { cn } from '../../../utils';
import styles from './Sidebar.module.css';

const DEFAULT_MOBILE_BREAKPOINT = 768;

export interface SidebarNavItem {
  name: string;
  description?: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface SidebarNavSection {
  title?: string;
  items: SidebarNavItem[];
}

export interface SidebarProps {
  /** Logo or branding for sidebar header */
  logo: React.ReactNode;
  /** Nav sections with items */
  sections: SidebarNavSection[];
  /** Optional width in px (default 360) */
  width?: number;
  /** Breakpoint for mobile (default 768) */
  mobileBreakpoint?: number;
  /** Optional id for accessibility */
  id?: string;
  /** Optional data-testid */
  'data-testid'?: string;
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function SidebarNavItemComp({
  item,
  onClick,
}: {
  item: SidebarNavItem;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={item.href}
      end={item.href === '/' || item.href === '/platform'}
      onClick={onClick}
      className={({ isActive: active }) =>
        cn(styles.navItem, active && styles.navItemActive)
      }
    >
      <div className={styles.iconBox}>{item.icon}</div>
      <div className={styles.textBox}>
        <Paragraph data-size="sm" className={styles.name}>
          {item.name}
        </Paragraph>
        {item.description && (
          <Paragraph data-size="xs" className={styles.description}>
            {item.description}
          </Paragraph>
        )}
      </div>
      <div className={styles.badgeArrowBox}>
        {item.badge != null && item.badge > 0 && (
          <div className={styles.badgeBox}>{item.badge}</div>
        )}
        <div className={styles.arrow}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </NavLink>
  );
}

function SidebarContent({
  logo,
  sections,
  onItemClick,
}: {
  logo: React.ReactNode;
  sections: SidebarNavSection[];
  onItemClick?: () => void;
}) {
  return (
    <>
      <div className={styles.logoZone}>{logo}</div>
      <nav className={styles.nav}>
        {sections.map((section, idx) => (
          <div key={idx} className={styles.section}>
            {section.title && (
              <div className={styles.sectionTitle}>{section.title}</div>
            )}
            <ul className={styles.sectionList}>
              {section.items.map((item) => (
                <li key={item.href}>
                  <SidebarNavItemComp item={item} onClick={onItemClick} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

export function Sidebar({
  logo,
  sections,
  width = 360,
  mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
  id,
  'data-testid': dataTestId,
}: SidebarProps): React.ReactElement {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < mobileBreakpoint : false
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < mobileBreakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileBreakpoint]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const content = (
    <SidebarContent
      logo={logo}
      sections={sections}
      onItemClick={isMobile ? () => setDrawerOpen(false) : undefined}
    />
  );

  if (isMobile) {
    return (
      <>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className={styles.hamburgerButton}
        >
          <MenuIcon />
        </Button>
        <Drawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          position="left"
          size="lg"
          overlay={true}
          closeOnOverlayClick={true}
          closeOnEscape={true}
          aria-label="Navigation menu"
        >
          <div className={styles.drawerContent}>{content}</div>
        </Drawer>
      </>
    );
  }

  return (
    <aside
      id={id}
      data-testid={dataTestId}
      className={styles.aside}
      style={{ width: `${width}px`, minWidth: `${width}px` }}
    >
      {content}
    </aside>
  );
}

Sidebar.displayName = 'Sidebar';
