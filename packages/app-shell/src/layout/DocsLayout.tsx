/**
 * DocsLayout
 *
 * Layout for docs/user-guides — almost identical to DashboardLayout but with
 * tree-type navigation. Uses AppDashboardLayout with TreeNavSidebar.
 */

import type { ReactNode } from 'react';
import { DashboardHeaderSlots } from '@digilist-saas/app-shell';
import type { DocsTreeNavItem } from '@digilist-saas/shared';
import type { BottomNavigationItem } from '@digilist-saas/ds';
import { AppDashboardLayout, BrandedLogo, TreeNavSidebar } from '@digilist-saas/ds';

export interface DocsLayoutProps {
  /** Tree navigation items (guides → sections → articles) */
  treeItems: DocsTreeNavItem[];
  /** Optional custom header. Defaults to DashboardHeaderSlots variant="docs". */
  header?: ReactNode;
  /** Optional right sidebar (e.g. article TOC). */
  rightSidebar?: ReactNode;
  /** Optional bottom nav items for mobile (default: none). */
  bottomNavItems?: BottomNavigationItem[];
}

const docsLogo = <BrandedLogo title="XALA" subtitle="User Guides" />;

export function DocsLayout({
  treeItems,
  header,
  rightSidebar,
  bottomNavItems = [],
}: DocsLayoutProps): React.ReactElement {
  const resolvedHeader = header ?? <DashboardHeaderSlots variant="docs" />;

  return (
    <AppDashboardLayout
      header={resolvedHeader}
      sidebar={
        <TreeNavSidebar
          logo={docsLogo}
          items={treeItems}
          id="docs-sidebar"
          data-testid="docs-sidebar"
        />
      }
      bottomNavItems={bottomNavItems}
      rightSidebar={rightSidebar}
      showSidebarOnMobile={true}
    />
  );
}
