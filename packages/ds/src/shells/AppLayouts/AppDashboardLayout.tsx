/**
 * AppDashboardLayout
 *
 * Shared layout shell for dashboard apps (minside, backoffice).
 * Composes SkipLinks + PlatformLayout with header, sidebar, bottom nav slots.
 */

import { Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { SkipLinks, BottomNavigation, type BottomNavigationItem } from '@digipicks/ds';
import { PlatformLayout } from '../PlatformLayout';
import styles from './AppDashboardLayout.module.css';

const MOBILE_BREAKPOINT = 768;

export interface AppDashboardLayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  /** Bottom nav for mobile. Omit for docs layout. */
  bottomNavItems?: BottomNavigationItem[];
  /** Optional alerts below header (e.g. redirect message, lost org) */
  topAlerts?: ReactNode;
  /** Show sidebar on mobile (default: false for minside, backoffice uses true) */
  showSidebarOnMobile?: boolean;
  /** Optional right sidebar (e.g. TOC for docs) — desktop only */
  rightSidebar?: ReactNode;
}

export function AppDashboardLayout({
  header,
  sidebar,
  bottomNavItems = [],
  topAlerts,
  showSidebarOnMobile = false,
  rightSidebar,
}: AppDashboardLayoutProps): React.ReactElement {
  return (
    <>
      <SkipLinks />
      <PlatformLayout
        header={header}
        sidebar={sidebar}
        topAlerts={topAlerts ? <div className={styles.alertWrapper}>{topAlerts}</div> : undefined}
        bottomNav={
          bottomNavItems.length > 0 ? (
            <BottomNavigation items={bottomNavItems} fixed variant="surface" showLabels safeArea />
          ) : undefined
        }
        mobileBreakpoint={MOBILE_BREAKPOINT}
        mobileBottomNavOffset={bottomNavItems.length > 0 ? '64px' : undefined}
        showSidebarOnMobile={showSidebarOnMobile}
        rightSidebar={rightSidebar}
      >
        <Outlet />
      </PlatformLayout>
    </>
  );
}
