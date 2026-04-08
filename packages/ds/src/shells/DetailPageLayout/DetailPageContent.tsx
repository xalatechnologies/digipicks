
import styles from './DetailPageContent.module.css';

export interface DetailPageContentProps {
    children: React.ReactNode;
}

export function DetailPageContent({ children }: DetailPageContentProps) {
    return (
        <div className={styles.content}>
            {children}
        </div>
    );
}
