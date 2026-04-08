/**
 * PlatformLayout
 *
 * Shared layout shell for platform apps (dashboard, docs).
 * Accepts header, sidebar, and main content as slots.
 * Handles responsive behavior: sidebar on desktop, optional bottom nav on mobile.
 */

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';

import styles from './PlatformLayout.module.css';

const DEFAULT_MOBILE_BREAKPOINT = 768;

export interface PlatformLayoutProps {
  /** Header bar (sticky) */
  header: ReactNode;
  /** Sidebar (desktop only when mobileBreakpoint applied) */
  sidebar: ReactNode;
  /** Main content area */
  children: ReactNode;
  /** Optional alerts shown below header (e.g. redirect, lost org) */
  topAlerts?: ReactNode;
  /** Bottom navigation for mobile (optional) */
  bottomNav?: ReactNode;
  /** Whether to show sidebar on mobile (default: false) */
  showSidebarOnMobile?: boolean;
  /** Breakpoint in px for mobile/desktop (default: 768) */
  mobileBreakpoint?: number;
  /** Main content max width (default: 1400px) */
  mainMaxWidth?: string;
  /** Extra main padding for mobile bottom nav (e.g. "64px" for fixed bottom nav) */
  mobileBottomNavOffset?: string;
  /** Optional right sidebar (e.g. TOC for docs) — desktop only */
  rightSidebar?: ReactNode;
}

/**
 * Layout shell for platform apps.
 * Apps provide their own Header and Sidebar; this provides the flex structure.
 */
export function PlatformLayout({
  header,
  sidebar,
  children,
  topAlerts,
  bottomNav,
  showSidebarOnMobile = false,
  mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
  mainMaxWidth = '1400px',
  mobileBottomNavOffset,
  rightSidebar,
}: PlatformLayoutProps): React.ReactElement {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < mobileBreakpoint : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileBreakpoint]);

  const showSidebar = showSidebarOnMobile || !isMobile;

  const mainClassName = [
    styles.main,
    isMobile && styles.mainMobile,
    isMobile && mobileBottomNavOffset && styles.mainWithBottomNav,
  ]
    .filter(Boolean)
    .join(' ');

  const mainStyle: React.CSSProperties & Record<string, string> = {};
  if (isMobile && mobileBottomNavOffset) {
    mainStyle['--bottom-nav-offset'] = mobileBottomNavOffset;
  }
  if (mainMaxWidth !== '1400px') {
    mainStyle['--main-max-width'] = mainMaxWidth;
  }

  return (
    <div className={styles.root}>
      {showSidebar && sidebar}

      <div className={styles.contentColumn}>
        {header}

        {topAlerts}

        <main
          id="main-content"
          className={mainClassName}
          style={Object.keys(mainStyle).length > 0 ? mainStyle : undefined}
          data-color="neutral"
        >
          <div className={styles.mainInner}>{children}</div>
        </main>
      </div>

      {!isMobile && rightSidebar && (
        <div className={styles.rightSidebar}>
          {rightSidebar}
        </div>
      )}

      {isMobile && bottomNav}
    </div>
  );
}
