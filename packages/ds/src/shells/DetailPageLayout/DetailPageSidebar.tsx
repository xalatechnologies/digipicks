
import styles from './DetailPageSidebar.module.css';

export interface DetailPageSidebarProps {
    children: React.ReactNode;
    sticky?: boolean;
}

export function DetailPageSidebar({ children, sticky = true }: DetailPageSidebarProps) {
    return (
        <aside className={styles.sidebar} data-sticky={sticky}>
            {children}
        </aside>
    );
}
