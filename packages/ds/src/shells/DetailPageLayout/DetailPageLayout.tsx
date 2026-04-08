
import styles from './DetailPageLayout.module.css';
import { DetailPageHeader } from './DetailPageHeader';
import { DetailPageContent } from './DetailPageContent';
import { DetailPageSidebar } from './DetailPageSidebar';
import { DetailPageTabs } from './DetailPageTabs';

export interface DetailPageLayoutProps {
    children: React.ReactNode;
    maxWidth?: 'narrow' | 'default' | 'wide';
}

/**
 * DetailPageLayout - Reusable layout for detail pages
 * 
 * Provides a consistent layout structure for detail pages with header, content, sidebar, and tabs.
 * Uses only design tokens - no custom styling allowed.
 * 
 * @example
 * ```tsx
 * <DetailPageLayout>
 *   <DetailPageLayout.Header
 *     title="Listing Name"
 *     breadcrumbs={breadcrumbs}
 *     actions={<Button>Edit</Button>}
 *   />
 *   <DetailPageLayout.Content>
 *     <DetailPageLayout.Tabs tabs={tabs} />
 *     <div>Main content</div>
 *   </DetailPageLayout.Content>
 *   <DetailPageLayout.Sidebar>
 *     <BookingWidget />
 *   </DetailPageLayout.Sidebar>
 * </DetailPageLayout>
 * ```
 */
export function DetailPageLayout({ children, maxWidth = 'default' }: DetailPageLayoutProps) {
    return (
        <div className={styles.layout} data-max-width={maxWidth}>
            {children}
        </div>
    );
}

// Subcomponents
DetailPageLayout.Header = DetailPageHeader;
DetailPageLayout.Content = DetailPageContent;
DetailPageLayout.Sidebar = DetailPageSidebar;
DetailPageLayout.Tabs = DetailPageTabs;

// Re-export subcomponents
export { DetailPageHeader } from './DetailPageHeader';
export { DetailPageContent } from './DetailPageContent';
export { DetailPageSidebar } from './DetailPageSidebar';
export { DetailPageTabs } from './DetailPageTabs';

// Export types
export type { DetailPageHeaderProps } from './DetailPageHeader';
export type { DetailPageContentProps } from './DetailPageContent';
export type { DetailPageSidebarProps } from './DetailPageSidebar';
export type { DetailPageTabsProps } from './DetailPageTabs';
