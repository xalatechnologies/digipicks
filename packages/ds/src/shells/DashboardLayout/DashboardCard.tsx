
import styles from './DashboardCard.module.css';

export interface DashboardCardProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    variant?: 'default' | 'elevated' | 'outlined';
}

export function DashboardCard({
    children,
    title,
    subtitle,
    actions,
    variant = 'default'
}: DashboardCardProps) {
    return (
        <div className={styles.card} data-variant={variant}>
            {(title || subtitle || actions) && (
                <div className={styles.header}>
                    <div className={styles.headerText}>
                        {title && <h3 className={styles.title}>{title}</h3>}
                        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                    </div>
                    {actions && <div className={styles.actions}>{actions}</div>}
                </div>
            )}
            <div className={styles.content}>
                {children}
            </div>
        </div>
    );
}
