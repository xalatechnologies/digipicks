/**
 * Breadcrumb
 *
 * Navigation breadcrumb component for showing page hierarchy.
 * Example: Hjem > Fasiliteter > Møterom 101
 */
import * as React from 'react';
import { Link } from '@digdir/designsystemet-react';
import { cn } from '../utils';
import type { BreadcrumbItem } from '../types/listing-detail';
import styles from './Breadcrumb.module.css';

export interface BreadcrumbProps {
  /** List of breadcrumb items */
  items: BreadcrumbItem[];
  /** Custom separator between items (defaults to ">") */
  separator?: React.ReactNode;
  /** Custom class name */
  className?: string;
}

/**
 * Breadcrumb navigation component
 *
 * @example
 * ```tsx
 * <Breadcrumb
 *   items={[
 *     { label: 'Hjem', href: '/' },
 *     { label: 'Fasiliteter', href: '/fasiliteter' },
 *     { label: 'Møterom 101' }
 *   ]}
 * />
 * ```
 */
export function Breadcrumb({
  items,
  separator = '›',
  className,
}: BreadcrumbProps): React.ReactElement {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(styles.nav, className)}
    >
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isClickable = !isLast && (item.href || item.onClick);

          return (
            <li key={item.label} className={styles.item}>
              {isClickable ? (
                item.href ? (
                  <Link href={item.href} className={styles.link}>
                    {item.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className={styles.button}
                  >
                    {item.label}
                  </button>
                )
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? styles.current : styles.inactive}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden="true" className={styles.separator}>
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
