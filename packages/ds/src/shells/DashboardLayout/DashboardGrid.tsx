
import styles from './DashboardGrid.module.css';

export interface DashboardGridProps {
    children: React.ReactNode;
    columns?: 1 | 2 | 3 | 4;
    rows?: 'auto' | number;
}

export function DashboardGrid({ children, columns = 2, rows = 'auto' }: DashboardGridProps) {
    return (
        <div
            className={styles.grid}
            data-columns={columns}
            style={rows !== 'auto' ? { gridTemplateRows: `repeat(${rows}, 1fr)` } : undefined}
        >
            {children}
        </div>
    );
}
