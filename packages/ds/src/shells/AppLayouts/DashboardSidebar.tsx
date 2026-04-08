/**
 * DashboardSidebar
 *
 * Sidebar for dashboard apps with configurable logo branding.
 * Uses LayoutSidebar with a branded logo block (title + subtitle) or custom logo.
 */

import type { ReactNode } from 'react';
import { LayoutSidebar } from './LayoutSidebar';
import type { SidebarNavSection } from '../../blocks/navigation/Sidebar';
import styles from './DashboardSidebar.module.css';

export interface BrandedLogoProps {
  title: string;
  subtitle: string;
  logoSrc?: string;
}

/** Reusable branded logo block for sidebars (e.g. TreeNavSidebar, DashboardSidebar) */
export function BrandedLogo({ title, subtitle, logoSrc = '/logo.svg' }: BrandedLogoProps): React.ReactElement {
  return (
    <div className={styles.logoInner}>
      <img src={logoSrc} alt="" className={styles.logoImg} aria-hidden />
      <div>
        <div className={styles.logoTitle}>{title}</div>
        <div className={styles.logoSubtitle}>{subtitle}</div>
      </div>
    </div>
  );
}

export interface DashboardSidebarProps {
  /** Logo title (e.g. product name) */
  logoTitle: string;
  /** Logo subtitle (e.g. app variant: "Min Side", "Backoffice") */
  logoSubtitle: string;
  /** Logo image src (default: "/logo.svg") */
  logoSrc?: string;
  /** Custom logo — overrides logoTitle/logoSubtitle/logoSrc when provided */
  logo?: ReactNode;
  /** Navigation sections */
  sections: SidebarNavSection[];
  /** Sidebar width in px (default: 360) */
  width?: number;
  /** Breakpoint for mobile (default: 768) */
  mobileBreakpoint?: number;
  id?: string;
  dataTestId?: string;
}

export function DashboardSidebar({
  logoTitle,
  logoSubtitle,
  logoSrc = '/logo.svg',
  logo: customLogo,
  sections,
  width = 360,
  mobileBreakpoint = 768,
  id,
  dataTestId,
}: DashboardSidebarProps): React.ReactElement {
  const logo = customLogo ?? <BrandedLogo title={logoTitle} subtitle={logoSubtitle} logoSrc={logoSrc} />;

  return (
    <LayoutSidebar
      logo={logo}
      sections={sections}
      width={width}
      mobileBreakpoint={mobileBreakpoint}
      id={id}
      dataTestId={dataTestId}
    />
  );
}
