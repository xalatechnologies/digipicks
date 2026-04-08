/**
 * DashboardPageHeader
 *
 * Page-level header for dashboard routes: title, subtitle, breadcrumb, back link, actions.
 * Supports optional sticky positioning, result count badge, active filter tags, and
 * a second row for toolbar/tab content via children.
 *
 * All new props are optional — existing usage is fully backward-compatible.
 */

import { Link } from 'react-router-dom';
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import { ChevronLeftIcon } from '../../../primitives';
import { cn } from '../../../utils';
import styles from './DashboardPageHeader.module.css';

/** Removable filter chip descriptor */
export interface ActiveFilter {
  /** Unique key used to identify the filter when removing */
  key: string;
  /** Display label shown in the chip */
  label: string;
}

export interface DashboardPageHeaderProps {
  /** Page title. When omitted, only actions/toolbar/children render (title lives in header via useSetPageTitle). */
  title?: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Action buttons or controls (right side) */
  actions?: React.ReactNode;
  /** Breadcrumb navigation (above title) */
  breadcrumb?: React.ReactNode;
  /** Back link href — renders back button when set */
  backHref?: string;
  /** Aria-label for back button (required when backHref is set for a11y) */
  backLabel?: string;
  /** Heading level for title */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Title text size — maps to Designsystemet data-size @default "lg" */
  titleSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Show border bottom */
  bordered?: boolean;
  /** Additional class name */
  className?: string;
  /** Result count badge rendered next to the title */
  count?: number;
  /** Active filter chips displayed on the right side of the title row */
  activeFilters?: ActiveFilter[];
  /** Callback when a filter chip's remove button is clicked */
  onRemoveFilter?: (key: string) => void;
  /** Callback for "Fjern alle" (clear all) button — shown when 2+ filters are active */
  onClearAllFilters?: () => void;
  /** Enable sticky positioning (position: sticky; top: 0) */
  sticky?: boolean;
  /** Second row content (toolbar, tabs, etc.) rendered below the title row */
  children?: React.ReactNode;
}

export function DashboardPageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
  backHref,
  backLabel = 'Back',
  level = 1,
  titleSize = 'lg',
  bordered = false,
  className,
  count,
  activeFilters,
  onRemoveFilter,
  onClearAllFilters,
  sticky = false,
  children,
}: DashboardPageHeaderProps): React.ReactElement | null {
  const hasFilters = activeFilters && activeFilters.length > 0;
  const hasTitle = !!title;
  const hasLeftContent = hasTitle || !!subtitle || !!backHref;
  const hasMainRow = hasLeftContent || !!actions || hasFilters;
  const hasContent = hasMainRow || !!children;

  if (!hasContent) return null;

  return (
    <header
      className={cn(styles.root, bordered && styles.bordered, className)}
      data-bordered={bordered}
      data-sticky={sticky || undefined}
    >
      {hasMainRow && (
        <div className={styles.main}>
          {hasLeftContent && (
            <div className={styles.left}>
              {backHref && (
                <Link to={backHref} className={styles.backLink} aria-label={backLabel}>
                  <ChevronLeftIcon size={20} aria-hidden />
                </Link>
              )}
              <div className={styles.titleBlock}>
                {hasTitle && breadcrumb && <div className={styles.breadcrumb}>{breadcrumb}</div>}
                {hasTitle && (
                  <Heading level={level} data-size={titleSize} className={styles.title}>
                    {title}
                    {count != null && <span className={styles.count}>({count})</span>}
                  </Heading>
                )}
                {subtitle && (
                  <Paragraph data-size="sm" className={styles.subtitle}>
                    {subtitle}
                  </Paragraph>
                )}
              </div>
            </div>
          )}
          {(actions || hasFilters) && (
            <div className={styles.actions}>
              {hasFilters && (
                <div className={styles.filterTags} role="list" aria-label="Aktive filtre">
                  {activeFilters.map((filter) => (
                    <span key={filter.key} className={styles.filterChip} role="listitem">
                      <span>{filter.label}</span>
                      {onRemoveFilter && (
                        <button
                          type="button"
                          onClick={() => onRemoveFilter(filter.key)}
                          className={styles.filterChipRemove}
                          aria-label={`Fjern filter: ${filter.label}`}
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))}
                  {activeFilters.length >= 2 && onClearAllFilters && (
                    <button
                      type="button"
                      onClick={onClearAllFilters}
                      className={styles.clearAllBtn}
                    >
                      Fjern alle
                    </button>
                  )}
                </div>
              )}
              {actions}
            </div>
          )}
        </div>
      )}
      {children && <div className={styles.toolbar}>{children}</div>}
    </header>
  );
}

DashboardPageHeader.displayName = 'DashboardPageHeader';
