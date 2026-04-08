/**
 * TableToolbar
 *
 * Reusable toolbar for table pages: search, filter button, optional result count and children.
 * Uses HeaderSearch + Button (FilterIcon) with optional badge for active filters.
 */

import * as React from 'react';
import { Button } from '@digdir/designsystemet-react';
import { HeaderSearch } from '../../../composed';
import { FilterIcon } from '../../../primitives';
import { Paragraph } from '@digdir/designsystemet-react';
import { cn } from '../../../utils';
import styles from './TableToolbar.module.css';

export interface TableToolbarProps {
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Controlled search value */
  searchValue: string;
  /** Search input change handler */
  onSearchChange: (value: string) => void;
  /** Search submit handler (e.g. on Enter) */
  onSearch?: (value: string) => void;
  /** Filter button label */
  filterButtonLabel?: string;
  /** Filter button click handler */
  onFilterClick?: () => void;
  /** Number of active filters (shows badge when > 0) */
  activeFilterCount?: number;
  /** Result count text or number */
  resultCount?: string | number;
  /** Extra content (e.g. PillDropdowns) */
  children?: React.ReactNode;
  /** Additional class name */
  className?: string;
}

export function TableToolbar({
  searchPlaceholder = 'Søk',
  searchValue,
  onSearchChange,
  onSearch,
  filterButtonLabel = 'Filtrer',
  onFilterClick,
  activeFilterCount = 0,
  resultCount,
  children,
  className,
}: TableToolbarProps): React.ReactElement {
  return (
    <div className={cn(styles.root, className)}>
      <div className={styles.search}>
        <HeaderSearch
          placeholder={searchPlaceholder}
          value={searchValue}
          onSearchChange={onSearchChange}
          onSearch={onSearch}
        />
      </div>
      {onFilterClick && (
        <Button
          type="button"
          variant="secondary"
          onClick={onFilterClick}
          className={styles.filterButton}
        >
          <FilterIcon />
          {filterButtonLabel}
          {activeFilterCount > 0 && <span className={styles.filterBadge} aria-hidden />}
        </Button>
      )}
      {resultCount !== undefined && (
        <Paragraph data-size="sm" className={styles.resultCount}>
          {resultCount}
        </Paragraph>
      )}
      {children && <div className={styles.extra}>{children}</div>}
    </div>
  );
}

TableToolbar.displayName = 'TableToolbar';
