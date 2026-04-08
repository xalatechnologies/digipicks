/**
 * LayoutSidebar
 *
 * Sidebar for layout shells (PlatformLayout, AppDashboardLayout).
 * Accepts logo and sections as props. Used by dashboard apps via configurable branding.
 */

import { Sidebar as DsSidebar } from '../../blocks/navigation/Sidebar';
import type { SidebarNavSection } from '../../blocks/navigation/Sidebar';
import type { ReactNode } from 'react';

export interface LayoutSidebarProps {
  /** Logo area (e.g. branded logo + subtitle) */
  logo: ReactNode;
  /** Navigation sections */
  sections: SidebarNavSection[];
  /** Sidebar width in px (default: 360) */
  width?: number;
  /** Breakpoint for mobile sidebar behavior (default: 768) */
  mobileBreakpoint?: number;
  id?: string;
  dataTestId?: string;
}

export function LayoutSidebar({
  logo,
  sections,
  width = 360,
  mobileBreakpoint = 768,
  id,
  dataTestId,
}: LayoutSidebarProps): React.ReactElement {
  return (
    <DsSidebar
      logo={logo}
      sections={sections}
      width={width}
      mobileBreakpoint={mobileBreakpoint}
      id={id ?? 'layout-sidebar'}
      data-testid={dataTestId ?? 'layout-sidebar'}
    />
  );
}
