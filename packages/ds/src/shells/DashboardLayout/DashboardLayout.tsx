
import styles from './DashboardLayout.module.css';
import { DashboardCard } from './DashboardCard';
import { DashboardGrid } from './DashboardGrid';

export interface DashboardLayoutProps {
    children: React.ReactNode;
    columns?: 1 | 2 | 3 | 4;
    gap?: 'sm' | 'md' | 'lg';
}

/**
 * DashboardLayout - Reusable grid layout for dashboards
 * 
 * Provides a responsive grid system for dashboard pages.
 * Uses only design tokens - no custom styling allowed.
 * 
 * @example
 * ```tsx
 * <DashboardLayout columns={3} gap="lg">
 *   <DashboardCard>
 *     <StatCard label="Revenue" value="$12,345" />
 *   </DashboardCard>
 *   <DashboardCard>
 *     <DashboardChart data={chartData} />
 *   </DashboardCard>
 * </DashboardLayout>
 * ```
 */
export function DashboardLayout({ children, columns = 3, gap = 'md' }: DashboardLayoutProps) {
    return (
        <div className={styles.layout} data-columns={columns} data-gap={gap}>
            {children}
        </div>
    );
}

// Subcomponents
DashboardLayout.Card = DashboardCard;
DashboardLayout.Grid = DashboardGrid;

// Re-export subcomponents
export { DashboardCard } from './DashboardCard';
export { DashboardGrid } from './DashboardGrid';

// Export types
export type { DashboardCardProps } from './DashboardCard';
export type { DashboardGridProps } from './DashboardGrid';
