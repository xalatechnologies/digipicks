
import { cn } from '../../../utils';
import { CloseIcon } from '../../../primitives/icons';
import styles from './FilterBar.module.css';

/**
 * FilterBar Component
 *
 * Container for filter components with clear all functionality.
 * Provides consistent filter layout and management.
 *
 * @example Basic usage
 * ```tsx
 * <FilterBar onClearAll={handleClearAll}>
 *   <FilterDropdown label="Status" options={statusOptions} />
 *   <DateRangeFilter label="Date Range" />
 *   <SearchFilter placeholder="Search..." />
 * </FilterBar>
 * ```
 *
 * @example With active filters count
 * ```tsx
 * <FilterBar
 *   activeFiltersCount={3}
 *   onClearAll={handleClearAll}
 *   showClearAll
 * >
 *   {children}
 * </FilterBar>
 * ```
 */

export interface FilterBarProps {
    /** Filter components */
    children: React.ReactNode;
    /** Number of active filters */
    activeFiltersCount?: number;
    /** Show clear all button */
    showClearAll?: boolean;
    /** Clear all handler */
    onClearAll?: () => void;
    /** Additional CSS class */
    className?: string;
}

export function FilterBar({
    children,
    activeFiltersCount = 0,
    showClearAll = true,
    onClearAll,
    className,
}: FilterBarProps): React.ReactElement {
    return (
        <div className={cn(styles.filterBar, className)}>
            <div className={styles.filters}>
                {children}
            </div>

            {showClearAll && activeFiltersCount > 0 && (
                <button
                    type="button"
                    className={styles.clearButton}
                    onClick={onClearAll}
                    aria-label={`Clear ${activeFiltersCount} filter${activeFiltersCount === 1 ? '' : 's'}`}
                >
                    <CloseIcon size={16} />
                    <span>Clear {activeFiltersCount > 1 ? `all (${activeFiltersCount})` : 'filter'}</span>
                </button>
            )}
        </div>
    );
}

FilterBar.displayName = 'FilterBar';
