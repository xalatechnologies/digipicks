
import styles from './DetailPageHeader.module.css';

export interface Breadcrumb {
    label: string;
    href?: string;
}

export interface DetailPageHeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: Breadcrumb[];
    actions?: React.ReactNode;
    badge?: React.ReactNode;
}

export function DetailPageHeader({
    title,
    subtitle,
    breadcrumbs,
    actions,
    badge
}: DetailPageHeaderProps) {
    return (
        <header className={styles.header}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className={styles.breadcrumbs}>
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                            {crumb.href ? (
                                <a href={crumb.href} className={styles.breadcrumbLink}>
                                    {crumb.label}
                                </a>
                            ) : (
                                <span className={styles.breadcrumbCurrent}>{crumb.label}</span>
                            )}
                            {index < breadcrumbs.length - 1 && (
                                <span className={styles.breadcrumbSeparator}>/</span>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            )}

            <div className={styles.titleRow}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.title}>{title}</h1>
                    {badge && <div className={styles.badge}>{badge}</div>}
                </div>
                {actions && <div className={styles.actions}>{actions}</div>}
            </div>

            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>
    );
}
